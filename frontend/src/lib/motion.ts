import type { Transition, Variants } from 'framer-motion'

/**
 * The motion system.
 *
 * Three speeds, two curves, one spring. Every animation in the product picks from this
 * file rather than inventing its own numbers, which is what keeps unrelated screens
 * feeling like the same piece of software.
 *
 * The rule for using them: an animation must answer "what changed?". If it does not,
 * it should not exist.
 */

export const DUR = {
  /** Direct feedback — press states, hovers, tab underlines. */
  fast: 0.13,
  /** The default. Entrances, state swaps, expanding panels. */
  base: 0.2,
  /** Deliberate — modals, page changes, the processing sequence. */
  slow: 0.38,
} as const

export const EASE = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
}

/** For anything that should feel physical: dropped files, flipped cards, dragged nodes. */
export const SPRING: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 260, damping: 30 }

export const t = {
  fast: { duration: DUR.fast, ease: EASE.out },
  base: { duration: DUR.base, ease: EASE.out },
  slow: { duration: DUR.slow, ease: EASE.out },
} satisfies Record<string, Transition>

/* ---------------------------------------------------------------- variants */

/** Primary content: a real entrance. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE.out } },
}

/** Secondary content: present, but not asking for attention. */
export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: { duration: DUR.base, ease: EASE.out } },
}

/** Parent wrapper: children arrive in sequence rather than all at once. */
export function stagger(each = 0.055, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: each, delayChildren: delay } },
  }
}

/** Page-level transition used by the app shell. Movement stays under 8px on purpose. */
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: DUR.base, ease: EASE.out },
}

/** Shared viewport config so every scroll reveal triggers at the same point. */
export const VIEWPORT = { once: true, amount: 0.35, margin: '0px 0px -80px 0px' } as const
