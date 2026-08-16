import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, mfaStates } from "@/lib/db/schema";
import {
  clearMfaPendingCookie,
  requireSession,
  resolveMfaPending,
  setSessionCookie,
} from "@/lib/session";
import { mfaCodeSchema } from "@/lib/validation";
import { verifyTotp } from "@/lib/totp";
import { AppError, fail, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

// Completes sign-in when the user has MFA enabled:
//   - Primary path: a valid "mfa pending" cookie (set right after a correct
//     password) proves the password step already succeeded; only the TOTP code
//     is needed to mint the real session.
//   - Fallback path (pending cookie expired): requires an existing session and
//     re-verifies a code from the security settings page.

const PENDING_COOKIE = "bidently_mfa_pending";

export async function POST(req: NextRequest) {
  const pending = req.cookies.get(PENDING_COOKIE)?.value;

  if (pending) {
    const pendingPayload = await resolveMfaPending(pending);
    if (!pendingPayload) return fail("Your sign-in has expired. Please sign in again.", 401);
    return verifyAndComplete(pendingPayload.userId, req);
  }

  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  return verifyAndComplete(auth.session.userId, req);
}

async function verifyAndComplete(userId: string, req: NextRequest) {
  try {
    const { code } = mfaCodeSchema.parse(await req.json());

    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) throw new AppError("User not found.", 404);

    const mfa = await db.select().from(mfaStates).where(eq(mfaStates.userId, userId)).get();
    if (!mfa?.enabled) throw new AppError("Two-factor authentication is not enabled.", 400);

    if (!verifyTotp(mfa.secret, code)) {
      throw new AppError("That code didn't match. Try again.", 401);
    }

    const res = ok({
      mfa_required: false,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      orgId: user.orgId,
    });
    await setSessionCookie(res, {
      userId: user.id,
      orgId: user.orgId,
      email: user.email,
      role: user.role,
    });
    clearMfaPendingCookie(res);
    return res;
  } catch (err) {
    return toErrorResponse(err, "Could not verify code.");
  }
}
