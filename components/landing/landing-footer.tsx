"use client";

import { Reveal } from "@/components/ui/reveal";

export function LandingFooter() {
  return (
    <>
      {/* Final CTA */}
      <section className="px-6 py-24 border-t border-slate-line">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="font-display text-3xl lg:text-4xl font-medium tracking-tight text-ink">
              Start with the document you already have
            </h2>
            <p className="mt-4 text-slate leading-relaxed">
              Sign up free — no credit card, nothing to configure. Upload a
              tender, get your compliance matrix, and keep it forever in your
              own workspace.
            </p>
            <div className="mt-8 flex justify-center">
              <a
                href="/app"
                className="inline-flex items-center gap-2 rounded-md bg-ink text-paper px-6 py-3 text-sm font-medium hover:bg-ember transition-colors shadow-[var(--shadow-hover)] hover:shadow-[var(--shadow-floating)] active:scale-[0.97]"
              >
                Create your workspace
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-slate-line px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            Bid<span className="text-ember">ently</span>
          </span>
          <p className="text-xs text-slate">
            AI bid &amp; tender intelligence — every answer traced to its source.
          </p>
        </div>
      </footer>
    </>
  );
}