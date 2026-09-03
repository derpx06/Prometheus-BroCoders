import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { ElementType, ReactNode } from 'react'
import { fadeIn, fadeUp, stagger, VIEWPORT } from '../../lib/motion'

/**
 * Scroll-triggered entrance.
 *
 * Two weights only — `primary` for the thing the section is about, `secondary` for
 * everything supporting it. Hierarchy in motion, matching hierarchy in type.
 */
export function Reveal({
  children,
  weight = 'secondary',
  delay = 0,
  as = 'div',
  className,
}: {
  children: ReactNode
  weight?: 'primary' | 'secondary'
  delay?: number
  as?: ElementType
  className?: string
}) {
  const reduced = useReducedMotion()
  const Component = motion[as as 'div'] ?? motion.div
  const variants: Variants = weight === 'primary' ? fadeUp : fadeIn

  return (
    <Component
      className={className}
      variants={reduced ? undefined : variants}
      initial={reduced ? undefined : 'hidden'}
      whileInView={reduced ? undefined : 'show'}
      viewport={VIEWPORT}
      transition={{ delay }}
    >
      {children}
    </Component>
  )
}

/** Wraps a list so its children arrive in sequence. Children must be <RevealItem>. */
export function RevealGroup({
  children,
  each = 0.055,
  delay = 0,
  className,
  as = 'div',
}: {
  children: ReactNode
  each?: number
  delay?: number
  className?: string
  as?: ElementType
}) {
  const reduced = useReducedMotion()
  const Component = motion[as as 'div'] ?? motion.div

  return (
    <Component
      className={className}
      variants={reduced ? undefined : stagger(each, delay)}
      initial={reduced ? undefined : 'hidden'}
      whileInView={reduced ? undefined : 'show'}
      viewport={VIEWPORT}
    >
      {children}
    </Component>
  )
}

export function RevealItem({
  children,
  className,
  weight = 'secondary',
  as = 'div',
}: {
  children: ReactNode
  className?: string
  weight?: 'primary' | 'secondary'
  as?: ElementType
}) {
  const reduced = useReducedMotion()
  const Component = motion[as as 'div'] ?? motion.div
  return (
    <Component className={className} variants={reduced ? undefined : weight === 'primary' ? fadeUp : fadeIn}>
      {children}
    </Component>
  )
}
