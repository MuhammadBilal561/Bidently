import { NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { assertRole } from "@/lib/authz";
import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { memberCreateSchema } from "@/lib/validation";
import { AppError, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

// Members are user rows sharing this org's id. The owner (or an admin) adds
// teammates by creating their account in-place (no email service needed for a
// self-hosted tool). Role/password changes and removal live in
// app/api/org/members/[id]/route.ts (gated to members:manage).

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.orgId, session.orgId))
    .orderBy(asc(users.createdAt))
    .all();

  return ok({ members: rows });
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const denied = assertRole(session.role, "members:manage");
  if (denied.error) return denied.error;

  try {
    const input = memberCreateSchema.parse(await req.json());

    // Email must not already belong to *any* org (the column is globally unique).
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .get();
    if (existing) {
      throw new AppError("A user with that email already exists.", 409);
    }

    const id = crypto.randomUUID();
    await db.insert(users)
      .values({
        id,
        orgId: session.orgId,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        fullName: input.fullName || null,
        role: input.role,
        createdAt: new Date(),
      })
      .run();

    return ok({ id, email: input.email, role: input.role }, 201);
  } catch (err) {
    return toErrorResponse(err, "Could not add member.");
  }
}

