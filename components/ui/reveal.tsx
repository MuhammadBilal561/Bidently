"use client";

import { motion } from "framer-motion";
import { motionTokens, enterTransition } from "@/lib/motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * One reveal pattern used consistently across the landing page: subtle
 * translate + fade when the section scrolls into view. `once: true` so it
 * doesn't re-animate on every scroll pass. Honours reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: motionTokens.revealOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={enterTransition(delay)}
    >
      {children}
    </motion.div>
  );
}