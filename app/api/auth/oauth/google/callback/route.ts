import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, users, contentLibraryItems, mfaStates } from "@/lib/db/schema";
import { SEED_CONTENT_LIBRARY } from "@/lib/content-library";
import { setMfaPendingCookie, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "bidently_oauth_state";

interface GoogleUserInfo {
  email: string;
  name?: string;
  email_verified?: boolean;
}

// GET /api/auth/oauth/google/callback — exchange the code, resolve/create the
// user, and sign them in. New OAuth users get their own org + seeded library
// (same as password signup). If the user has MFA enabled, they complete the
// pending step (redirect to /?mfa=1) before a real session is issued.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const storedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (error || !code) return redirectToHome();
  if (!storedState || state !== storedState) return redirectToHome();

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri =
    process.env.OAUTH_REDIRECT_URI ?? `${url.origin}/api/auth/oauth/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return redirectToHome();
  const tokenData = await tokenRes.json();
  const accessToken: string | undefined = tokenData.access_token;
  if (!accessToken) return redirectToHome();

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!infoRes.ok) return redirectToHome();
  const profile = (await infoRes.json()) as GoogleUserInfo;
  const email = profile.email?.trim().toLowerCase();
  if (!email) return redirectToHome();

  try {
    let user = db.select().from(users).where(eq(users.email, email)).get();

    if (!user) {
      const orgId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      const now = new Date();
      db.insert(organizations)
        .values({
          id: orgId,
          name: `${profile.name || email}'s workspace`,
          planTier: "free",
          createdAt: now,
        })
        .run();
      // OAuth users have no password — set an unguessable placeholder so the
      // NOT NULL column is satisfied but password login can never match it.
      db.insert(users)
        .values({
          id: userId,
          orgId,
          email,
          passwordHash: `oauth:${crypto.randomUUID()}`,
          fullName: profile.name || null,
          role: "owner",
          createdAt: now,
        })
        .run();
      for (const item of SEED_CONTENT_LIBRARY) {
        db.insert(contentLibraryItems)
          .values({
            id: crypto.randomUUID(),
            orgId,
            title: item.title,
            body: item.body,
            category: item.category,
            tags: item.tags,
            createdAt: now,
          })
          .run();
      }
      user = db.select().from(users).where(eq(users.email, email)).get()!;
    }

    const payload = {
      userId: user.id,
      orgId: user.orgId,
      email: user.email,
      role: user.role,
    };

    const mfa = db.select().from(mfaStates).where(eq(mfaStates.userId, user.id)).get();

    if (mfa?.enabled) {
      const res = NextResponse.redirect(new URL("/?mfa=1", url.origin));
      await setMfaPendingCookie(res, payload);
      clearOauthState(res);
      return res;
    }

    const res = NextResponse.redirect(new URL("/", url.origin));
    await setSessionCookie(res, payload);
    clearOauthState(res);
    return res;
  } catch (err) {
    console.error("OAuth callback failed:", err);
    return redirectToHome();
  }
}

function clearOauthState(res: NextResponse) {
  res.cookies.set(OAUTH_STATE_COOKIE, "", { maxAge: 0, path: "/" });
}

function redirectToHome() {
  return NextResponse.redirect(new URL("/", process.env.APP_URL || "http://localhost:3000"));
}
