import { useState, type FormEvent, type KeyboardEvent } from "react";

type ComposerProps = { running: boolean; onAsk: (question: string) => void; onStop: () => void };

export function Composer({ running, onAsk, onStop }: ComposerProps) {
  const [draft, setDraft] = useState("");
  const send = () => {
    const question = draft.trim();
    if (!question || running) return;
    onAsk(question);
    setDraft("");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };
  const sendOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };
  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        value={draft}
        rows={1}
        placeholder="Ask about sales, products, marketing or traffic…"
        aria-label="Question"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={sendOnEnter}
      />
      {running ? (
        <button type="button" className="button" onClick={onStop}>
          Stop
        </button>
      ) : (
        <button type="submit" className="button button-primary" disabled={!draft.trim()}>
          Ask
        </button>
      )}
    </form>
  );
}
