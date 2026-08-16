"use client";

import { motion } from "framer-motion";
import { enterTransition, stateTransition } from "@/lib/motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const CITATION_TEXT = '"Bidder must submit a bid security in the form of a call deposit or bank guarantee..."';

export function LandingHero() {
  const reduce = useReducedMotion();

  return (
    <section className="px-6 pt-24 pb-20 lg:pt-32 lg:pb-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 24 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={enterTransition()}
          >
            <h1 className="font-display text-[2.6rem] lg:text-[3.4rem] leading-[1.08] tracking-tight font-medium text-ink">
              Every tender requirement,{" "}
              <span className="text-ember">traced to the page</span>
            </h1>
            <p className="mt-5 text-[1.05rem] text-slate leading-relaxed max-w-lg">
              Upload an RFP, a PPRA standard document, or a World Bank
              solicitation. Bidently extracts every checkable requirement
              into a compliance matrix — not a summary — and drafts answers
              grounded only in your content library, with every source cited.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="/app"
                className="inline-flex items-center gap-2 rounded-md bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-ember transition-colors shadow-[var(--shadow-hover)] hover:shadow-[var(--shadow-floating)] active:scale-[0.97]"
              >
                Start free
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-md border border-slate-line bg-surface px-5 py-2.5 text-sm text-slate hover:border-ember/50 hover:text-ink transition-colors shadow-[var(--shadow-resting)]"
              >
                How it works
              </a>
            </div>
          </motion.div>

          {/* Compliance matrix mockup */}
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 32 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={enterTransition(0.15)}
            className="rounded-xl border border-slate-line bg-surface overflow-hidden shadow-[var(--shadow-floating)]"
          >
            {/* Mock header */}
            <div className="px-5 pt-4 pb-3 border-b border-slate-line">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-semibold tracking-tight text-ink">
                  Procurement of Network Security Gateway
                </span>
                <span className="text-[10px] font-mono uppercase text-slate bg-paper px-2 py-0.5 rounded-full border border-slate-line">
                  6 requirements
                </span>
              </div>
              <p className="text-xs text-slate mt-0.5">
                Federal Board of Revenue · Deadline: 14 days
              </p>
            </div>

            {/* Mock requirement rows */}
            <div className="divide-y divide-slate-line">
              <MockRow
                category="financial"
                label="mandatory"
                text="Bidder must submit a bid security in the form of a call deposit or bank guarantee for the full tender amount."
                expanded={false}
              />
              <MockRow
                category="legal"
                label="mandatory"
                text="Bidder must provide documentary evidence of manufacturer authorization for goods it does not manufacture itself."
                expanded={false}
              />
              <MockRow
                category="administrative"
                label="mandatory"
                text="The firm must submit an affidavit confirming it has not been blacklisted by any government or semi-government agency."
                expanded={true}
                citation={CITATION_TEXT}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const CATEGORY_STYLES: Record<string, string> = {
  financial: "border-ember/40 text-ember bg-ember-soft/40",
  legal: "border-verified/40 text-verified bg-verified-soft/40",
  administrative: "border-attention/40 text-attention bg-attention-soft/40",
};

function MockRow({
  category,
  label,
  text,
  expanded,
  citation,
}: {
  category: string;
  label: string;
  text: string;
  expanded: boolean;
  citation?: string;
}) {
  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <span
          className={`text-[10px] font-mono uppercase tracking-wide border rounded-full px-2 py-0.5 ${
            CATEGORY_STYLES[category] ?? "border-slate-line text-slate"
          }`}
        >
          {category}
        </span>
        <span className="text-[10px] font-mono uppercase text-slate">{label}</span>
      </div>
      <p className="text-sm text-ink leading-relaxed">{text}</p>
      {expanded && citation && (
        <motion.div
          initial={false}
          animate={{ height: "auto", opacity: 1 }}
          transition={stateTransition()}
          className="mt-2 rounded-md bg-ember-soft/50 border-l-2 border-ember px-3.5 py-2.5"
        >
          <p className="text-xs text-ink/80 font-mono leading-relaxed">
            &ldquo;{citation}&rdquo;
          </p>
        </motion.div>
      )}
    </div>
  );
}