import { A2uiSurface } from "@a2ui/react";
import type { Prompt } from "../../shared/protocol.ts";
import type { Surface } from "../chat/use-conversation.ts";
import type { Problem, QueryStep, Turn } from "../chat/turns.ts";
import { formatNumber } from "../a2ui/format.ts";

type TurnViewProps = { turn: Turn; surface?: Surface; updating: boolean };

export function TurnView({ turn, surface, updating }: TurnViewProps) {
  return (
    <article className="turn">
      <PromptBubble prompt={turn.prompt} />
      <div className="answer">
        <Status turn={turn} />
        {turn.reasoning && <Reasoning text={turn.reasoning} running={turn.state === "running"} />}
        {turn.queries.length > 0 && <QuerySteps queries={turn.queries} />}
        {surface && (
          <div className="surface" data-updating={updating}>
            <A2uiSurface surface={surface} />
          </div>
        )}
        {turn.prompt.kind === "action" && turn.state === "done" && <p className="note">Updated the dashboard above.</p>}
        {turn.problems.length > 0 && <Problems problems={turn.problems} />}
        {turn.error && <p className="turn-error">{turn.error}</p>}
      </div>
    </article>
  );
}

function PromptBubble({ prompt }: { prompt: Prompt }) {
  if (prompt.kind === "question") return <p className="prompt">{prompt.text}</p>;
  return (
    <p className="prompt prompt-action">
      <span className="prompt-action-tag">Action</span>
      {prompt.action.userMessage ?? describeAction(prompt.action.name, prompt.action.context)}
    </p>
  );
}

function describeAction(name: string, context: Record<string, unknown>): string {
  const details = Object.entries(context).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`);
  return `${name.replaceAll("_", " ")}${details.length > 0 ? ` (${details.join("; ")})` : ""}`;
}

const PHASE_LABELS = {
  thinking: "Thinking",
  querying: "Querying",
  drawing: "Building the answer",
  repairing: "Fixing rejected components",
};

function Status({ turn }: { turn: Turn }) {
  if (turn.state === "running")
    return (
      <p className="status status-running" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        {PHASE_LABELS[turn.phase]}
        {turn.phaseDetail ? `: ${turn.phaseDetail}` : "…"}
      </p>
    );
  if (turn.state === "stopped") return <p className="status">Stopped.</p>;
  if (turn.state === "failed") return null;
  const seconds = ((turn.finishedAt ?? turn.startedAt) - turn.startedAt) / 1000;
  const usage = turn.usage;
  return (
    <p className="status">
      {turn.model} · {seconds.toFixed(1)}s
      {usage && (
        <>
          {" "}
          · {formatNumber(usage.inputTokens, "compact")} in ({formatNumber(usage.inputTokens > 0 ? usage.cachedInputTokens / usage.inputTokens : 0, "percent", "short")} cached) ·{" "}
          {formatNumber(usage.outputTokens, "compact")} out
        </>
      )}
    </p>
  );
}

function Reasoning({ text, running }: { text: string; running: boolean }) {
  return (
    <details className="reasoning">
      <summary>{running ? "Reasoning…" : "Reasoning"}</summary>
      <p>{text}</p>
    </details>
  );
}

function QuerySteps({ queries }: { queries: QueryStep[] }) {
  const failed = queries.filter((step) => !step.ok).length;
  return (
    <details className="queries">
      <summary>
        {queries.length} {queries.length === 1 ? "query" : "queries"}
        {failed > 0 && ` (${failed} failed)`} · show SQL
      </summary>
      <QueryList queries={queries} />
    </details>
  );
}

function QueryList({ queries }: { queries: QueryStep[] }) {
  return (
    <ul>
      {queries.map((step, index) => (
        <li key={index}>
          <details className={step.ok ? "query" : "query query-failed"}>
            <summary>
              <span className="query-mark" aria-hidden="true">
                {step.ok ? "✓" : "✕"}
              </span>
              <span className="query-purpose">{step.query.purpose || step.query.name}</span>
              <span className="query-meta">
                {step.ok
                  ? `${step.query.name} · ${step.query.rowCount}${step.query.truncated ? "+" : ""} rows · ${step.query.durationMs} ms`
                  : "failed"}
              </span>
            </summary>
            <pre className="sql">{step.query.sql}</pre>
            {!step.ok && <p className="query-error">{step.query.error}</p>}
          </details>
        </li>
      ))}
    </ul>
  );
}

function Problems({ problems }: { problems: Problem[] }) {
  return (
    <details className="problems">
      <summary>
        {problems.length} validation {problems.length === 1 ? "issue" : "issues"}
      </summary>
      <ul>
        {problems.map((problem, index) => (
          <li key={index}>
            <strong>{problem.source === "agent" ? "Rejected by the agent runtime" : "Reported by the renderer"}:</strong> {problem.message}
            {problem.entry && <pre>{problem.entry}</pre>}
          </li>
        ))}
      </ul>
    </details>
  );
}
