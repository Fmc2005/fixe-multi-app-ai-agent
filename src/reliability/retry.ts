export class TimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

export type RetryOptions = {
  operation: string;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  /** Called before each attempt (including retries), 1-indexed. */
  onAttempt?: (attempt: number) => void;
};

/**
 * Runs `fn` with a timeout and at most one automatic retry with backoff, per
 * CLAUDE.md's non-functional requirements. `fn` receives an AbortSignal so it
 * can cancel the underlying request (e.g. fetch) once the timeout fires.
 */
export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { operation, timeoutMs = 8000, retries = 1, backoffMs = 500 } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    options.onAttempt?.(attempt);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fn(controller.signal);
    } catch (error) {
      lastError =
        controller.signal.aborted && !(error instanceof TimeoutError)
          ? new TimeoutError(operation, timeoutMs)
          : error;
      const isLastAttempt = attempt === retries + 1;
      if (!isLastAttempt) {
        await sleep(backoffMs * attempt);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
