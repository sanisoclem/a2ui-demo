import { CATALOG_ID } from "../catalog/catalog.ts";
import type { ChatEvent, ChatRequest, LlmMessage, Prompt, ToolCall, Usage } from "../shared/protocol.ts";
import type { CompletionChunk, CompletionUsage, LlmClient, SystemMessage, ToolChoice } from "./deepseek.ts";
import { JsonObjectScanner } from "./json-scanner.ts";
import { promptMessage } from "./prompt.ts";
import { parseRunSqlArguments, RUN_SQL, RUN_SQL_TOOL, type RunSqlArguments } from "./tools.ts";
import { findLayoutProblems, readUiEntry, type Component, type ComponentChecker } from "./ui-entries.ts";
import type { QueryResult, Row, Warehouse } from "./warehouse.ts";

const MAX_QUERY_STEPS = 6;
const MAX_REPAIRS = 2;
const PREVIEW_ROWS = 30;

const ANSWER_NOW =
  "That is enough querying. Answer now with the A2UI JSON lines, binding to the datasets you already have. Do not call any tool.";

export type TurnDeps = {
  llm: LlmClient;
  warehouse: Warehouse;
  checker: ComponentChecker;
  systemPrompt: string;
  emit: (event: ChatEvent) => void;
  signal: AbortSignal;
};

type AssistantReply = { message: LlmMessage; toolCalls: ToolCall[] };

type QueryRows = Extract<QueryResult, { ok: true }>;

export async function runTurn(request: ChatRequest, deps: TurnDeps): Promise<void> {
  const surface = new SurfaceWriter(surfaceIdOf(request.prompt), deps);
  const isNewSurface = request.prompt.kind === "question";
  if (isNewSurface) surface.create();
  const conversation = new Conversation(deps.systemPrompt, request.history, promptMessage(request.prompt));
  await answer(conversation, surface, deps);
  await repairLayout(conversation, surface, deps, isNewSurface);
  deps.emit({ type: "done", transcript: conversation.added, usage: conversation.usage, model: deps.llm.model });
}

function surfaceIdOf(prompt: Prompt): string {
  return prompt.kind === "question" ? prompt.surfaceId : prompt.action.surfaceId;
}

async function answer(conversation: Conversation, surface: SurfaceWriter, deps: TurnDeps): Promise<void> {
  for (let step = 1; step <= MAX_QUERY_STEPS; step++) {
    const reply = await streamReply(conversation, surface, deps, "auto");
    conversation.add(reply.message);
    if (reply.toolCalls.length === 0) return;
    for (const call of reply.toolCalls) conversation.add(await runToolCall(call, surface, deps));
  }
  await instruct(conversation, surface, deps, ANSWER_NOW);
}

async function repairLayout(conversation: Conversation, surface: SurfaceWriter, deps: TurnDeps, isNewSurface: boolean): Promise<void> {
  for (let round = 1; round <= MAX_REPAIRS; round++) {
    const problems = surface.takeProblems(isNewSurface);
    if (problems.length === 0) return;
    deps.emit({ type: "phase", phase: "repairing" });
    await instruct(conversation, surface, deps, repairRequest(problems, surface.isBlank));
  }
}

async function instruct(conversation: Conversation, surface: SurfaceWriter, deps: TurnDeps, instruction: string): Promise<void> {
  conversation.add({ role: "user", content: instruction });
  conversation.add((await streamReply(conversation, surface, deps, "none")).message);
}

function repairRequest(problems: string[], isBlank: boolean): string {
  if (isBlank) return "You have not sent the dashboard yet. Send all of its JSON lines now, starting with the root, and nothing else.";
  return [
    "The dashboard you sent has problems:",
    ...problems.map((problem) => `- ${problem}`),
    "Send the JSON lines that fix them: corrected components with the same ids, and every missing component. Do not resend components that were fine.",
  ].join("\n");
}

async function streamReply(conversation: Conversation, surface: SurfaceWriter, deps: TurnDeps, toolChoice: ToolChoice): Promise<AssistantReply> {
  deps.emit({ type: "phase", phase: "thinking" });
  const reply = new ReplyBuilder();
  const scanner = new JsonObjectScanner();
  const chunks = deps.llm.complete({ messages: conversation.messages, tools: [RUN_SQL_TOOL], toolChoice, signal: deps.signal });
  for await (const chunk of chunks) {
    reply.add(chunk);
    if (chunk.type === "reasoning") deps.emit({ type: "reasoning", text: chunk.text });
    if (chunk.type === "content") for (const entry of scanner.push(chunk.text)) surface.write(entry);
    if (chunk.type === "usage") conversation.count(chunk.usage);
  }
  return reply.build();
}

async function runToolCall(call: ToolCall, surface: SurfaceWriter, deps: TurnDeps): Promise<LlmMessage> {
  if (call.function.name !== RUN_SQL) return toolResult(call, { error: `Unknown tool "${call.function.name}". Use ${RUN_SQL}.` });
  const parsed = parseRunSqlArguments(call.function.arguments);
  if (!parsed.ok) return toolResult(call, { error: parsed.problem });
  return toolResult(call, await runQuery(parsed.value, surface, deps));
}

