// Verifies password hashing and signed-session round trip.
// Run with: npm run test:auth

process.env.AUTH_SECRET = "unit-test-secret-that-is-long-enough-for-hs256";

import assert from "node:assert";

async function run() {
  const {
    hashPassword,
    verifyPassword,
    createSessionToken,
    verifySessionToken,
  } = await import("../lib/auth");

  // --- password hashing ---
  const hash = await hashPassword("my-secret-pass");
  assert.notStrictEqual(hash, "my-secret-pass", "hash must not be the plaintext");
  assert.ok(await verifyPassword("my-secret-pass", hash), "correct password verifies");
  assert.ok(!(await verifyPassword("wrong-pass", hash)), "wrong password rejected");

  // Same password hashes to different values (unique salt) — good bcrypt hygiene.
  const hash2 = await hashPassword("my-secret-pass");
  assert.notStrictEqual(hash, hash2, "each hash should be salted independently");

  // --- session token round trip ---
  const token = await createSessionToken({
    userId: "u-1",
    orgId: "o-1",
    email: "a@b.com",
    role: "owner",
  });
  const payload = await verifySessionToken(token);
  assert.ok(payload, "token should verify");
  assert.strictEqual(payload!.orgId, "o-1");
  assert.strictEqual(payload!.role, "owner");

  // Tampered token must fail verification.
  const tampered = token.slice(0, -4) + "XXXX";
  assert.strictEqual(await verifySessionToken(tampered), null, "tampered token must be rejected");

  console.log("PASS — password hashing (salted) and signed session verification work.");
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
