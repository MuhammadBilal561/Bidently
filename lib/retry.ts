/**
 * Small, shared retry helper for transient upstream failures (Gemini and other
 * HTTP calls). Providers routinely return 429 (rate limit) and 503 (high
 * demand / temporarily unavailable) — a short, jittered exponential-backoff
 * retry turns those into successful requests instead of a hard failure.
 */

export const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

/** An HTTP error carrying its status so retry logic can decide what to retry. */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs `fn`, retrying on transient (retryable) HTTP statuses with exponential
 * backoff plus jitter. Non-transient errors and the final failure are rethrown
 * unchanged.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 800;
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const status = err instanceof HttpError ? err.status : (err as { status?: number })?.status;
      const retryable = status !== undefined && TRANSIENT_STATUSES.has(status);
      if (attempt >= retries || !retryable) {
        throw err;
      }
      const delay = baseDelayMs * 2 ** attempt + Math.round(Math.random() * 300);
      await sleep(delay);
      attempt++;
    }
  }
}
