import type { ChatEvent, ChatRequest } from "../../shared/protocol.ts";

export async function streamChat(request: ChatRequest, onEvent: (event: ChatEvent) => void, signal: AbortSignal): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok || !response.body) throw new Error(await describeFailure(response));
  await readEvents(response.body, onEvent);
}

async function describeFailure(response: Response): Promise<string> {
  const body = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
  return body?.error ?? `The server answered ${response.status}.`;
}

async function readEvents(body: ReadableStream<Uint8Array>, onEvent: (event: ChatEvent) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const data = frame.startsWith("data: ") ? frame.slice(6) : "";
      if (data) onEvent(JSON.parse(data) as ChatEvent);
    }
  }
}
