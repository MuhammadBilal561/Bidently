import { NextRequest, NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { tenders, requirements } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const rows = await db
    .select()
    .from(tenders)
    .where(eq(tenders.orgId, session.orgId))
    .orderBy(desc(tenders.createdAt));

  // Batch the requirement counts in a single query instead of N+1 per tender.
  const tenderIds = rows.map((t) => t.id);
  const countRows = tenderIds.length
    ? await db
        .select({ tenderId: requirements.tenderId })
        .from(requirements)
        .where(inArray(requirements.tenderId, tenderIds))
    : [];
  const counts = new Map<string, number>();
  for (const c of countRows) counts.set(c.tenderId, (counts.get(c.tenderId) ?? 0) + 1);

  const withCounts: {
    id: string;
    title: string;
    issuing_body: string | null;
    submission_deadline: string | null;
    status: string;
    created_at: Date;
    requirement_count: number;
  }[] = rows.map((t) => ({
    id: t.id,
    title: t.title,
    issuing_body: t.issuingBody,
    submission_deadline: t.submissionDeadline,
    status: t.status,
    created_at: t.createdAt,
    requirement_count: counts.get(t.id) ?? 0,
  }));

  return NextResponse.json({ tenders: withCounts });
}
