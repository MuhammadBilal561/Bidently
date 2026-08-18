import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { assertRole } from "@/lib/authz";
import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { idParamSchema, memberUpdateSchema } from "@/lib/validation";
import { AppError, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

// PATCH /api/org/members/:id — change role or password of a member
// DELETE /api/org/members/:id — remove a member from the org
// Both gated to members:manage (owner/admin) and scoped to the caller's org.

async function ownerCount(orgId: string): Promise<number> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.orgId, orgId));
  return rows.filter((u) => u.role === "owner").length;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const denied = assertRole(session.role, "members:manage");
  if (denied.error) return denied.error;

  try {
    const { id } = idParamSchema.parse(await params);
    const input = memberUpdateSchema.parse(await req.json());

    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target || target.orgId !== session.orgId) {
      throw new AppError("Member not found.", 404);
    }
    // Never allow the last owner to be demoted.
    if (target.role === "owner" && (await ownerCount(session.orgId)) <= 1) {
      throw new AppError("An organization must keep at least one owner.", 400);
    }

    await db.update(users)
      .set({
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.password !== undefined
          ? { passwordHash: await hashPassword(input.password) }
          : {}),
      })
      .where(eq(users.id, id));

    return ok({ id });
  } catch (err) {
    return toErrorResponse(err, "Could not update member.");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(_req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const denied = assertRole(session.role, "members:manage");
  if (denied.error) return denied.error;

  try {
    const { id } = idParamSchema.parse(await params);

    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target || target.orgId !== session.orgId) {
      throw new AppError("Member not found.", 404);
    }
    if (id === session.userId) {
      throw new AppError("You can't remove your own account here.", 400);
    }
    if (target.role === "owner" && (await ownerCount(session.orgId)) <= 1) {
      throw new AppError("An organization must keep at least one owner.", 400);
    }

    await db.delete(users).where(eq(users.id, id));
    return ok({ id });
  } catch (err) {
    return toErrorResponse(err, "Could not remove member.");
  }
}
