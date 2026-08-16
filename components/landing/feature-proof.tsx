"use client";

import { Reveal } from "@/components/ui/reveal";
import { CircleCheck, Circle, BookOpen } from "lucide-react";

export function FeatureProof() {
  return (
    <section id="proof" className="px-6 py-20 border-t border-slate-line">
      <div className="mx-auto max-w-6xl space-y-20">
        {/* Compliance matrix proof */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <Reveal className="order-2 lg:order-1">
            <div className="rounded-xl border border-slate-line bg-surface overflow-hidden shadow-[var(--shadow-floating)]">
              <div className="px-5 py-3 border-b border-slate-line flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wide text-slate">
                  Compliance matrix
                </span>
                <span className="text-[10px] font-mono text-slate bg-paper border border-slate-line rounded-full px-2 py-0.5">
                  21 / 21 requirements
                </span>
              </div>
              <div className="divide-y divide-slate-line">
                <MatrixRow
                  done
                  category="technical"
                  text="The proposed solution must meet the technical specifications in the Bid Data Sheet, with no unauthorized alternatives."
                />
                <MatrixRow
                  done
                  category="financial"
                  text="Bid must remain valid for the period specified in the Bid Data Sheet."
                />
                <MatrixRow
                  category="administrative"
                  text="Notarized affidavit confirming the firm is not blacklisted by any government agency."
                />
              </div>
            </div>
          </Reveal>

          <Reveal className="order-1 lg:order-2" delay={0.05}>
            <h3 className="font-display text-2xl lg:text-3xl font-medium tracking-tight text-ink">
              The compliance matrix is the deliverable
            </h3>
            <p className="mt-4 text-slate leading-relaxed">
              Extraction is exhaustive, not a “key points” summary. Long
              documents are broken into overlapping chunks and every chunk is
              mined separately — a real 40-page section yields 15–50+ distinct
              checkable requirements, each tied to a verbatim source quote.
            </p>
            <p className="mt-3 text-slate leading-relaxed">
              Track each one through submission: not started, in progress,
              answered, reviewed. Nothing falls through silently.
            </p>
          </Reveal>
        </div>

        {/* Grounded drafting proof */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <h3 className="font-display text-2xl lg:text-3xl font-medium tracking-tight text-ink">
              Drafts are cited, not guessed
            </h3>
            <p className="mt-4 text-slate leading-relaxed">
              A draft is only generated from content your team actually holds —
              certifications, case studies, warranty terms, past performance.
              Every answer carries the “from:” chip for what it was grounded in.
            </p>
            <p className="mt-3 text-slate leading-relaxed">
              When nothing matches closely enough, Bidently says so instead of
              inventing a confident lie. A flagged content gap is better than a
              fabricated compliance answer.
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="rounded-xl border border-slate-line bg-surface overflow-hidden shadow-[var(--shadow-floating)]">
              <div className="px-5 py-3 border-b border-slate-line flex items-center gap-2">
                <BookOpen className="size-3.5 text-slate" strokeWidth={1.5} />
                <span className="text-xs font-mono uppercase tracking-wide text-slate">
                  Drafted answer
                </span>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-sm text-ink leading-relaxed">
                  Our firm holds current ISO/IEC 27001:2022 certification and we
                  are an authorized reseller for the OEMs we bid with, able to
                  provide a manufacturer authorization letter dated within 30
                  days of submission.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-mono text-verified bg-verified-soft rounded-full px-2 py-0.5">
                    from: ISO 27001 &amp; Manufacturer Certifications
                  </span>
                  <span className="text-[10px] font-mono text-verified bg-verified-soft rounded-full px-2 py-0.5">
                    from: NGFW Deployment Case Study
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate">
                  <CircleCheck className="size-3.5 text-verified" /> Grounded —
                  every answer traced to its source
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const CATEGORY_STYLE: Record<string, string> = {
  technical: "border-ink/25 text-ink",
  financial: "border-ember/40 text-ember",
  administrative: "border-attention/40 text-attention",
};

function MatrixRow({
  done,
  category,
  text,
}: {
  done?: boolean;
  category: string;
  text: string;
}) {
  return (
    <div className="px-5 py-3 flex items-start gap-3">
      {done ? (
        <CircleCheck className="size-4 text-verified shrink-0 mt-0.5" />
      ) : (
        <Circle className="size-4 text-slate/50 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <span
          className={`inline-block text-[10px] font-mono uppercase tracking-wide border rounded-full px-2 py-0.5 mb-1.5 ${
            CATEGORY_STYLE[category] ?? "border-slate-line text-slate"
          }`}
        >
          {category}
        </span>
        <p className="text-sm text-ink leading-relaxed">{text}</p>
      </div>
    </div>
  );
}