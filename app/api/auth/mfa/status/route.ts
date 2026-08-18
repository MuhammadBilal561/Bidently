import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mfaStates } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ok } from "@/lib/http";

export const runtime = "nodejs";

// GET /api/auth/mfa/status — whether the signed-in user has MFA configured.
export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const [mfa] = await db.select().from(mfaStates).where(eq(mfaStates.userId, session.userId));
  return ok({ configured: Boolean(mfa), enabled: mfa?.enabled ?? false });
}
