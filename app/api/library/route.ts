import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { assertRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { contentLibraryItems } from "@/lib/db/schema";
import { libraryCreateSchema } from "@/lib/validation";
import { ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const rows = await db
    .select()
    .from(contentLibraryItems)
    .where(eq(contentLibraryItems.orgId, session.orgId))
    .orderBy(desc(contentLibraryItems.createdAt));

  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    tags: (row.tags as string[]) ?? [],
    created_at: row.createdAt,
  }));

  return ok({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const denied = assertRole(session.role, "library:manage");
  if (denied.error) return denied.error;

  try {
    const input = libraryCreateSchema.parse(await req.json());

    const id = crypto.randomUUID();
    await db.insert(contentLibraryItems)
      .values({
        id,
        orgId: session.orgId,
        title: input.title,
        body: input.body,
        category: input.category,
        tags: input.tags,
        createdAt: new Date(),
      });

    return ok({ id }, 201);
  } catch (err) {
    return toErrorResponse(err, "Could not add content-library item.");
  }
}

