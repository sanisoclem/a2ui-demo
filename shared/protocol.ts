import { z } from "zod";

const SurfaceIdSchema = z.string().regex(/^[a-z0-9-]{1,64}$/);

const ToolCallSchema = z.object({
  id: z.string().max(200),
  type: z.literal("function"),
  function: z.object({ name: z.string().max(100), arguments: z.string().max(20_000) }),
});

const LlmMessageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string().max(40_000) }),
  z.object({
    role: z.literal("assistant"),
    content: z.string().max(100_000).nullable(),
    reasoning_content: z.string().max(200_000).optional(),
    tool_calls: z.array(ToolCallSchema).max(10).optional(),
  }),
  z.object({ role: z.literal("tool"), tool_call_id: z.string().max(200), content: z.string().max(40_000) }),
]);

export type LlmMessage = z.infer<typeof LlmMessageSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;

const UserActionSchema = z.object({
  name: z.string().min(1).max(80),
  surfaceId: SurfaceIdSchema,
  sourceComponentId: z.string().max(120),
  context: z.record(z.unknown()),
  userMessage: z.string().max(500).optional(),
});

const PromptSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("question"), surfaceId: SurfaceIdSchema, text: z.string().trim().min(1).max(2000) }),
  z.object({ kind: z.literal("action"), action: UserActionSchema }),
]);

export type Prompt = z.infer<typeof PromptSchema>;

export const ChatRequestSchema = z.object({
  history: z.array(LlmMessageSchema).max(200),
  prompt: PromptSchema,
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export type Phase = "thinking" | "querying" | "drawing" | "repairing";

export type QueryRun = {
  name: string;
  purpose: string;
  sql: string;
  rowCount: number;
  columns: string[];
  truncated: boolean;
  durationMs: number;
};

export type FailedQuery = { name: string; purpose: string; sql: string; error: string };

export type Usage = { inputTokens: number; cachedInputTokens: number; outputTokens: number; reasoningTokens: number };

export type A2uiMessage = Record<string, unknown> & { version: string };

export type ChatEvent =
  | { type: "phase"; phase: Phase; detail?: string }
  | { type: "reasoning"; text: string }
  | { type: "query"; query: QueryRun }
  | { type: "query_failed"; query: FailedQuery }
  | { type: "a2ui"; message: A2uiMessage }
  | { type: "rejected_entry"; entry: string; problem: string }
  | { type: "error"; message: string }
  | { type: "done"; transcript: LlmMessage[]; usage: Usage; model: string };
