import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { Concept, Edge } from '../../lib/types'
import { DUR, EASE, SPRING } from '../../lib/motion'
import { titleCase } from '../../lib/format'
import { cn } from '../../lib/cn'

export type MasteryBand = 'mastered' | 'familiar' | 'review' | 'untouched'

/**
 * Band from the *displayed* percentage, not the raw float — otherwise 0.7951 renders as
 * "80%" in the amber band right next to an 82% in green, which reads as a bug.
 */
export function bandFor(mastery: number, attempts = 1): MasteryBand {
  if (!attempts) return 'untouched'
  const shown = Math.round(mastery * 100)
  if (shown >= 80) return 'mastered'
  if (shown >= 55) return 'familiar'
  return 'review'
}

export function bandOf(c: Pick<Concept, 'mastery' | 'attempts'>): MasteryBand {
  return bandFor(c.mastery, c.attempts)
}

export const BAND: Record<MasteryBand, { label: string; color: string; ring: string }> = {
  mastered: { label: 'Mastered', color: 'var(--color-good)', ring: 'var(--color-good)' },
  familiar: { label: 'Familiar', color: 'var(--color-warn)', ring: 'var(--color-warn)' },
  review: { label: 'Needs review', color: 'var(--color-bad)', ring: 'var(--color-bad)' },
  untouched: { label: 'Not started', color: 'var(--color-ink-4)', ring: 'var(--color-ink-5)' },
}

const COL_W = 168
const ROW_H = 92
const PAD_X = 58
const PAD_Y = 46
const R = 15

interface Node {
  id: number
  name: string
  mastery: number
  attempts: number
  band: MasteryBand
  weight: number
  x: number
  y: number
}

/** Deterministic jitter, so the layout is organic but identical on every render. */
function jitter(seed: number, range: number): number {
  const n = Math.sin(seed * 12.9898) * 43758.5453
  return (n - Math.floor(n) - 0.5) * range
}

/**
 * The prerequisite graph.
 *
 * Nodes are laid out in dependency layers left to right — an edge always runs from a
 * concept to one that needs it first. The ring around each node is its mastery, so the
 * shape of what you know is legible at a glance without reading a single number.
 */
