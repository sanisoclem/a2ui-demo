import { renderMarkdown } from "@a2ui/markdown-it";
import { MarkdownContext } from "@a2ui/react";
import { useEffect, useRef, useState } from "react";
import { COMPANY } from "../shared/warehouse.ts";
import { isActiveSurface, type Turn } from "./chat/turns.ts";
import { useConversation, type Surface } from "./chat/use-conversation.ts";
import { Composer } from "./components/composer.tsx";
import { Inspector } from "./components/inspector.tsx";
import { Sidebar } from "./components/sidebar.tsx";
import { TurnView } from "./components/turn-view.tsx";
import { Welcome } from "./components/welcome.tsx";

export function App() {
  const conversation = useConversation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  return (
    <MarkdownContext.Provider value={renderMarkdown}>
      <div className="app" data-inspector={inspectorOpen}>
        <header className="topbar">
          <button type="button" className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Show data panel">
            ☰
          </button>
          <div className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <div>
              <strong>Lumen Analyst</strong>
              <span className="brand-subtitle">A2UI analytics demo · {COMPANY.name}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <button type="button" className="button" onClick={conversation.reset} disabled={conversation.turns.length === 0}>
              New chat
            </button>
            <button type="button" className="button" aria-pressed={inspectorOpen} onClick={() => setInspectorOpen(!inspectorOpen)}>
              Inspector
            </button>
          </div>
        </header>
        <Sidebar open={sidebarOpen} running={conversation.running} onAsk={conversation.ask} onClose={() => setSidebarOpen(false)} />
        <main className="main">
          {conversation.turns.length === 0 ? (
            <Welcome onAsk={conversation.ask} />
          ) : (
            <Thread turns={conversation.turns} surfaces={conversation.surfaces} />
          )}
          <Composer running={conversation.running} onAsk={conversation.ask} onStop={conversation.stop} />
        </main>
        {inspectorOpen && <Inspector log={conversation.log} onClose={() => setInspectorOpen(false)} />}
      </div>
    </MarkdownContext.Provider>
  );
}

function Thread({ turns, surfaces }: { turns: Turn[]; surfaces: ReadonlyMap<string, Surface> }) {
  const latest = useRef<HTMLDivElement>(null);
  useEffect(() => {
    latest.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [turns.length]);
  return (
    <div className="thread">
      {turns.map((turn, index) => (
        <div key={turn.id} ref={index === turns.length - 1 ? latest : undefined}>
          <TurnView
            turn={turn}
            surface={turn.prompt.kind === "question" ? surfaces.get(turn.surfaceId) : undefined}
            updating={turn.prompt.kind === "question" && turn.state !== "running" && isActiveSurface(turns, turn.surfaceId)}
          />
        </div>
      ))}
    </div>
  );
}
