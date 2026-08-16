import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
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
    .orderBy(desc(tenders.createdAt))
    .all();

  const withCounts: {
    id: string;
    title: string;
    issuing_body: string | null;
    submission_deadline: string | null;
    status: string;
    created_at: Date;
    requirement_count: number;
  }[] = [];
  for (const t of rows) {
    const reqRows = await db
      .select()
      .from(requirements)
      .where(eq(requirements.tenderId, t.id))
      .all();
    withCounts.push({
      id: t.id,
      title: t.title,
      issuing_body: t.issuingBody,
      submission_deadline: t.submissionDeadline,
      status: t.status,
      created_at: t.createdAt,
      requirement_count: reqRows.length,
    });
  }

  return NextResponse.json({ tenders: withCounts });
}
