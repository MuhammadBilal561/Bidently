import { NextRequest, NextResponse } from "next/server";
import {
  MFA_PENDING_COOKIE,
  MFA_PENDING_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createMfaPendingToken,
  createSessionToken,
  verifyMfaPendingToken,
  verifySessionToken,
  type SessionPayload,
} from "./auth";

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Returns the session, or writes a 401 response and returns null. */
export async function requireSession(
  req: NextRequest
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const session = await getSession(req);
  if (!session) {
    return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  return { session };
}

export async function setSessionCookie(res: NextResponse, payload: SessionPayload) {
  const token = await createSessionToken(payload);
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
}

export async function setMfaPendingCookie(res: NextResponse, payload: SessionPayload) {
  const token = await createMfaPendingToken(payload);
  res.cookies.set(MFA_PENDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MFA_PENDING_MAX_AGE_SECONDS,
    path: "/",
  });
}

export function getMfaPending(req: NextRequest) {
  return req.cookies.get(MFA_PENDING_COOKIE)?.value ?? null;
}

export async function resolveMfaPending(token: string) {
  return verifyMfaPendingToken(token);
}

export function clearMfaPendingCookie(res: NextResponse) {
  res.cookies.set(MFA_PENDING_COOKIE, "", { maxAge: 0, path: "/" });
}