export function KnowledgeGraph({
  concepts,
  edges,
  selected,
  onSelect,
  max = 24,
  height,
  className,
}: {
  concepts: Concept[]
  edges: Edge[]
  selected?: number | null
  onSelect?: (id: number | null) => void
  max?: number
  height?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const [hover, setHover] = useState<number | null>(null)

  const { nodes, links, width, canvasHeight } = useMemo(() => {
    const keep = concepts.slice(0, max)
    const ids = new Set(keep.map((c) => c.id))
    const rel = edges.filter((e) => ids.has(e.source) && ids.has(e.target))

    // Longest-path layering. The engine guarantees a DAG, so this settles quickly.
    const depth = new Map<number, number>(keep.map((c) => [c.id, 0]))
    for (let pass = 0; pass < keep.length; pass++) {
      let moved = false
      for (const e of rel) {
        const next = (depth.get(e.source) ?? 0) + 1
        if (next > (depth.get(e.target) ?? 0)) {
          depth.set(e.target, next)
          moved = true
        }
      }
      if (!moved) break
    }

    const layers = new Map<number, Concept[]>()
    for (const c of keep) {
      const d = depth.get(c.id) ?? 0
      layers.set(d, [...(layers.get(d) ?? []), c])
    }

    const tallest = Math.max(...[...layers.values()].map((l) => l.length), 1)
    const canvasHeight = height ?? tallest * ROW_H + PAD_Y * 2 - 30
    const maxEvidence = Math.max(...keep.map((c) => c.evidence.length), 1)

    const placed: Node[] = []
    for (const [layer, group] of [...layers.entries()].sort((a, b) => a[0] - b[0])) {
      const span = (group.length - 1) * ROW_H
      const top = (canvasHeight - span) / 2
      group.forEach((c, i) => {
        placed.push({
          id: c.id,
          name: c.name,
          mastery: c.mastery,
          attempts: c.attempts,
          band: bandOf(c),
          weight: 0.7 + 0.3 * (c.evidence.length / maxEvidence),
          x: PAD_X + layer * COL_W + jitter(c.id + 1, 14),
          y: top + i * ROW_H + jitter(c.id + 7, 18),
        })
      })
    }

    const byId = new Map(placed.map((n) => [n.id, n]))
    return {
      nodes: placed,
      links: rel
        .map((e) => ({ a: byId.get(e.source)!, b: byId.get(e.target)!, w: e.weight }))
        .filter((l) => l.a && l.b),
      width: PAD_X * 2 + Math.max(...placed.map((n) => n.x)) - PAD_X + COL_W * 0.2,
      canvasHeight,
    }
  }, [concepts, edges, max, height])

  const focus = hover ?? selected ?? null
  const neighbours = useMemo(() => {
    if (focus === null) return null
    const set = new Set<number>([focus])
    for (const l of links) {
      if (l.a.id === focus) set.add(l.b.id)
      if (l.b.id === focus) set.add(l.a.id)
    }
    return set
  }, [focus, links])

  const dimmed = (id: number) => neighbours !== null && !neighbours.has(id)

  return (
    <div className={cn('no-scrollbar overflow-x-auto overflow-y-hidden', className)}>
      <div
        className="relative"
        style={{ width: Math.max(width, 320), height: canvasHeight }}
        onMouseLeave={() => setHover(null)}
      >
        <svg
          className="absolute inset-0 overflow-visible"
          width={Math.max(width, 320)}
          height={canvasHeight}
          aria-hidden
        >
          {links.map((l, i) => {
            const active = focus !== null && (l.a.id === focus || l.b.id === focus)
            const mx = (l.a.x + l.b.x) / 2
            return (
              <motion.path
                key={i}
                d={`M ${l.a.x} ${l.a.y} C ${mx} ${l.a.y}, ${mx} ${l.b.y}, ${l.b.x} ${l.b.y}`}
                fill="none"
                stroke={active ? 'var(--color-accent)' : 'var(--color-ink-4)'}
                strokeWidth={active ? 1.6 : 1}
                strokeLinecap="round"
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: focus === null ? 0.34 : active ? 0.95 : 0.09,
                }}
                transition={{
                  pathLength: { duration: 0.75, delay: 0.12 + (i % 8) * 0.05, ease: EASE.out },
                  opacity: { duration: DUR.base, ease: EASE.out },
                }}
              />
            )
          })}
        </svg>

        {nodes.map((n, i) => {
          const isFocus = focus === n.id
          const isSelected = selected === n.id
          const band = BAND[n.band]
          const size = R * 2 * n.weight

          return (
            <motion.button
              key={n.id}
              type="button"
              aria-label={`${titleCase(n.name)} — ${band.label}, ${Math.round(n.mastery * 100)} percent`}
              aria-pressed={isSelected}
              onMouseEnter={() => setHover(n.id)}
              onFocus={() => setHover(n.id)}
              onBlur={() => setHover(null)}
              onClick={() => onSelect?.(isSelected ? null : n.id)}
              initial={reduced ? false : { opacity: 0, scale: 0.4 }}
              animate={{
                opacity: dimmed(n.id) ? 0.28 : 1,
                scale: isFocus ? 1.14 : 1,
              }}
              transition={{
                opacity: { duration: DUR.base, ease: EASE.out },
                scale: SPRING,
                default: { delay: 0.04 * i },
              }}
              style={{ left: n.x, top: n.y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 outline-none"
            >
              {/* Halo — only on the focused node, and only ever this subtle */}
              <AnimatePresence>
                {isFocus && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: DUR.base, ease: EASE.out }}
                    style={{ width: size + 22, height: size + 22 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10"
                  />
                )}
              </AnimatePresence>

              {/* Node: a filled core inside a mastery ring */}
              <span
                style={{ width: size, height: size }}
                className={cn(
                  'relative block rounded-full border bg-surface transition-colors duration-200',
                  isSelected ? 'border-accent' : isFocus ? 'border-line-strong' : 'border-line',
                )}
              >
                <svg
                  viewBox="0 0 40 40"
                  className="absolute inset-0 -rotate-90"
                  style={{ width: size, height: size }}
                  aria-hidden
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="var(--color-sunken)"
                    strokeWidth="4"
                  />
                  <motion.circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke={band.ring}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 16}
                    initial={reduced ? false : { strokeDashoffset: 2 * Math.PI * 16 }}
                    animate={{
                      strokeDashoffset: 2 * Math.PI * 16 * (1 - (n.attempts ? n.mastery : 0)),
                    }}
                    transition={{ duration: 0.8, delay: 0.25 + i * 0.03, ease: EASE.out }}
                  />
                </svg>
                <span
                  className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ background: band.color }}
                />
              </span>

              {/* Label */}
              <span
                className={cn(
                  'absolute top-[calc(100%+7px)] left-1/2 w-[104px] -translate-x-1/2 text-center text-[10.5px] leading-tight font-medium transition-colors duration-200',
                  isFocus ? 'text-ink' : 'text-ink-3',
                )}
              >
                <span className="line-clamp-2">{titleCase(n.name)}</span>
              </span>

              {/* Tooltip */}
              <AnimatePresence>
                {isFocus && (
                  <motion.span
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 2, scale: 0.98 }}
                    transition={{ duration: DUR.fast, ease: EASE.out }}
                    className="pointer-events-none absolute bottom-[calc(100%+11px)] left-1/2 z-20 flex -translate-x-1/2 flex-col items-start gap-0.5 rounded-[9px] bg-ink px-2.5 py-1.5 whitespace-nowrap shadow-md"
                  >
                    <span className="text-[11.5px] leading-tight font-semibold text-white">
                      {titleCase(n.name)}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10.5px] leading-tight text-white/70">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: band.color }}
                      />
                      {band.label}
                      {n.attempts > 0 && ` · ${Math.round(n.mastery * 100)}%`}
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export function GraphLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {(['mastered', 'familiar', 'review', 'untouched'] as const).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: BAND[k].color }} />
          {BAND[k].label}
        </span>
      ))}
    </div>
  )
}
