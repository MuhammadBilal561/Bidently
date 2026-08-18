"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, FileText, CheckCircle2, LibraryBig } from "lucide-react";
import { api } from "@/lib/api-client";

interface Analytics {
  org: { library_count: number };
  tenders: {
    total: number;
    by_status: Record<string, number>;
    win_rate: number | null;
  };
  requirements: {
    total: number;
    by_status: Record<string, number>;
    answered: number;
    coverage: number;
    drafts_generated: number;
    draft_coverage: number;
  };
}

const TENDER_PIPELINE = [
  { key: "identified", label: "Identified", color: "bg-slate/30" },
  { key: "in_progress", label: "In progress", color: "bg-ember-soft" },
  { key: "submitted", label: "Submitted", color: "bg-ember/60" },
  { key: "won", label: "Won", color: "bg-verified" },
  { key: "lost", label: "Lost", color: "bg-attention/60" },
] as const;

const REQ_STAGES = [
  { key: "not_started", label: "Not started", color: "bg-slate/30" },
  { key: "in_progress", label: "In progress", color: "bg-ember-soft" },
  { key: "answered", label: "Answered", color: "bg-ember/60" },
  { key: "reviewed", label: "Reviewed", color: "bg-verified" },
] as const;

export function AnalyticsPanel() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAnalytics()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load analytics."));
  }, []);

  if (error) {
    return <p className="text-sm text-attention">{error}</p>;
  }
  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate">
        <Loader2 className="size-4 animate-spin" /> Loading analytics…
      </div>
    );
  }

  const pipelineMax = Math.max(
    1,
    ...Object.values(data.tenders.by_status).map((n) => n as number)
  );
  const reqMax = Math.max(
    1,
    ...Object.values(data.requirements.by_status).map((n) => n as number)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-medium text-ink">Analytics</h2>
        <p className="text-sm text-slate mt-1">
          A live pulse of your pipeline and draft progress. Every number is
          recomputed from your saved data.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<FileText className="size-4" />} label="Tenders" value={String(data.tenders.total)} />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Win rate"
          value={data.tenders.win_rate === null ? "—" : `${data.tenders.win_rate}%`}
        />
        <StatCard
          icon={<CheckCircle2 className="size-4" />}
          label="Reqs answered"
          value={`${data.requirements.answered}/${data.requirements.total}`}
        />
        <StatCard
          icon={<LibraryBig className="size-4" />}
          label="Library items"
          value={String(data.org.library_count)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-line bg-surface p-5">
          <h3 className="text-xs font-mono uppercase tracking-wide text-slate mb-4">
            Opportunity pipeline
          </h3>
          <div className="space-y-3">
            {TENDER_PIPELINE.map((stage) => {
              const count = (data.tenders.by_status[stage.key] as number) ?? 0;
              const width = Math.round((count / pipelineMax) * 100);
              return (
                <div key={stage.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate">{stage.label}</span>
                    <span className="font-mono text-ink">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-paper border border-slate-line overflow-hidden">
                    <div className={`h-full rounded-full ${stage.color}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-slate-line bg-surface p-5">
          <h3 className="text-xs font-mono uppercase tracking-wide text-slate mb-4">
            Requirement progress
          </h3>
          <div className="space-y-3">
            {REQ_STAGES.map((stage) => {
              const count = (data.requirements.by_status[stage.key] as number) ?? 0;
              const width = Math.round((count / reqMax) * 100);
              return (
                <div key={stage.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate">{stage.label}</span>
                    <span className="font-mono text-ink">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-paper border border-slate-line overflow-hidden">
                    <div className={`h-full rounded-full ${stage.color}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-md bg-verified-soft px-3 py-3">
              <div className="font-mono text-xl text-verified">{data.requirements.coverage}%</div>
              <div className="text-[11px] text-verified">requirements answered</div>
            </div>
            <div className="rounded-md bg-ember-soft px-3 py-3">
              <div className="font-mono text-xl text-ember">{data.requirements.draft_coverage}%</div>
              <div className="text-[11px] text-ember">drafts generated</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-line bg-surface p-4">
      <div className="flex items-center gap-1.5 text-slate mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="font-mono text-2xl text-ink">{value}</div>
    </div>
  );
}