async function runQuery({ name, purpose, sql }: RunSqlArguments, surface: SurfaceWriter, deps: TurnDeps): Promise<object> {
  deps.emit({ type: "phase", phase: "querying", detail: purpose });
  const result = await deps.warehouse.query(sql);
  if (!result.ok) {
    deps.emit({ type: "query_failed", query: { name, purpose, sql, error: result.problem } });
    return { error: result.problem };
  }
  surface.putDataset(name, result.rows);
  deps.emit({
    type: "query",
    query: { name, purpose, sql, rowCount: result.rows.length, columns: result.columns, truncated: result.truncated, durationMs: result.durationMs },
  });
  return preview(name, result);
}

function preview(name: string, result: QueryRows): object {
  const shown = result.rows.slice(0, PREVIEW_ROWS);
  return {
    dataset: `/datasets/${name}`,
    rowCount: result.rows.length,
    truncated: result.truncated,
    columns: result.columns,
    rows: shown,
    ...(shown.length < result.rows.length ? { note: `Showing the first ${shown.length} of ${result.rows.length} rows.` } : {}),
  };
}

function toolResult(call: ToolCall, content: object): LlmMessage {
  return { role: "tool", tool_call_id: call.id, content: JSON.stringify(content) };
}

class Conversation {
  readonly added: LlmMessage[] = [];
  readonly usage: Usage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0 };
  private readonly system: string;
  private readonly history: LlmMessage[];

  constructor(system: string, history: LlmMessage[], userMessage: string) {
    this.system = system;
    this.history = history;
    this.add({ role: "user", content: userMessage });
  }

  get messages(): (SystemMessage | LlmMessage)[] {
    return [{ role: "system", content: this.system }, ...this.history, ...this.added];
  }

  add(message: LlmMessage): void {
    this.added.push(message);
  }

  count(usage: CompletionUsage): void {
    this.usage.inputTokens += usage.prompt_tokens;
    this.usage.cachedInputTokens += usage.prompt_cache_hit_tokens ?? 0;
    this.usage.outputTokens += usage.completion_tokens;
    this.usage.reasoningTokens += usage.completion_tokens_details?.reasoning_tokens ?? 0;
  }
}

class ReplyBuilder {
  private reasoning = "";
  private content = "";
  private readonly calls: { id: string; name: string; arguments: string }[] = [];

  add(chunk: CompletionChunk): void {
    if (chunk.type === "reasoning") this.reasoning += chunk.text;
    if (chunk.type === "content") this.content += chunk.text;
    if (chunk.type === "tool_call") this.addToolCallPart(chunk);
  }

  private addToolCallPart(part: Extract<CompletionChunk, { type: "tool_call" }>): void {
    const call = (this.calls[part.index] ??= { id: "", name: "", arguments: "" });
    if (part.id) call.id = part.id;
    if (part.name) call.name = part.name;
    if (part.arguments) call.arguments += part.arguments;
  }

  build(): AssistantReply {
    const toolCalls: ToolCall[] = this.calls
      .filter((call) => call !== undefined)
      .map((call) => ({ id: call.id, type: "function", function: { name: call.name, arguments: call.arguments } }));
    return {
      message: {
        role: "assistant",
        content: this.content,
        ...(this.reasoning ? { reasoning_content: this.reasoning } : {}),
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      },
      toolCalls,
    };
  }
}

class SurfaceWriter {
  private readonly components = new Map<string, Component>();
  private readonly datasets = new Set<string>();
  private readonly rejections: string[] = [];
  private drawing = false;
  private readonly surfaceId: string;
  private readonly deps: Pick<TurnDeps, "checker" | "emit">;

  constructor(surfaceId: string, deps: Pick<TurnDeps, "checker" | "emit">) {
    this.surfaceId = surfaceId;
    this.deps = deps;
  }

  create(): void {
    this.send({ createSurface: { surfaceId: this.surfaceId, catalogId: CATALOG_ID } });
  }

  putDataset(name: string, rows: Row[]): void {
    this.datasets.add(name);
    this.send({ updateDataModel: { surfaceId: this.surfaceId, path: `/datasets/${name}`, value: rows } });
  }

  write(text: string): void {
    this.startDrawing();
    const entry = readUiEntry(text, this.deps.checker);
    switch (entry.kind) {
      case "component":
        this.components.set(entry.component.id, entry.component);
        this.send({ updateComponents: { surfaceId: this.surfaceId, components: [entry.component] } });
        return;
      case "data":
        this.send({ updateDataModel: { surfaceId: this.surfaceId, path: entry.path, value: entry.value } });
        return;
      case "rejected":
        this.rejections.push(entry.problem);
        this.deps.emit({ type: "rejected_entry", entry: text, problem: entry.problem });
        return;
    }
  }

  get isBlank(): boolean {
    return this.components.size === 0;
  }

  takeProblems(isNewSurface: boolean): string[] {
    const rejections = this.rejections.splice(0);
    return [...rejections, ...(isNewSurface ? findLayoutProblems(this.components, this.datasets) : [])];
  }

  private startDrawing(): void {
    if (this.drawing) return;
    this.drawing = true;
    this.deps.emit({ type: "phase", phase: "drawing" });
  }

  private send(body: Record<string, unknown>): void {
    this.deps.emit({ type: "a2ui", message: { version: "1.0", ...body } });
  }
}
