import { COMPANY, SAMPLE_QUESTIONS } from "../../shared/warehouse.ts";

export function Welcome({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <section className="welcome">
      <h1>Ask {COMPANY.name}'s data anything</h1>
      <p>
        DeepSeek writes the SQL, runs it against a D1 warehouse, and answers in A2UI: JSON that this page renders as native charts, KPI
        cards, tables and filters. Open the inspector to watch the messages stream.
      </p>
      <ul className="welcome-samples">
        {SAMPLE_QUESTIONS.map((question) => (
          <li key={question}>
            <button type="button" onClick={() => onAsk(question)}>
              {question}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
