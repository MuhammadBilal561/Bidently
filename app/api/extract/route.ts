import { NextRequest } from "next/server";
import { fileToText } from "@/lib/extract-text";
import { extractRequirements } from "@/lib/gemini";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenders, requirements } from "@/lib/db/schema";
import { extractTextSchema } from "@/lib/validation";
import type { ExtractedRequirement } from "@/lib/types";
import { AppError, ok, toErrorResponse, fail } from "@/lib/http";
import { clientKey, rateLimit, tooManyRequestsMsg } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT_LENGTH = 1_000_000;

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const rl = rateLimit(
    `extract:${session.orgId}:${clientKey(req)}`,
    { limit: 20, windowMs: 60_000 }
  );
  if (!rl.ok) return fail(tooManyRequestsMsg(), 429);

  try {
    const contentType = req.headers.get("content-type") || "";
    let text: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        throw new AppError("No file found in upload.", 400);
      }
      if (file.size > 20 * 1024 * 1024) {
        throw new AppError("That file is too large (max 20 MB).", 400);
      }
      text = await fileToText(file);
      if (text.trim().length < 20) {
        throw new AppError("Couldn't find readable text in that document.", 400);
      }
    } else {
      const body = extractTextSchema.parse(await req.json());
      text = body.text;
    }

    if (text.length > MAX_TEXT_LENGTH) {
      throw new AppError("Document is too large to process.", 400);
    }

    const result = await extractRequirements(text);

    // Persist the tender and every extracted requirement, scoped to the
    // signed-in user's organization.
    const tenderId = crypto.randomUUID();
    const now = new Date();

    await db.insert(tenders)
      .values({
        id: tenderId,
        orgId: session.orgId,
        title: result.document_title,
        issuingBody: result.issuing_body,
        submissionDeadline: result.submission_deadline,
        status: "in_progress",
        rawText: text.slice(0, 50_000),
        createdBy: session.userId,
        createdAt: now,
      });

    const persistedRequirements: ExtractedRequirement[] = [];
    for (const r of result.requirements) {
      const id = crypto.randomUUID();
      await db.insert(requirements)
        .values({
          id,
          tenderId,
          category: r.category,
          requirementText: r.requirement_text,
          sourcePage: r.source_page,
          sourceSnippet: r.source_snippet,
          isMandatory: r.is_mandatory,
          evaluationWeight: r.evaluation_weight,
          status: "not_started",
          keywords: r.keywords,
        });
      persistedRequirements.push({ ...r, id }); // swap the model's throwaway id for the real DB id
    }

    return ok({
      ...result,
      tender_id: tenderId,
      requirements: persistedRequirements,
    });
  } catch (err) {
    console.error("Extraction failed:", err);
    return toErrorResponse(err, "Extraction failed.");
  }
}

