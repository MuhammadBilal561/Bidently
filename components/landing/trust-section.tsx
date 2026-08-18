"use client";

import { Reveal } from "@/components/ui/reveal";
import { LockKeyhole } from "lucide-react";

export function TrustSection() {
  return (
    <section className="px-6 py-20 border-t border-slate-line bg-surface/40">
      <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 items-start">
        <Reveal>
          <h3 className="font-display text-2xl lg:text-3xl font-medium tracking-tight text-ink">
            Built for documents that expect to be answered
          </h3>
          <p className="mt-4 text-slate leading-relaxed">
            Bidently starts with PPRA National Standard Bidding Documents and
            World Bank Standard Procurement Documents, and generalizes to any
            RFP or solicitation. The grounded/citation mechanic — every AI
            answer traced to its exact source — is the point, not a feature.
          </p>
          <p className="mt-3 text-slate leading-relaxed">
            Keep the extraction honest and the drafting truthful: when the
            content library can&apos;t back an answer, it&apos;s flagged as a gap instead
            of being invented.
          </p>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TrustCard
              title="Your data stays yours"
              body="Accounts and documents live in your own database — the local app stores everything in a private SQLite file, and a production deployment points at your own Postgres."
              icon={<LockKeyhole className="size-4" />}
            />
            <TrustCard
              title="Every answer is evidence"
              body='No summaries, no curated "highlights". Each requirement is a row with its verbatim source quote, its category, and its mandatory/optional status.'
              icon={<span className="text-sm leading-none">§</span>}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function TrustCard({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-line bg-surface p-5 shadow-[var(--shadow-resting)]">
      <div className="flex items-center gap-2 text-ember mb-2">{icon}</div>
      <h4 className="font-display text-base font-semibold tracking-tight text-ink">
        {title}
      </h4>
      <p className="mt-1.5 text-sm text-slate leading-relaxed">{body}</p>
    </div>
  );
}