import type { ChatEvent, FailedQuery, LlmMessage, Phase, Prompt, QueryRun, Usage } from "../../shared/protocol.ts";

export type TurnState = "running" | "done" | "failed" | "stopped";

export type QueryStep = { ok: true; query: QueryRun } | { ok: false; query: FailedQuery };

export type Problem = { source: "agent" | "renderer"; message: string; entry?: string };

export type Turn = {
  id: string;
  prompt: Prompt;
  surfaceId: string;
  state: TurnState;
  phase: Phase;
  phaseDetail?: string;
  reasoning: string;
  queries: QueryStep[];
  problems: Problem[];
  error?: string;
  usage?: Usage;
  model?: string;
  transcript: LlmMessage[];
  startedAt: number;
  finishedAt?: number;
};

const HISTORY_TURNS = 6;

export function newTurn(prompt: Prompt): Turn {
  return {
    id: crypto.randomUUID(),
    prompt,
    surfaceId: prompt.kind === "question" ? prompt.surfaceId : prompt.action.surfaceId,
    state: "running",
    phase: "thinking",
    reasoning: "",
    queries: [],
    problems: [],
    transcript: [],
    startedAt: Date.now(),
  };
}

export function applyEvent(turn: Turn, event: ChatEvent): Turn {
  switch (event.type) {
    case "phase":
      return { ...turn, phase: event.phase, phaseDetail: event.detail };
    case "reasoning":
      return { ...turn, reasoning: turn.reasoning + event.text };
    case "query":
      return { ...turn, queries: [...turn.queries, { ok: true, query: event.query }] };
    case "query_failed":
      return { ...turn, queries: [...turn.queries, { ok: false, query: event.query }] };
    case "rejected_entry":
      return { ...turn, problems: [...turn.problems, { source: "agent", message: event.problem, entry: event.entry }] };
    case "error":
      return { ...turn, state: "failed", error: event.message, finishedAt: Date.now() };
    case "done":
      return { ...turn, state: "done", transcript: event.transcript, usage: event.usage, model: event.model, finishedAt: Date.now() };
    case "a2ui":
      return turn;
  }
}

export function endTurn(turn: Turn, state: "failed" | "stopped", error?: string): Turn {
  return turn.state === "running" ? { ...turn, state, error, finishedAt: Date.now() } : turn;
}

export function historyOf(turns: Turn[]): LlmMessage[] {
  return turns
    .filter((turn) => turn.state === "done")
    .slice(-HISTORY_TURNS)
    .flatMap((turn) => turn.transcript);
}

export function isActiveSurface(turns: Turn[], surfaceId: string): boolean {
  return turns.some((turn) => turn.state === "running" && turn.surfaceId === surfaceId);
}
