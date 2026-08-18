import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "bidently_session";
const SESSION_DAYS = 30;

// Session signing key. We deliberately avoid exporting this as a module
// constant so that the insecure dev fallback is never baked into a production
// bundle: key material is resolved lazily, on first use, and in production a
// missing AUTH_SECRET throws loudly instead of silently signing cookies with a
// public, guessable string.
let secretKey: Uint8Array | null = null;
function getSecretKey(): Uint8Array {
  if (secretKey) return secretKey;
  const configured = process.env.AUTH_SECRET;
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      // Fail closed: never sign production sessions with a known fallback.
      throw new Error(
        "AUTH_SECRET is not set. Generate one with `openssl rand -base64 32` and " +
          "set it as a Vercel environment variable before deploying."
      );
    }
    secretKey = new TextEncoder().encode(
      "dev-only-insecure-secret-do-not-deploy-with-this"
    );
    return secretKey;
  }
  secretKey = new TextEncoder().encode(configured);
  return secretKey;
}

export interface SessionPayload {
  userId: string;
  orgId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Short-lived token issued after a successful password check when the user has
 * MFA enabled. It cannot be used to access anything by itself — its only
 * purpose is to prove "password was just verified" to the MFA-verify route,
 * which then exchanges it (plus a valid TOTP code) for a real session.
 */
export async function createMfaPendingToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload, purpose: "mfa" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSecretKey());
}

export async function verifyMfaPendingToken(
  token: string
): Promise<(SessionPayload & { purpose: string }) | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.purpose !== "mfa") return null;
    return payload as unknown as SessionPayload & { purpose: string };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const MFA_PENDING_COOKIE = "bidently_mfa_pending";
export const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;
export const MFA_PENDING_MAX_AGE_SECONDS = 10 * 60;
