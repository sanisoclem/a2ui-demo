import type { LlmMessage } from "../shared/protocol.ts";

export type SystemMessage = { role: "system"; content: string };

export type ToolDefinition = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type ToolChoice = "auto" | "none";

export type CompletionUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  prompt_cache_hit_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
};

export type CompletionChunk =
  | { type: "reasoning"; text: string }
  | { type: "content"; text: string }
  | { type: "tool_call"; index: number; id?: string; name?: string; arguments?: string }
  | { type: "usage"; usage: CompletionUsage };

export type CompletionRequest = {
  messages: (SystemMessage | LlmMessage)[];
  tools: ToolDefinition[];
  toolChoice: ToolChoice;
  signal: AbortSignal;
};

export interface LlmClient {
  readonly model: string;
  complete(request: CompletionRequest): AsyncIterable<CompletionChunk>;
}

export type DeepSeekConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  thinking: "enabled" | "disabled";
  reasoningEffort: "low" | "high" | "max";
};

type StreamDelta = {
  content?: string | null;
  reasoning_content?: string | null;
  tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[];
};

type StreamPayload = { choices?: { delta?: StreamDelta }[]; usage?: CompletionUsage | null };

class DeepSeekError extends Error {}

export function deepSeekClient(config: DeepSeekConfig): LlmClient {
  return {
    model: config.model,
    async *complete({ messages, tools, toolChoice, signal }) {
      const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          messages,
          tools,
          tool_choice: toolChoice,
          thinking: { type: config.thinking },
          ...(config.thinking === "enabled" ? { reasoning_effort: config.reasoningEffort } : {}),
          max_tokens: 32_000,
          stream: true,
          stream_options: { include_usage: true },
        }),
        signal,
      });
      if (!response.ok || !response.body) throw new DeepSeekError(await describeFailure(response));
      for await (const payload of readEventStream(response.body)) yield* toChunks(payload);
    },
  };
}

async function describeFailure(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  return `DeepSeek returned ${response.status}${body ? `: ${body.slice(0, 500)}` : ""}`;
}

async function* readEventStream(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamPayload> {
  let buffer = "";
  for await (const text of body.pipeThrough(new TextDecoderStream())) {
    buffer += text;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const data = line.startsWith("data:") ? line.slice(5).trim() : "";
      if (data !== "" && data !== "[DONE]") yield JSON.parse(data) as StreamPayload;
    }
  }
}

function* toChunks(payload: StreamPayload): Generator<CompletionChunk> {
  const delta = payload.choices?.[0]?.delta;
  if (delta?.reasoning_content) yield { type: "reasoning", text: delta.reasoning_content };
  if (delta?.content) yield { type: "content", text: delta.content };
  for (const call of delta?.tool_calls ?? [])
    yield { type: "tool_call", index: call.index, id: call.id, name: call.function?.name, arguments: call.function?.arguments };
  if (payload.usage) yield { type: "usage", usage: payload.usage };
}
