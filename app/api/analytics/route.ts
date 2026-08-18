import { NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenders, requirements, draftAnswers, contentLibraryItems } from "@/lib/db/schema";
import { ok } from "@/lib/http";

export const runtime = "nodejs";

// Aggregates org-level metrics for the analytics dashboard.
// Query volume is tiny at this scale (a handful of tables scoped by orgId),
// so computing counts in JS is simpler and equally correct as SQL GROUP BY.

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const orgId = session.orgId;

  const tenderRows = await db.select().from(tenders).where(eq(tenders.orgId, orgId));
  const tenderIds = tenderRows.map((t) => t.id);
  const reqRows = tenderIds.length
    ? await db.select().from(requirements).where(inArray(requirements.tenderId, tenderIds))
    : [];
  const reqIds = reqRows.map((r) => r.id);
  // Count drafts only for this org's requirements — never by loading every row
  // across all organizations into memory.
  const draftCount = reqIds.length
    ? (await db
        .select({ reqId: draftAnswers.requirementId })
        .from(draftAnswers)
        .where(inArray(draftAnswers.requirementId, reqIds))).length
    : 0;
  const libraryRows = await db
    .select()
    .from(contentLibraryItems)
    .where(eq(contentLibraryItems.orgId, orgId));
  const libraryCount = libraryRows.length;

  const statusCounts = (statuses: string[], rows: { status: string }[]) =>
    Object.fromEntries(statuses.map((s) => [s, rows.filter((r) => r.status === s).length]));

  const TENDER_STATUSES = ["identified", "in_progress", "submitted", "won", "lost"];
  const REQ_STATUSES = ["not_started", "in_progress", "answered", "reviewed"];

  const tendersByStatus = statusCounts(TENDER_STATUSES, tenderRows);
  const requirementsByStatus = statusCounts(REQ_STATUSES, reqRows);

  const decided = (tendersByStatus.won ?? 0) + (tendersByStatus.lost ?? 0);

  return ok({
    org: {
      library_count: libraryCount,
    },
    tenders: {
      total: tenderRows.length,
      by_status: tendersByStatus,
      win_rate: decided > 0 ? Math.round((tendersByStatus.won / decided) * 100) : null,
    },
    requirements: {
      total: reqRows.length,
      by_status: requirementsByStatus,
      answered: requirementsByStatus.answered + requirementsByStatus.reviewed,
      coverage: reqRows.length
        ? Math.round(
            ((requirementsByStatus.answered + requirementsByStatus.reviewed) /
              reqRows.length) *
              100
          )
        : 0,
      drafts_generated: draftCount,
      draft_coverage: reqRows.length
        ? Math.round((draftCount / reqRows.length) * 100)
        : 0,
    },
  });
}
