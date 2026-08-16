import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { assertRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { tenders, requirements, draftAnswers } from "@/lib/db/schema";
import { idParamSchema, tenderStatusSchema } from "@/lib/validation";
import { AppError, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const { id } = await params;

  const tender = await db.select().from(tenders).where(eq(tenders.id, id)).get();

  // Belt-and-braces: confirm the tender belongs to the caller's org before
  // returning anything. A stale/guessed id from another org must 404, not
  // leak data — this is the check that stands in for row-level security
  // until the DB itself enforces it in the Postgres deployment.
  if (!tender || tender.orgId !== session.orgId) {
    return NextResponse.json({ error: "Tender not found." }, { status: 404 });
  }

  const reqRows = await db
    .select()
    .from(requirements)
    .where(eq(requirements.tenderId, id))
    .all();

  const withDrafts: {
    id: string;
    category: string;
    requirement_text: string;
    source_page: number | null;
    source_snippet: string;
    is_mandatory: boolean;
    evaluation_weight: number | null;
    status: string;
    keywords: string[];
    draft: { answer: string; content_gap: boolean } | null;
  }[] = [];
  for (const r of reqRows) {
    const draft = await db
      .select()
      .from(draftAnswers)
      .where(eq(draftAnswers.requirementId, r.id))
      .get();
    withDrafts.push({
      id: r.id,
      category: r.category,
      requirement_text: r.requirementText,
      source_page: r.sourcePage,
      source_snippet: r.sourceSnippet,
      is_mandatory: r.isMandatory,
      evaluation_weight: r.evaluationWeight,
      status: r.status,
      keywords: r.keywords ?? [],
      draft: draft
        ? { answer: draft.content, content_gap: draft.contentGap }
        : null,
    });
  }

  return NextResponse.json({
    document_title: tender.title,
    issuing_body: tender.issuingBody,
    submission_deadline: tender.submissionDeadline,
    tender_id: tender.id,
    status: tender.status,
    requirements: withDrafts,
  });
}

// PATCH /api/tenders/:id — update the tender's lifecycle status.
// Enforces org ownership exactly like GET.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const denied = assertRole(session.role, "tender:manage");
  if (denied.error) return denied.error;

  try {
    const { id } = idParamSchema.parse(await params);
    const { status } = tenderStatusSchema.parse(await req.json());

    const tender = await db.select().from(tenders).where(eq(tenders.id, id)).get();
    if (!tender || tender.orgId !== session.orgId) {
      throw new AppError("Tender not found.", 404);
    }

    await db.update(tenders).set({ status }).where(eq(tenders.id, id)).run();
    return ok({ id, status });
  } catch (err) {
    return toErrorResponse(err, "Could not update tender status.");
  }
}

// DELETE /api/tenders/:id — remove a tender (and its requirements/drafts).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(_req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const denied = assertRole(session.role, "tender:manage");
  if (denied.error) return denied.error;

  try {
    const { id } = idParamSchema.parse(await params);

    const tender = await db.select().from(tenders).where(eq(tenders.id, id)).get();
    if (!tender || tender.orgId !== session.orgId) {
      throw new AppError("Tender not found.", 404);
    }

    // Delete dependents first: drafts -> requirements -> tender.
    const reqRows = await db
      .select({ id: requirements.id })
      .from(requirements)
      .where(eq(requirements.tenderId, id))
      .all();
    for (const r of reqRows) {
      await db.delete(draftAnswers).where(eq(draftAnswers.requirementId, r.id)).run();
    }
    await db.delete(requirements).where(eq(requirements.tenderId, id)).run();
    await db.delete(tenders).where(eq(tenders.id, id)).run();

    return ok({ id });
  } catch (err) {
    return toErrorResponse(err, "Could not delete tender.");
  }
}

