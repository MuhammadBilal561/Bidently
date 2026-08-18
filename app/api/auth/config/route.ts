import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Tells the client which optional integrations are configured (so the UI can
// show/hide buttons rather than failing when an env var is missing).
//
// The response also reports WHICH variable is missing when Google OAuth isn't
// fully configured — handy for debugging ("button not appearing" usually means
// one of these two env vars isn't loaded).
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");

  const defaultRedirect = process.env.APP_URL
    ? `${process.env.APP_URL.replace(/\/+$/, "")}/api/auth/oauth/google/callback`
    : "/api/auth/oauth/google/callback";

  return NextResponse.json({
    google_oauth: clientId && clientSecret ? true : false,
    google_oauth_missing: missing,
    oauth_redirect_uri: process.env.OAUTH_REDIRECT_URI ?? defaultRedirect,
  });
}

