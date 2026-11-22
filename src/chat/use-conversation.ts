import type { ReactCatalogComponent } from "@a2ui/react";
import {
  MessageProcessor,
  type ActionPayload,
  type ProcessableMessagePayload,
  type RendererErrorMessage,
  type SurfaceModel,
} from "@a2ui/web_core/v1_0";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatEvent, Prompt } from "../../shared/protocol.ts";
import { analyticsCatalog } from "../a2ui/catalog.ts";
import { streamChat } from "./api.ts";
import { applyEvent, endTurn, historyOf, newTurn, type Turn } from "./turns.ts";

export type Direction = "to-renderer" | "to-agent";

export type LogEntry = { id: number; turnId: string; direction: Direction; message: unknown; at: number };

export type Surface = SurfaceModel<ReactCatalogComponent>;

export type Conversation = {
  turns: Turn[];
  log: LogEntry[];
  surfaces: ReadonlyMap<string, Surface>;
  running: boolean;
  ask: (text: string) => void;
  stop: () => void;
  reset: () => void;
};

export function useConversation(): Conversation {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [surfaces, setSurfaces] = useState<ReadonlyMap<string, Surface>>(new Map());
  const turnsRef = useRef<Turn[]>([]);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const logId = useRef(0);
  const startRef = useRef<(prompt: Prompt) => void>(() => undefined);

  const updateTurns = useCallback((change: (turns: Turn[]) => Turn[]) => {
    turnsRef.current = change(turnsRef.current);
    setTurns(turnsRef.current);
  }, []);

  const updateTurn = useCallback(
    (turnId: string, change: (turn: Turn) => Turn) => updateTurns((all) => all.map((turn) => (turn.id === turnId ? change(turn) : turn))),
    [updateTurns],
  );

  const record = useCallback((turnId: string, direction: Direction, message: unknown) => {
    const entry = { id: ++logId.current, turnId, direction, message, at: Date.now() };
    setLog((entries) => [...entries, entry]);
  }, []);

  const processor = useMemo(
    () =>
      new MessageProcessor<ReactCatalogComponent>(
        [analyticsCatalog],
        (action: ActionPayload) => startRef.current(actionPrompt(action)),
        {
          version: "1.0",
          reportErrorsOnly: true,
          errorHandler: (error: RendererErrorMessage) => {
            const owner = [...turnsRef.current].reverse().find((turn) => turn.surfaceId === error.error.surfaceId);
            if (owner) updateTurn(owner.id, (turn) => ({ ...turn, problems: [...turn.problems, { source: "renderer", message: error.error.message }] }));
          },
        },
      ),
    [updateTurn],
  );

  useEffect(() => {
    const sync = () => setSurfaces(new Map(processor.model.surfacesMap));
    const created = processor.onSurfaceCreated(sync);
    const deleted = processor.onSurfaceDeleted(sync);
    return () => {
      created.unsubscribe();
      deleted.unsubscribe();
    };
  }, [processor]);

  const receive = useCallback(
    (turnId: string, event: ChatEvent) => {
      if (event.type === "a2ui") {
        record(turnId, "to-renderer", event.message);
        processor.processMessages(event.message as ProcessableMessagePayload);
      }
      updateTurn(turnId, (turn) => applyEvent(turn, event));
    },
    [processor, record, updateTurn],
  );

  const start = useCallback(
    (prompt: Prompt) => {
      if (turnsRef.current.some((turn) => turn.state === "running")) return;
      const history = historyOf(turnsRef.current);
      const turn = newTurn(prompt);
      updateTurns((all) => [...all, turn]);
      if (prompt.kind === "action") record(turn.id, "to-agent", { version: "1.0", action: { ...prompt.action, timestamp: new Date().toISOString() } });
      const controller = new AbortController();
      abortRef.current = controller;
      streamChat({ history, prompt }, (event) => receive(turn.id, event), controller.signal)
        .then(() => updateTurn(turn.id, (current) => endTurn(current, "failed", "The connection closed before the answer finished.")))
        .catch((error: unknown) =>
          updateTurn(turn.id, (current) =>
            controller.signal.aborted ? endTurn(current, "stopped") : endTurn(current, "failed", error instanceof Error ? error.message : String(error)),
          ),
        );
    },
    [receive, record, updateTurn, updateTurns],
  );

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  const ask = useCallback((text: string) => start({ kind: "question", surfaceId: crypto.randomUUID(), text }), [start]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    for (const surfaceId of processor.model.surfacesMap.keys()) processor.processMessages({ version: "1.0", deleteSurface: { surfaceId } });
    updateTurns(() => []);
    setLog([]);
  }, [processor, updateTurns]);

  return { turns, log, surfaces, running: turns.some((turn) => turn.state === "running"), ask, stop, reset };
}

function actionPrompt(action: ActionPayload): Prompt {
  return {
    kind: "action",
    action: {
      name: action.name,
      surfaceId: action.surfaceId,
      sourceComponentId: action.sourceComponentId,
      context: action.context,
      ...(action.userMessage ? { userMessage: action.userMessage } : {}),
    },
  };
}
