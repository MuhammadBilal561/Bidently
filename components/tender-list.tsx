"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api-client";
import { useReducedMotion } from "@/lib/use-reduced-motion";

interface TenderSummary {
  id: string;
  title: string;
  issuing_body: string | null;
  submission_deadline: string | null;
  status: string;
  requirement_count: number;
}

export function TenderList({
  onOpen,
  onNew,
  refreshKey,
}: {
  onOpen: (id: string) => void;
  onNew: () => void;
  refreshKey: number;
}) {
  const [tenders, setTenders] = useState<TenderSummary[] | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    api
      .listTenders()
      .then((d) => setTenders(d.tenders))
      .catch(() => setTenders([]));
  }, [refreshKey]);

  if (tenders === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate py-6">
        <Loader2 className="size-4 animate-spin" /> Loading your workspace…
      </div>
    );
  }

  if (tenders.length === 0) {
    return null; // nothing saved yet — let the empty upload panel be the focus
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono uppercase tracking-wide text-slate">
          Your tenders ({tenders.length})
        </h2>
        <button
          onClick={onNew}
          className="flex items-center gap-1 text-xs text-slate hover:text-ember transition-colors"
        >
          <Plus className="size-3.5" /> New
        </button>
      </div>
      <div className="rounded-lg border border-slate-line bg-surface divide-y divide-slate-line overflow-hidden shadow-[var(--shadow-resting)]">
        {tenders.map((t, i) => (
          <motion.div
            key={t.id}
            initial={reduce ? undefined : { opacity: 0, y: 6 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04, ease: "easeOut" }}
          >
            <button
              onClick={() => onOpen(t.id)}
              className="w-full text-left px-4 py-3 flex items-center justify-between gap-4 hover:bg-paper hover:shadow-[var(--shadow-hover)] transition-all active:scale-[0.995]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="size-4 text-slate shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <div className="text-sm text-ink font-medium truncate">{t.title}</div>
                  <div className="text-xs text-slate truncate">
                    {t.issuing_body || "Issuing body not detected"}
                  </div>
                </div>
              </div>
              <span className="shrink-0 text-xs font-mono text-slate">
                {t.requirement_count} reqs
              </span>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
