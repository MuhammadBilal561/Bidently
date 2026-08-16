import { createHmac, randomBytes } from "crypto";

/**
 * TOTP (RFC 6238) implementation using only Node's crypto — no third-party
 * dependency. Works with standard authenticator apps (Google Authenticator,
 * Authy, 1Password...). Secrets are Base32 (RFC 4648), codes are 6 digits
 * over a 30s time step.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateSecret(length = 20): string {
  return base32Encode(new Uint8Array(randomBytes(length)));
}

export interface TotpOptions {
  timeStep?: number;
  digits?: number;
}

function codeForCounter(key: Uint8Array, counter: bigint, digits: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(counter, 0);
  const hmac = createHmac("sha1", Buffer.from(key)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = bin % 10 ** digits;
  return code.toString().padStart(digits, "0");
}

export function totp(secret: string, opts: TotpOptions = {}): string {
  const timeStep = opts.timeStep ?? 30;
  const digits = opts.digits ?? 6;
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  return codeForCounter(base32Decode(secret), BigInt(counter), digits);
}

/**
 * Verifies a submitted code against the current (and an optional number of
 * neighbouring) time windows to tolerate clock drift / in-flight codes.
 */
export function verifyTotp(
  secret: string,
  token: string,
  window = 1,
  opts: TotpOptions = {}
): boolean {
  const digits = opts.digits ?? 6;
  if (!new RegExp(`^\\d{${digits}}$`).test(token)) return false;
  const timeStep = opts.timeStep ?? 30;
  const key = base32Decode(secret);
  const current = Math.floor(Date.now() / 1000 / timeStep);
  for (let i = -window; i <= window; i++) {
    if (codeForCounter(key, BigInt(current + i), digits) === token) return true;
  }
  return false;
}

/** otpauth:// URI for QR-code provisioning in an authenticator app. */
export function otpauthUri(
  secret: string,
  account: string,
  issuer = "Bidently"
): string {
  const label = `${issuer}:${account}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(
    issuer
  )}`;
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Uint8Array {
  const cleaned = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of cleaned) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}
