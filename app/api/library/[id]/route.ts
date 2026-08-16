import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { assertRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { contentLibraryItems } from "@/lib/db/schema";
import { idParamSchema, libraryUpdateSchema } from "@/lib/validation";
import { AppError, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

// PATCH /api/library/:id — update an item (edit)
// DELETE /api/library/:id — remove an item
// Both enforce org ownership AND role gates so one org can never touch
// another's library, and read-only roles can't mutate it.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const denied = assertRole(session.role, "library:manage");
  if (denied.error) return denied.error;

  try {
    const { id } = idParamSchema.parse(await params);
    const input = libraryUpdateSchema.parse(await req.json());

    const existing = await db
      .select()
      .from(contentLibraryItems)
      .where(eq(contentLibraryItems.id, id))
      .get();
    if (!existing || existing.orgId !== session.orgId) {
      throw new AppError("Content-library item not found.", 404);
    }

    await db.update(contentLibraryItems)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
      })
      .where(eq(contentLibraryItems.id, id))
      .run();

    return ok({ id });
  } catch (err) {
    return toErrorResponse(err, "Could not update content-library item.");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(_req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const denied = assertRole(session.role, "library:manage");
  if (denied.error) return denied.error;

  try {
    const { id } = idParamSchema.parse(await params);

    const existing = await db
      .select()
      .from(contentLibraryItems)
      .where(eq(contentLibraryItems.id, id))
      .get();
    if (!existing || existing.orgId !== session.orgId) {
      throw new AppError("Content-library item not found.", 404);
    }

    await db.delete(contentLibraryItems).where(eq(contentLibraryItems.id, id)).run();
    return ok({ id });
  } catch (err) {
    return toErrorResponse(err, "Could not delete content-library item.");
  }
}
