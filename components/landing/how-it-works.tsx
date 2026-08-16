"use client";

import { motion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { FileUp, ScanSearch, PenLine } from "lucide-react";

const STEPS = [
  {
    icon: FileUp,
    step: "01",
    title: "Upload",
    body: "Drop a PDF or paste a tender. PPRA standard documents, World Bank RFPs, or a plain solicitation — it doesn't need to be a standard template.",
    visual: (
      <div className="h-24 rounded-lg border border-dashed border-ember/40 bg-ember-soft/30 flex items-center justify-center">
        <motion.span
          initial={{ y: 0, opacity: 0.6 }}
          whileInView={{ y: [0, -6, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="text-xs font-mono text-ember"
        >
          tender.pdf
        </motion.span>
      </div>
    ),
  },
  {
    icon: ScanSearch,
    step: "02",
    title: "Extract",
    body: "Every checkable requirement becomes a row in a compliance matrix — categorized, flagged mandatory or optional, and quoted with its exact source text.",
    visual: (
      <div className="h-24 rounded-lg border border-slate-line bg-surface p-3 space-y-1.5">
        {[90, 70, 82].map((w, i) => (
          <motion.div
            key={i}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ duration: 0.4, delay: 0.1 * i }}
            style={{ originX: 0, width: `${w}%` }}
            className="h-2.5 rounded-sm bg-slate-line"
          />
        ))}
        <span className="block text-[10px] font-mono text-slate pt-0.5">
          +2 more requirements parsed
        </span>
      </div>
    ),
  },
  {
    icon: PenLine,
    step: "03",
    title: "Draft",
    body: "Answers are drafted only from your own content library and cited back to it — so a submission never sounds confident about something it can't prove.",
    visual: (
      <div className="h-24 rounded-lg border border-slate-line bg-surface p-3 flex flex-col justify-center">
        <div className="text-[10px] text-ink/70 leading-snug">
          “We will furnish the required bid security…”
        </div>
        <motion.span
          initial={{ scale: 0.9 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="mt-2 w-fit text-[10px] font-mono text-verified bg-verified-soft rounded-full px-2 py-0.5"
        >
          from: Corporate Registration & Compliance Statement
        </motion.span>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-20 border-t border-slate-line bg-surface/40">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="font-display text-3xl lg:text-4xl font-medium tracking-tight text-ink">
            Three steps, one compliance matrix
          </h2>
          <p className="mt-3 text-slate max-w-2xl leading-relaxed">
            No prompts to engineer, no “tell me what you need it to do.” You
            hand it the document; it hands you back the work.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.08}>
              <div className="rounded-xl border border-slate-line bg-surface p-5 h-full shadow-[var(--shadow-resting)]">
                {s.visual}
                <div className="mt-4 flex items-center gap-2">
                  <span className="font-mono text-xs text-ember">{s.step}</span>
                  <s.icon className="size-4 text-slate" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-lg font-semibold tracking-tight mt-1.5 text-ink">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-slate leading-relaxed">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}