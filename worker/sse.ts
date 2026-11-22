export type Emit<T> = (event: T) => void;

export function eventStream<T>(
  run: (emit: Emit<T>, signal: AbortSignal) => Promise<void>,
  describeFailure: (error: unknown) => T,
  keepAlive: (work: Promise<void>) => void,
): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const disconnected = new AbortController();
  const emit: Emit<T> = (event) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)).catch(() => disconnected.abort());
  };
  keepAlive(
    run(emit, disconnected.signal)
      .catch((error: unknown) => emit(describeFailure(error)))
      .finally(() => writer.close().catch(() => undefined)),
  );
  return new Response(readable, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform" },
  });
}
