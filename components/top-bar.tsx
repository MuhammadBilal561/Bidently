"use client";

import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import type { AuthUser } from "@/lib/api-client";
import { stateTransition } from "@/lib/motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export function TopBar({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const reduce = useReducedMotion();

  return (
    <motion.header
      initial={reduce ? undefined : { opacity: 0, y: -10 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={stateTransition()}
      className="sticky top-0 z-20 border-b border-slate-line bg-paper/80 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[22px] font-semibold tracking-tight text-ink">
            Bid<span className="text-ember">ently</span>
          </span>
          <span className="hidden sm:inline text-xs text-slate font-mono">
            {"/// bid & tender intelligence"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate">{user.email}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-slate hover:text-ember hover:bg-ember-soft/40 transition-colors shadow-[var(--shadow-resting)] active:scale-[0.96]"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </div>
    </motion.header>
  );
}
