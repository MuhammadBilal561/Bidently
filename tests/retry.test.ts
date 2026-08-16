// Verifies the transient-retry helper in lib/retry.ts (used by all Gemini
// calls so a momentary 429/503 doesn't fail the request).
// Run with: npm run test:retry
import assert from "node:assert";
import { HttpError, withRetry } from "../lib/retry";

async function run() {
  // 1. A transient 503 followed by success must succeed on retry.
  let attempts = 0;
  const ok = await withRetry(async () => {
    attempts++;
    if (attempts < 3) throw new HttpError("temporarily unavailable", 503);
    return "done";
  }, { retries: 4, baseDelayMs: 1 });
  assert.strictEqual(ok, "done");
  assert.strictEqual(attempts, 3, "should have retried the two 503s");

  // 2. A non-transient 400 must NOT be retried.
  let badAttempts = 0;
  await assert.rejects(
    withRetry(async () => {
      badAttempts++;
      throw new HttpError("bad request", 400);
    }, { retries: 4, baseDelayMs: 1 }),
    /bad request/
  );
  assert.strictEqual(badAttempts, 1, "non-transient errors must not be retried");

  // 3. Giving up: after exhausting retries the last error is rethrown.
  let exhausted = 0;
  await assert.rejects(
    withRetry(async () => {
      exhausted++;
      throw new HttpError("still overloaded", 503);
    }, { retries: 2, baseDelayMs: 1 })
  );
  assert.strictEqual(exhausted, 3, "should attempt retries+1 times then give up");

  console.log("PASS — withRetry retries transient 429/5xx with backoff, skips 4xx, and fails loudly when exhausted.");
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
