import type { ToolTraceEntry } from "@/agent/schemas";

/**
 * Masks an external id for logging/trace purposes: keep enough to
 * cross-reference during debugging, hide the rest (CLAUDE.md: "Keep secrets
 * ... out of logs, traces"). Not for secrets — those must never be traced.
 */
export function maskExternalId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  if (id.length <= 4) return "***";
  return `${id.slice(0, 2)}***${id.slice(-2)}`;
}

/** Accumulates trace entries for a single plan/execute request. */
export class Tracer {
  private entries: ToolTraceEntry[] = [];

  record(entry: Omit<ToolTraceEntry, "timestamp">): void {
    this.entries.push({ ...entry, timestamp: new Date().toISOString() });
  }

  list(): ToolTraceEntry[] {
    return [...this.entries];
  }
}

/**
 * Wraps a tool call, recording a trace entry with status/duration/attempt
 * regardless of outcome. `attempt` should be supplied by the retry wrapper
 * when this is used together with `withRetry`.
 */
export async function traced<T>(
  tracer: Tracer,
  meta: { tool: ToolTraceEntry["tool"]; operation: string; attempt: number },
  externalIdOf: (result: T) => string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    tracer.record({
      tool: meta.tool,
      operation: meta.operation,
      status: "success",
      durationMs: Date.now() - start,
      attempt: meta.attempt,
      maskedExternalId: maskExternalId(externalIdOf(result)),
    });
    return result;
  } catch (error) {
    tracer.record({
      tool: meta.tool,
      operation: meta.operation,
      status: "failed",
      durationMs: Date.now() - start,
      attempt: meta.attempt,
      errorCode: error instanceof Error ? error.message : "unknown_error",
    });
    throw error;
  }
}
