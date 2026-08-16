import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { generateDraft } from "@/lib/draft";
import { requireSession } from "@/lib/session";
import { assertRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { contentLibraryItems, draftAnswers, requirements, tenders } from "@/lib/db/schema";
import type { ExtractedRequirement } from "@/lib/types";
import { draftSchema } from "@/lib/validation";
import { AppError, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const denied = assertRole(session.role, "draft:write");
  if (denied.error) return denied.error;

  try {
    const body = draftSchema.parse(await req.json());

    // Tenant isolation: the requirement must resolve back to a tender owned by
    // this org before we spend AI budget on it — otherwise a guessed/foreign
    // requirement id could trigger work (and a draft write) against this org's
    // content library.
    const requirementRow = await db
      .select({ tenderId: requirements.tenderId })
      .from(requirements)
      .where(eq(requirements.id, body.id))
      .get();
    if (!requirementRow) throw new AppError("Requirement not found.", 404);
    const tender = await db
      .select({ orgId: tenders.orgId })
      .from(tenders)
      .where(eq(tenders.id, requirementRow.tenderId))
      .get();
    if (!tender || tender.orgId !== session.orgId) {
      throw new AppError("Requirement not found.", 404);
    }

    const requirement: ExtractedRequirement = {
      id: body.id,
      requirement_text: body.requirement_text,
      category: body.category ?? "administrative",
      source_page: body.source_page ?? null,
      source_snippet: body.source_snippet ?? "",
      is_mandatory: body.is_mandatory ?? true,
      evaluation_weight: body.evaluation_weight ?? null,
      keywords: body.keywords ?? [],
      draft: null,
    };

    const libraryRows = await db
      .select()
      .from(contentLibraryItems)
      .where(eq(contentLibraryItems.orgId, session.orgId))
      .all();
    const library = libraryRows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      category: row.category as ExtractedRequirement["category"],
      tags: (row.tags as string[]) ?? [],
    }));

    const draft = await generateDraft(requirement, library);

    if (!draft.content_gap) {
      await db.insert(draftAnswers)
        .values({
          id: crypto.randomUUID(),
          requirementId: requirement.id,
          content: draft.answer,
          contentGap: draft.content_gap,
          sourceContentIds: draft.sources.map((s) => s.content_id),
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: draftAnswers.requirementId,
          set: {
            content: draft.answer,
            contentGap: draft.content_gap,
            sourceContentIds: draft.sources.map((s) => s.content_id),
          },
        })
        .run();
    }

    return ok(draft);
  } catch (err) {
    console.error("Draft generation failed:", err);
    return toErrorResponse(err, "Draft generation failed.");
  }
}


