import type { NextRequest } from "next/server";

/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Purpose: blunt the most common attacks — password brute-forcing on /login,
 * account-creation spam on /signup, TOTP guessing on /mfa/verify, and runaway
 * spend on the Gemini-backed /extract and /draft endpoints.
 *
 * Scope note: this window lives in a single process/instance. On Vercel's
 * serverless model each warm container keeps its own counter, so it is a
 * *best-effort* throttle per instance, NOT a global quota. It still stops a
 * burst of attempts faster than nothing and fully protects local/single-node
 * deploys. For a hard cross-instance limit, swap this module for a shared
 * store (e.g. Upstash Redis) — the call signature below stays the same.
 *
 * Limits are tunable via env (per route) with sane defaults:
 *   RATE_LIMIT_MAX       default 20
 *   RATE_LIMIT_WINDOW_MS default 60_000
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

/** Best-effort client key: the left-most forwarded IP when present. */
export function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Returns `{ ok: true }` if the caller may proceed, otherwise
 * `{ ok: false, retryAfterMs }` with the time until the oldest entry slides out.
 */
export function rateLimit(
  key: string,
  opts: { limit?: number; windowMs?: number } = {}
): { ok: boolean; retryAfterMs?: number } {
  const limit = Number(process.env.RATE_LIMIT_MAX) || (opts.limit ?? 20);
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || (opts.windowMs ?? 60_000);

  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  // Drop timestamps outside the window.
  const cutoff = now - windowMs;
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    const retryAfterMs = Math.max(1, oldest + windowMs - now);
    // Opportunistically sweep buckets so the map can't grow unbounded.
    if (buckets.size > 10_000) sweep();
    return { ok: false, retryAfterMs };
  }

  bucket.timestamps.push(now);
  if (buckets.size > 10_000) sweep();
  return { ok: true };
}

function sweep() {
  const cutoff = Date.now() - (Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000);
  for (const [key, b] of buckets) {
    b.timestamps = b.timestamps.filter((t) => t > cutoff);
    if (b.timestamps.length === 0) buckets.delete(key);
  }
}

/** Builds a 429 response body message for the caller. */
export function tooManyRequestsMsg(): string {
  return "Too many attempts. Please wait a moment and try again.";
}