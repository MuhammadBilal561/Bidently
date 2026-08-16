import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mfaStates } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { generateSecret, otpauthUri } from "@/lib/totp";
import { ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

// POST /api/auth/mfa/setup — create (or return an existing) TOTP secret for
// the signed-in user so they can scan it into an authenticator app. MFA is
// only turned on after a successful /api/auth/mfa/enable.
export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  try {
    const existing = await db
      .select()
      .from(mfaStates)
      .where(eq(mfaStates.userId, session.userId))
      .get();

    if (existing && existing.enabled) {
      return ok({ enabled: true });
    }

    if (!existing) {
      const secret = generateSecret();
      await db.insert(mfaStates)
        .values({
          userId: session.userId,
          secret,
          enabled: false,
          createdAt: new Date(),
        })
        .run();
      return ok({ enabled: false, secret, otpauth_url: otpauthUri(secret, session.email) });
    }

    return ok({ enabled: false, secret: existing.secret, otpauth_url: otpauthUri(existing.secret, session.email) });
  } catch (err) {
    return toErrorResponse(err, "Could not set up two-factor authentication.");
  }
}
