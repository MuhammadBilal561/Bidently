"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { motionTokens } from "@/lib/motion";
import { LandingHero } from "./landing-hero";
import { HowItWorks } from "./how-it-works";
import { FeatureProof } from "./feature-proof";
import { TrustSection } from "./trust-section";
import { LandingFooter } from "./landing-footer";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export default function LandingPage() {
  const reduce = useReducedMotion();

  useEffect(() => {
    // The Google OAuth callback lands here with `?mfa=1` when the signed-in
    // user has two-factor enabled (a pending-MFA cookie is set). The auth
    // gate + MFA prompt live at /app, so forward them there.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mfa") === "1") {
        window.location.replace("/app?mfa=1");
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink antialiased">
      {/* Top nav */}
      <motion.header
        initial={reduce ? undefined : { opacity: 0, y: -12 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.durations.slow, ease: motionTokens.easing.entrance }}
        className="sticky top-0 z-20 border-b border-slate-line bg-paper/80 backdrop-blur-sm"
      >
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-display text-xl font-semibold tracking-tight text-ink">
            Bid<span className="text-ember">ently</span>
          </a>
          <nav className="flex items-center gap-5 text-sm">
            <a href="#how-it-works" className="hidden sm:inline text-slate hover:text-ink transition-colors">
              How it works
            </a>
            <a href="#proof" className="hidden sm:inline text-slate hover:text-ink transition-colors">
              The evidence
            </a>
            <a
              href="/app"
              className="rounded-md border border-slate-line px-3 py-1.5 text-slate hover:border-ember/50 hover:text-ink transition-colors shadow-[var(--shadow-resting)]"
            >
              Sign in
            </a>
            <a
              href="/app"
              className="rounded-md bg-ink text-paper px-3 py-1.5 hover:bg-ember transition-colors shadow-[var(--shadow-hover)] active:scale-[0.98]"
            >
              Start free
            </a>
          </nav>
        </div>
      </motion.header>

      <main>
        <LandingHero />
        <HowItWorks />
        <FeatureProof />
        <TrustSection />
        <LandingFooter />
      </main>
    </div>
  );
}