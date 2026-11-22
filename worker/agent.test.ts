import { describe, expect, it } from "vitest";
import catalogDocument from "../catalog/catalog.json";
import type { ChatEvent, LlmMessage } from "../shared/protocol.ts";
import { runTurn } from "./agent.ts";
import type { CompletionChunk, CompletionRequest, LlmClient } from "./deepseek.ts";
import { componentChecker } from "./ui-entries.ts";
import type { Warehouse } from "./warehouse.ts";

const checker = componentChecker(catalogDocument);

const warehouse: Warehouse = {
  async query() {
    return { ok: true, columns: ["channel", "revenue"], rows: [{ channel: "Web", revenue: 1200 }], truncated: false, durationMs: 3 };
  },
};

function scriptedModel(...replies: CompletionChunk[][]): LlmClient & { requests: CompletionRequest[] } {
  const requests: CompletionRequest[] = [];
  return {
    model: "scripted",
    requests,
    async *complete(request) {
      requests.push({ ...request, messages: [...request.messages] });
      yield* replies[requests.length - 1] ?? [];
    },
  };
}

async function ask(llm: LlmClient, text: string): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  await runTurn(
    { history: [], prompt: { kind: "question", surfaceId: "answer-1", text } },
    { llm, warehouse, checker, systemPrompt: "system", emit: (event) => events.push(event), signal: new AbortController().signal },
  );
  return events;
}

const a2uiKinds = (events: ChatEvent[]) =>
  events.flatMap((event) => (event.type === "a2ui" ? [Object.keys(event.message).find((key) => key !== "version")] : []));

const transcriptOf = (events: ChatEvent[]): LlmMessage[] => {
  const done = events.at(-1);
  return done?.type === "done" ? done.transcript : [];
};

const sqlCall: CompletionChunk[] = [
  { type: "tool_call", index: 0, id: "call_1", name: "run_sql", arguments: '{"name":"by_channel","purpose":"Revenue by channel",' },
  { type: "tool_call", index: 0, arguments: '"sql":"SELECT channel, SUM(net_revenue) AS revenue FROM order_lines GROUP BY 1"}' },
];

describe("runTurn", () => {
  it("creates a surface, loads the query result into it, then streams each component as it completes", async () => {
    const llm = scriptedModel(sqlCall, [
      { type: "content", text: '{"id":"root","component":"Column","children":["chart"]}\n{"id":"chart","component":"BarChart",' },
      { type: "content", text: '"data":{"@path":"/datasets/by_channel"},"x":"channel","series":[{"field":"revenue"}]}' },
    ]);
    const events = await ask(llm, "Revenue by channel?");
    expect(a2uiKinds(events)).toEqual(["createSurface", "updateDataModel", "updateComponents", "updateComponents"]);
    expect(transcriptOf(events).map((message) => message.role)).toEqual(["user", "assistant", "tool", "assistant"]);
  });

  it("asks the model once to repair a dashboard that references components it never sent", async () => {
    const llm = scriptedModel(sqlCall, [{ type: "content", text: '{"id":"root","component":"Column","children":["headline"]}' }], [
      { type: "content", text: '{"id":"headline","component":"Text","text":"## Revenue"}' },
    ]);
    const events = await ask(llm, "Revenue?");
    const repairRequest = llm.requests[2]?.messages.at(-1);
    expect(repairRequest).toMatchObject({ role: "user", content: expect.stringContaining('refers to child "headline"') });
    expect(llm.requests[2]?.toolChoice).toBe("none");
    expect(a2uiKinds(events).at(-1)).toBe("updateComponents");
    expect(events.at(-1)?.type).toBe("done");
  });

  it("stops the model querying after six rounds and asks it to answer without tools", async () => {
    const llm = scriptedModel(...Array.from({ length: 6 }, () => sqlCall), [
      { type: "content", text: '{"id":"root","component":"Column","children":[]}' },
    ]);
    const events = await ask(llm, "Revenue by channel?");
    expect(llm.requests[6]).toMatchObject({ toolChoice: "none" });
    expect(llm.requests[6]?.messages.at(-1)).toMatchObject({ role: "user", content: expect.stringContaining("enough querying") });
    expect(events.at(-1)?.type).toBe("done");
  });

  it("asks for the whole dashboard when the reply had no components, then for the children still missing", async () => {
    const toolMarkup: CompletionChunk = { type: "content", text: '<｜｜DSML｜｜tool_calls><｜｜DSML｜｜invoke name="run_sql">' };
    const llm = scriptedModel(sqlCall, [toolMarkup], [{ type: "content", text: '{"id":"root","component":"Column","children":["title"]}' }], [
      { type: "content", text: '{"id":"title","component":"Text","text":"## Revenue"}' },
    ]);
    await ask(llm, "Revenue?");
    expect(llm.requests[2]?.messages.at(-1)).toMatchObject({ content: expect.stringContaining("You have not sent the dashboard yet") });
    expect(llm.requests[3]?.messages.at(-1)).toMatchObject({ content: expect.stringContaining('refers to child "title"') });
  });

  it("passes the model's reasoning back with its tool calls, as thinking mode requires", async () => {
    const llm = scriptedModel([{ type: "reasoning", text: "Group by channel." }, ...sqlCall], [
      { type: "content", text: '{"id":"root","component":"Column","children":[]}' },
    ]);
    await ask(llm, "Revenue by channel?");
    expect(llm.requests[1]?.messages.at(-2)).toMatchObject({ role: "assistant", reasoning_content: "Group by channel." });
  });
});
