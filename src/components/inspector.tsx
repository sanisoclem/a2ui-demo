import { useEffect, useMemo, useRef, useState } from "react";
import { analyticsCatalog } from "../a2ui/catalog.ts";
import type { LogEntry } from "../chat/use-conversation.ts";

type Tab = "messages" | "catalog";

const ARRAY_PREVIEW = 5;

export function Inspector({ log, onClose }: { log: LogEntry[]; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("messages");
  return (
    <aside className="inspector" aria-label="A2UI inspector">
      <header className="inspector-head">
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "messages"} onClick={() => setTab("messages")}>
            Messages <span className="count">{log.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === "catalog"} onClick={() => setTab("catalog")}>
            Catalog
          </button>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close inspector">
          ×
        </button>
      </header>
      {tab === "messages" ? <MessageLog log={log} /> : <CatalogView />}
    </aside>
  );
}

function MessageLog({ log }: { log: LogEntry[] }) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [log.length]);
  return (
    <div className="inspector-body" ref={list}>
      {log.length === 0 ? (
        <p className="inspector-empty">A2UI messages appear here as the agent streams them, and actions as you click the dashboards.</p>
      ) : (
        <ol className="log">
          {log.map((entry) => (
            <LogItem key={entry.id} entry={entry} />
          ))}
        </ol>
      )}
    </div>
  );
}

function LogItem({ entry }: { entry: LogEntry }) {
  const { kind, summary } = describeMessage(entry.message);
  return (
    <li>
      <details>
        <summary>
          <span className="direction" data-direction={entry.direction}>
            {entry.direction === "to-renderer" ? "agent → UI" : "UI → agent"}
          </span>
          <code>{kind}</code>
          <span className="log-summary">{summary}</span>
        </summary>
        <pre className="json">{JSON.stringify(abridge(entry.message), null, 2)}</pre>
      </details>
    </li>
  );
}

function CatalogView() {
  const document = useMemo(() => JSON.stringify(analyticsCatalog.toJson(), null, 2), []);
  return (
    <div className="inspector-body">
      <p className="inspector-empty">
        The component catalog this renderer supports. The agent's system prompt is generated from the same document, and every component it
        sends is validated against it.
      </p>
      <pre className="json">{document}</pre>
    </div>
  );
}

function describeMessage(message: unknown): { kind: string; summary: string } {
  const envelope = (message ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const kind = Object.keys(envelope).find((key) => key !== "version") ?? "message";
  const body = envelope[kind] ?? {};
  switch (kind) {
    case "updateComponents":
      return {
        kind,
        summary: ((body.components as { id: string; component: string }[] | undefined) ?? []).map((c) => `${c.component} #${c.id}`).join(", "),
      };
    case "updateDataModel":
      return { kind, summary: `${String(body.path)}${Array.isArray(body.value) ? ` · ${body.value.length} rows` : ""}` };
    case "action":
      return { kind, summary: `${String(body.name)} ${JSON.stringify(body.context ?? {})}` };
    default:
      return { kind, summary: String(body.surfaceId ?? "").slice(0, 8) };
  }
}

function abridge(value: unknown): unknown {
  if (Array.isArray(value)) {
    const shown = value.slice(0, ARRAY_PREVIEW).map(abridge);
    return value.length > ARRAY_PREVIEW ? [...shown, `… ${value.length - ARRAY_PREVIEW} more`] : shown;
  }
  if (typeof value === "object" && value !== null) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, abridge(item)]));
  return value;
}
