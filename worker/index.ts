import catalogDocument from "../catalog/catalog.json";
import { ChatRequestSchema, type ChatEvent, type ChatRequest } from "../shared/protocol.ts";
import { runTurn } from "./agent.ts";
import { deepSeekClient, type DeepSeekConfig } from "./deepseek.ts";
import { systemPrompt } from "./prompt.ts";
import { eventStream } from "./sse.ts";
import { componentChecker } from "./ui-entries.ts";
import { d1Warehouse } from "./warehouse.ts";

const SYSTEM_PROMPT = systemPrompt(catalogDocument);
const CHECKER = componentChecker(catalogDocument);
const MAX_REQUEST_LENGTH = 1_500_000;

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/chat" && request.method === "POST") return handleChat(request, env, ctx);
    return failure(404, "Not found.");
  },
} satisfies ExportedHandler<Env>;

async function handleChat(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) return failure(503, "The server has no DEEPSEEK_API_KEY.");
  if (!(await isWithinRateLimit(request, env))) return failure(429, "Too many questions from your address. Try again in a minute.");
  const chat = await readChatRequest(request);
  if (!chat) return failure(400, "Malformed chat request.");
  return eventStream<ChatEvent>(
    (emit, signal) =>
      runTurn(chat, {
        llm: deepSeekClient(deepSeekConfig(env, apiKey)),
        warehouse: d1Warehouse(env.WAREHOUSE),
        checker: CHECKER,
        systemPrompt: SYSTEM_PROMPT,
        emit,
        signal,
      }),
    (error) => ({ type: "error", message: error instanceof Error ? error.message : String(error) }),
    (work) => ctx.waitUntil(work),
  );
}

async function isWithinRateLimit(request: Request, env: Env): Promise<boolean> {
  const { success } = await env.CHAT_RATE_LIMIT.limit({ key: request.headers.get("cf-connecting-ip") ?? "local" });
  return success;
}

async function readChatRequest(request: Request): Promise<ChatRequest | undefined> {
  const body = await request.text();
  if (body.length > MAX_REQUEST_LENGTH) return undefined;
  try {
    const parsed = ChatRequestSchema.safeParse(JSON.parse(body));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function deepSeekConfig(env: Env, apiKey: string): DeepSeekConfig {
  return {
    apiKey,
    baseUrl: env.DEEPSEEK_BASE_URL,
    model: env.DEEPSEEK_MODEL,
    thinking: env.DEEPSEEK_THINKING === "disabled" ? "disabled" : "enabled",
    reasoningEffort: env.DEEPSEEK_REASONING_EFFORT === "high" || env.DEEPSEEK_REASONING_EFFORT === "max" ? env.DEEPSEEK_REASONING_EFFORT : "low",
  };
}

function failure(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}
