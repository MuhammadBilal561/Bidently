import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, mfaStates } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth";
import { setMfaPendingCookie, setSessionCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { AppError, ok, toErrorResponse, fail } from "@/lib/http";
import { clientKey, rateLimit, tooManyRequestsMsg } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`login:${clientKey(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return fail(tooManyRequestsMsg(), 429);

  try {
    const input = loginSchema.parse(await req.json());

    const [user] = await db.select().from(users).where(eq(users.email, input.email));
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError("Invalid email or password.", 401);
    }

    const payload = {
      userId: user.id,
      orgId: user.orgId,
      email: user.email,
      role: user.role,
    };

    const [mfa] = await db.select().from(mfaStates).where(eq(mfaStates.userId, user.id));
    if (mfa?.enabled) {
      const res = ok({ mfa_required: true });
      await setMfaPendingCookie(res, payload);
      return res;
    }

    const res = ok({
      mfa_required: false,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      orgId: user.orgId,
    });
    await setSessionCookie(res, payload);
    return res;
  } catch (err) {
    console.error("Login failed:", err);
    return toErrorResponse(err, "Login failed.");
  }
}


