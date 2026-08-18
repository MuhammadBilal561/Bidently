import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { requirements, tenders } from "@/lib/db/schema";
import { idParamSchema, requirementStatusSchema } from "@/lib/validation";
import { AppError, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

// PATCH /api/requirements/:id — update a requirement's workflow status.
// Enforces org ownership via the requirement -> tender -> org chain.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  try {
    const { id } = idParamSchema.parse(await params);
    const { status } = requirementStatusSchema.parse(await req.json());

    const [reqRow] = await db
      .select({ tenderId: requirements.tenderId })
      .from(requirements)
      .where(eq(requirements.id, id));
    if (!reqRow) throw new AppError("Requirement not found.", 404);

    const [tender] = await db
      .select({ orgId: tenders.orgId })
      .from(tenders)
      .where(eq(tenders.id, reqRow.tenderId));
    if (!tender || tender.orgId !== session.orgId) {
      throw new AppError("Requirement not found.", 404);
    }

    await db.update(requirements).set({ status }).where(eq(requirements.id, id));
    return ok({ id, status });
  } catch (err) {
    return toErrorResponse(err, "Could not update requirement status.");
  }
}
