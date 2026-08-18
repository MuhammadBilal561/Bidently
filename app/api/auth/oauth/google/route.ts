import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "bidently_oauth_state";

// GET /api/auth/oauth/google — redirect to Google's consent screen.
// Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (see GUIDE.md). The state
// value is stored in an HttpOnly cookie and checked on the callback to block
// login-CSRF.
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Google sign-in is not configured on this server." },
      { status: 501 }
    );
  }

  const origin = new URL(req.url).origin;
  const baseUrl = process.env.APP_URL?.replace(/\/+$/, "") || origin;
  const redirectUri =
    process.env.OAUTH_REDIRECT_URI ?? `${baseUrl}/api/auth/oauth/google/callback`;

  const state = randomBytes(24).toString("hex");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    include_granted_scopes: "true",
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });
  return res;
}
