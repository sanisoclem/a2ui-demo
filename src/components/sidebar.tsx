import { COMPANY, SAMPLE_QUESTIONS, WAREHOUSE_TABLES } from "../../shared/warehouse.ts";

type SidebarProps = { open: boolean; running: boolean; onAsk: (question: string) => void; onClose: () => void };

export function Sidebar({ open, running, onAsk, onClose }: SidebarProps) {
  return (
    <aside className="sidebar" data-open={open}>
      <div className="sidebar-head">
        <h2>{COMPANY.name}</h2>
        <button type="button" className="icon-button sidebar-close" onClick={onClose} aria-label="Close data panel">
          ×
        </button>
      </div>
      <p className="sidebar-about">
        Sales warehouse · {COMPANY.firstDay} to {COMPANY.lastDay}. All data is generated.
      </p>
      <section>
        <h3>Tables</h3>
        <ul className="tables">
          {WAREHOUSE_TABLES.map((table) => (
            <li key={table.name}>
              <details>
                <summary>
                  <code>{table.name}</code>
                  {table.kind === "view" && <span className="badge">view</span>}
                </summary>
                <p>{table.about}</p>
                <ul className="columns">
                  {table.columns.map((column) => (
                    <li key={column.name} title={column.note}>
                      <code>{column.name}</code>
                      <span>{column.type.toLowerCase()}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Try asking</h3>
        <ul className="samples">
          {SAMPLE_QUESTIONS.map((question) => (
            <li key={question}>
              <button
                type="button"
                disabled={running}
                onClick={() => {
                  onAsk(question);
                  onClose();
                }}
              >
                {question}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
