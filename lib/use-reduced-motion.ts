"use client";

import { useEffect, useState } from "react";

/**
 * Reduced-motion hook that doesn't depend on a motion-library export — reads
 * `prefers-reduced-motion` directly via matchMedia and updates on change.
 * Components that animate should check this and skip animation when true.
 */
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduce;
}