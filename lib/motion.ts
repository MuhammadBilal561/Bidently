/**
 * Central motion tokens — the single source of truth for animation duration
 * and easing across the app. Components import these instead of inventing
 * ad-hoc durations, so the motion language stays consistent (per the design
 * upgrade: ~150ms micro-interactions, ~300ms panel/card, ease-out entrances,
 * ease-in-out state changes).
 *
 * Import from "motion/react" (Framer Motion) in components; use these tokens
 * via `transition={enterTransition(0.1)}` etc.
 */

export const motionTokens = {
  durations: {
    /** Micro-interactions: hover, press, toggles, chevron rotation. */
    fast: 0.15,
    /** Panel/card enter-exit, list items, expand/collapse. */
    medium: 0.3,
    /** Page-level / section reveals. */
    slow: 0.5,
  },
  easing: {
    /** Entrances: fast start, gentle settle (expo-out). */
    entrance: [0.16, 1, 0.3, 1] as const,
    /** State changes: symmetric in/out. */
    stateChange: [0.4, 0, 0.2, 1] as const,
  },
  /** Standard section-reveal translate (px) used with whileInView. */
  revealOffset: 24,
} as const;

/** Entrance transition factory — pass a delay (s) to stagger siblings. */
export function enterTransition(delay = 0) {
  return {
    duration: motionTokens.durations.slow,
    ease: motionTokens.easing.entrance,
    delay,
  };
}

/** State-change transition factory. */
export function stateTransition(duration = motionTokens.durations.medium) {
  return {
    duration,
    ease: motionTokens.easing.stateChange,
  };
}