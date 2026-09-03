import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, FileText } from 'lucide-react'
import { cn } from '../../lib/cn'
import { DUR, EASE, SPRING } from '../../lib/motion'

export const STAGES = [
  { id: 'read', label: 'Reading material', done: 'Read your material' },
  { id: 'concepts', label: 'Finding key concepts', done: 'Found the key concepts' },
  { id: 'graph', label: 'Mapping relationships', done: 'Mapped the relationships' },
  { id: 'questions', label: 'Writing questions', done: 'Wrote your questions' },
  { id: 'path', label: 'Building your learning path', done: 'Built your learning path' },
] as const

/** Fixed positions so the graph draws the same way every run — a diagram, not confetti. */
const NODES = [
  { x: 50, y: 14 },
  { x: 24, y: 36 },
  { x: 76, y: 34 },
  { x: 13, y: 62 },
  { x: 42, y: 58 },
  { x: 66, y: 64 },
  { x: 88, y: 58 },
  { x: 30, y: 86 },
  { x: 58, y: 88 },
]
const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 5],
  [2, 6],
  [4, 7],
  [5, 8],
  [4, 5],
]

/**
 * What the user watches while the engine works.
 *
 * The stages are not decoration — each names a step the pipeline actually performs, and
 * the graph fills in alongside them, so the wait explains the product instead of hiding it.
 */
export function ProcessingView({ stage, fileName }: { stage: number; fileName: string }) {
  const reduced = useReducedMotion()
  const subject = fileName.replace(/\.[a-z0-9]{2,5}$/i, '').split(/[—–-]/)[0].trim()

  const shownNodes = Math.ceil(((stage + 1) / STAGES.length) * NODES.length)
  const shownEdges = stage >= 2 ? Math.ceil(((stage - 1) / (STAGES.length - 2)) * EDGES.length) : 0

  return (
    <div className="py-1">
      {/* The file, settled */}
      <motion.div
        layout
        initial={reduced ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="mb-6 flex items-center gap-3 rounded-[12px] border border-line bg-raised/60 px-3 py-2.5"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-surface text-ink-3 shadow-xs">
          <FileText size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink">{fileName}</span>
          <span className="block text-[11.5px] text-ink-3">Processing on your machine</span>
        </span>
      </motion.div>

      <h2 className="text-[19px] leading-snug font-semibold text-balance text-ink">
        Understanding {subject}…
      </h2>

      <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        {/* Stage checklist */}
        <ol className="space-y-2.5">
          {STAGES.map((s, i) => {
            const state = i < stage ? 'done' : i === stage ? 'active' : 'todo'
            return (
              <li key={s.id} className="flex items-center gap-2.5">
                <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                  <AnimatePresence mode="wait" initial={false}>
                    {state === 'done' ? (
                      <motion.span
                        key="done"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={SPRING}
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-good text-white"
                      >
                        <Check size={10} strokeWidth={3} />
                      </motion.span>
                    ) : state === 'active' ? (
                      <motion.span
                        key="active"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: DUR.fast, ease: EASE.out }}
                        className="relative flex h-4 w-4 items-center justify-center"
                      >
                        <motion.span
                          animate={reduced ? {} : { scale: [1, 1.9], opacity: [0.45, 0] }}
                          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
                          className="absolute inset-0 rounded-full bg-accent"
                        />
                        <span className="relative h-2 w-2 rounded-full bg-accent" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="todo"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-1.5 w-1.5 rounded-full bg-line-strong"
                      />
                    )}
                  </AnimatePresence>
                </span>

                <motion.span
                  animate={{
                    color:
                      state === 'todo'
                        ? 'var(--color-ink-4)'
                        : state === 'active'
                          ? 'var(--color-ink)'
                          : 'var(--color-ink-3)',
                  }}
                  transition={{ duration: DUR.base }}
                  className={cn('text-[13.5px]', state === 'active' ? 'font-medium' : 'font-normal')}
                >
                  {state === 'done' ? s.done : s.label}
                </motion.span>
              </li>
            )
          })}
        </ol>

        {/* The graph assembling itself, in step with the checklist */}
        <div className="relative mx-auto h-[128px] w-[128px] shrink-0 sm:h-[136px] sm:w-[136px]">
          <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
            {EDGES.map(([a, b], i) => (
              <motion.line
                key={`e${i}`}
                x1={NODES[a].x}
                y1={NODES[a].y}
                x2={NODES[b].x}
                y2={NODES[b].y}
                stroke="var(--color-accent)"
                strokeWidth="0.8"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={
                  i < shownEdges ? { pathLength: 1, opacity: 0.36 } : { pathLength: 0, opacity: 0 }
                }
                transition={{ duration: 0.5, ease: EASE.out, delay: (i % 4) * 0.06 }}
              />
            ))}
            {NODES.map((n, i) => (
              <motion.circle
                key={`n${i}`}
                cx={n.x}
                cy={n.y}
                r={i === 0 ? 3.6 : 2.8}
                fill={i < shownNodes ? 'var(--color-accent)' : 'var(--color-line-strong)'}
                initial={{ scale: 0, opacity: 0 }}
                animate={i < shownNodes ? { scale: 1, opacity: 1 } : { scale: 0.55, opacity: 0.4 }}
                transition={{ ...SPRING, delay: (i % 5) * 0.05 }}
                style={{ transformOrigin: `${n.x}px ${n.y}px` }}
              />
            ))}
          </svg>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {STAGES.map((s, i) => (
          <motion.span
            key={s.id}
            animate={{
              backgroundColor:
                i <= stage ? 'var(--color-accent)' : 'var(--color-sunken)',
            }}
            transition={{ duration: DUR.base }}
            className="h-[3px] flex-1 rounded-full"
          />
        ))}
      </div>
    </div>
  )
}

/** The beat between "done" and the study pack appearing. */
export function ProcessingComplete({ title }: { title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DUR.base }}
      className="flex flex-col items-center py-10 text-center"
    >
      <motion.span
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING}
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-good-tint text-good"
      >
        <Check size={20} strokeWidth={2.5} />
      </motion.span>
      <p className="text-[17px] font-semibold text-ink">Your learning path is ready</p>
      <p className="mt-1 text-[13.5px] text-ink-3">{title}</p>
    </motion.div>
  )
}
