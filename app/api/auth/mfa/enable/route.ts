import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mfaStates } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { mfaCodeSchema } from "@/lib/validation";
import { verifyTotp } from "@/lib/totp";
import { AppError, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

// POST /api/auth/mfa/enable — verify a freshly-generated code, then turn MFA
// on. This confirms the user actually has the app working before locking in.
export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  try {
    const { code } = mfaCodeSchema.parse(await req.json());
    const [mfa] = await db.select().from(mfaStates).where(eq(mfaStates.userId, session.userId));
    if (!mfa) throw new AppError("Run two-factor setup first.", 400);
    if (mfa.enabled) throw new AppError("Two-factor authentication is already enabled.", 400);

    if (!verifyTotp(mfa.secret, code)) {
      throw new AppError("That code didn't match. Try again.", 401);
    }

    await db.update(mfaStates).set({ enabled: true }).where(eq(mfaStates.userId, session.userId));
    return ok({ enabled: true });
  } catch (err) {
    return toErrorResponse(err, "Could not enable two-factor authentication.");
  }
}
