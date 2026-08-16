// Verifies the dependency-free TOTP implementation in lib/totp.ts.
// Run with: npm run test:totp
import assert from "node:assert";
import { generateSecret, totp, verifyTotp, otpauthUri } from "../lib/totp";

async function run() {
  const secret = generateSecret();
  assert.ok(secret.length > 0, "secret should be non-empty Base32");

  // The code we just computed should verify (same time window).
  const code = totp(secret);
  assert.match(code, /^\d{6}$/, "TOTP code should be 6 digits");
  assert.ok(verifyTotp(secret, code), "a freshly-generated code must verify");

  // Wrong / malformed codes must reject.
  assert.ok(!verifyTotp(secret, "000000"), "wrong code must fail");
  assert.ok(!verifyTotp(secret, "12345"), "too-short code must fail");
  assert.ok(!verifyTotp(secret, "abcdef"), "non-numeric code must fail");

  // Deterministic within the window: repeated calls give the same code.
  assert.strictEqual(totp(secret), totp(secret), "codes should be stable within a 30s window");

  // otpauth URI shape (used for QR provisioning).
  const uri = otpauthUri(secret, "me@company.com", "Bidently");
  assert.ok(uri.startsWith("otpauth://totp/"), "URI should be an otpauth TOTP URI");
  assert.ok(uri.includes("secret="), "URI should carry the secret");

  // Different secrets produce different codes (with very high probability).
  const other = totp(generateSecret());
  if (other === code) {
    // Extremely unlikely (1 in a million); if it happens, just log, the
    // earlier verify assertions are the real guarantees.
    console.log("note: coincidental equal codes across random secrets");
  }

  console.log("PASS — TOTP generation, verification, malformed-code rejection and otpauth URI all work.");
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
