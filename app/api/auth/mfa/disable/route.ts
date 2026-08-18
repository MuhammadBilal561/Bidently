import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mfaStates } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { mfaCodeSchema } from "@/lib/validation";
import { verifyTotp } from "@/lib/totp";
import { AppError, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

// POST /api/auth/mfa/disable — require a valid current code, then turn MFA off.
export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  try {
    const { code } = mfaCodeSchema.parse(await req.json());
    const [mfa] = await db.select().from(mfaStates).where(eq(mfaStates.userId, session.userId));
    if (!mfa?.enabled) throw new AppError("Two-factor authentication is not enabled.", 400);

    if (!verifyTotp(mfa.secret, code)) {
      throw new AppError("That code didn't match. Try again.", 401);
    }

    await db.update(mfaStates).set({ enabled: false }).where(eq(mfaStates.userId, session.userId));
    return ok({ enabled: false });
  } catch (err) {
    return toErrorResponse(err, "Could not disable two-factor authentication.");
  }
}
