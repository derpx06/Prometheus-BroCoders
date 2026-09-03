import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { Pack } from '../../lib/types'
import { titleCase, pct } from '../../lib/format'
import { cn } from '../../lib/cn'

const COL_W = 190
const GAP_X = 48
const ROW_H = 54
const PILL_W = 176
const PILL_H = 36

interface Placed {
  id: number
  name: string
  mastery: number
  x: number
  y: number
  layer: number
}

/**
 * The prerequisite graph, laid out left to right in dependency layers.
 *
 * This is the one visual in the product that is genuinely structural rather than
 * decorative: an edge means the engine will not serve you the right-hand concept until
 * the left-hand one is holding.
 */
export function ConceptMap({ pack, max = 14 }: { pack: Pack; max?: number }) {
  const [hover, setHover] = useState<number | null>(null)

  const { nodes, edges, width, height, hidden } = useMemo(() => {
    const keep = pack.concepts.slice(0, max)
    const keepIds = new Set(keep.map((c) => c.id))
    const rel = pack.edges.filter((e) => keepIds.has(e.source) && keepIds.has(e.target))

    // Longest-path layering. The graph is a DAG by construction, so a fixed number of
    // relaxation passes settles it.
    const depth = new Map<number, number>(keep.map((c) => [c.id, 0]))
    for (let pass = 0; pass < keep.length; pass++) {
      let changed = false
      for (const e of rel) {
        const next = (depth.get(e.source) ?? 0) + 1
        if (next > (depth.get(e.target) ?? 0)) {
          depth.set(e.target, next)
          changed = true
        }
      }
      if (!changed) break
    }

    const layers = new Map<number, typeof keep>()
    for (const c of keep) {
      const d = depth.get(c.id) ?? 0
      layers.set(d, [...(layers.get(d) ?? []), c])
    }

    const maxRows = Math.max(...[...layers.values()].map((l) => l.length), 1)
    const placed: Placed[] = []
    for (const [layer, group] of [...layers.entries()].sort((a, b) => a[0] - b[0])) {
      const offset = ((maxRows - group.length) * ROW_H) / 2
      group.forEach((c, i) => {
        placed.push({
          id: c.id,
          name: c.name,
          mastery: c.mastery,
          layer,
          x: layer * (COL_W + GAP_X),
          y: offset + i * ROW_H,
        })
      })
    }

    const byId = new Map(placed.map((p) => [p.id, p]))
    return {
      nodes: placed,
      edges: rel
        .map((e) => ({ from: byId.get(e.source)!, to: byId.get(e.target)!, w: e.weight }))
        .filter((e) => e.from && e.to),
      width: (Math.max(...placed.map((p) => p.layer)) + 1) * (COL_W + GAP_X) - GAP_X + PILL_W - COL_W,
      height: maxRows * ROW_H,
      hidden: pack.concepts.length - keep.length,
    }
  }, [pack, max])

  const connected = (id: number) =>
    hover === null ||
    hover === id ||
    edges.some((e) => (e.from.id === hover && e.to.id === id) || (e.to.id === hover && e.from.id === id))

  return (
    <div>
      <div className="no-scrollbar overflow-x-auto pb-2">
        <div
          className="relative"
          style={{ width: Math.max(width + PILL_W, 320), height: height + 10 }}
        >
          <svg
            className="absolute inset-0 overflow-visible"
            width={width + PILL_W}
            height={height + 10}
            aria-hidden
          >
            {edges.map((e, i) => {
              const x1 = e.from.x + PILL_W
              const y1 = e.from.y + PILL_H / 2
              const x2 = e.to.x
              const y2 = e.to.y + PILL_H / 2
              const mx = (x1 + x2) / 2
              const active = hover !== null && (e.from.id === hover || e.to.id === hover)
              return (
                <motion.path
                  key={i}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={active ? 'var(--color-accent)' : 'var(--color-ink-4)'}
                  strokeWidth={active ? 1.6 : 1}
                  strokeOpacity={hover === null ? 0.4 : active ? 0.9 : 0.15}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7, delay: 0.05 * (i % 6), ease: [0.22, 1, 0.36, 1] }}
                />
              )
            })}
          </svg>

          {nodes.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: connected(n.id) ? 1 : 0.35, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.03 * i, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              style={{ left: n.x, top: n.y, width: PILL_W, height: PILL_H }}
              className={cn(
                'interactive absolute flex items-center gap-2 overflow-hidden rounded-[9px] border bg-surface px-2.5',
                hover === n.id ? 'border-accent shadow-sm' : 'border-line',
              )}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  background:
                    n.mastery >= 0.75
                      ? 'var(--color-good)'
                      : n.mastery >= 0.4
                        ? 'var(--color-warn)'
                        : 'var(--color-line-strong)',
                }}
              />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
                {titleCase(n.name)}
              </span>
              <span className="shrink-0 text-[10.5px] tabular-nums text-ink-4">
                {pct(n.mastery)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-ink-3">
        <Legend color="var(--color-good)" label="Holding" />
        <Legend color="var(--color-warn)" label="Shaky" />
        <Legend color="var(--color-line-strong)" label="Not covered yet" />
        <span className="text-ink-4">
          Left to right: each concept sits after the ones it depends on
          {hidden > 0 && ` · ${hidden} more not shown`}
        </span>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
