import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Check,
  FileText,
  Layers,
  ListChecks,
  RotateCcw,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import { DUR, EASE, SPRING } from '../../lib/motion'
import { cn } from '../../lib/cn'

/**
 * The hero.
 *
 * Rather than a screenshot, this plays the product's actual sequence: a file lands, the
 * engine reads it, concepts appear, they wire themselves together, and study material
 * falls out the other side. It is the pitch, performed rather than described.
 */

type Phase = 'idle' | 'dropping' | 'reading' | 'concepts' | 'linking' | 'output' | 'ready'

const SCRIPT: { phase: Phase; ms: number }[] = [
  { phase: 'idle', ms: 900 },
  { phase: 'dropping', ms: 900 },
  { phase: 'reading', ms: 1200 },
  { phase: 'concepts', ms: 1300 },
  { phase: 'linking', ms: 1200 },
  { phase: 'output', ms: 1600 },
  { phase: 'ready', ms: 3400 },
]

const ORDER: Phase[] = SCRIPT.map((s) => s.phase)
const at = (phase: Phase, min: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(min)

const STAGES = [
  { id: 'read', label: 'Reading material', from: 'reading' as Phase },
  { id: 'concept', label: 'Finding key concepts', from: 'concepts' as Phase },
  { id: 'link', label: 'Mapping relationships', from: 'linking' as Phase },
  { id: 'path', label: 'Building your path', from: 'output' as Phase },
]

const NODES = [
  { x: 18, y: 30, label: 'Cell membrane' },
  { x: 50, y: 16, label: 'Transport' },
  { x: 82, y: 32, label: 'Osmosis' },
  { x: 30, y: 66, label: 'Organelles' },
  { x: 62, y: 60, label: 'Mitochondria' },
  { x: 86, y: 78, label: 'ATP' },
  { x: 14, y: 84, label: 'Nucleus' },
]
const LINKS: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 3],
  [3, 4],
  [4, 5],
  [3, 6],
  [1, 4],
]

const OUTPUTS = [
  { icon: FileText, label: 'Notes', detail: '6 sections' },
  { icon: Layers, label: 'Flashcards', detail: '30 cards' },
  { icon: ListChecks, label: 'Quiz', detail: '35 questions' },
]

const PATH = [
  { title: 'Cell structure', mastery: 0.92 },
  { title: 'Membrane transport', mastery: 0.61 },
  { title: 'Organelles', mastery: 0.74 },
  { title: 'Cellular respiration', mastery: 0.43 },
]

export function HeroDemo() {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>(reduced ? 'ready' : 'idle')
  const [runId, setRunId] = useState(0)
  const timers = useRef<number[]>([])

  const play = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (reduced) {
      setPhase('ready')
      return
    }
    let elapsed = 0
    for (const step of SCRIPT) {
      timers.current.push(
        window.setTimeout(() => setPhase(step.phase), elapsed) as unknown as number,
      )
      elapsed += step.ms
    }
    // loop
    timers.current.push(
      window.setTimeout(() => setRunId((r) => r + 1), elapsed) as unknown as number,
    )
  }, [reduced])

  useEffect(() => {
    play()
    return () => timers.current.forEach(clearTimeout)
  }, [play, runId])

  const replay = () => {
    setPhase('idle')
    setRunId((r) => r + 1)
  }

  const stageIndex = STAGES.filter((s) => at(phase, s.from)).length

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-lg">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-line-strong" />
            <span className="h-2 w-2 rounded-full bg-line-strong" />
            <span className="h-2 w-2 rounded-full bg-line-strong" />
          </span>
          <span className="mx-auto flex items-center gap-1.5 rounded-full bg-raised px-3 py-1 text-[11px] text-ink-3">
            <Sparkles size={10} className="text-accent" />
            lattice
          </span>
          <button
            onClick={replay}
            aria-label="Replay the demo"
            className="interactive rounded-[7px] p-1 text-ink-4 hover:bg-raised hover:text-ink-2"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[1.05fr_1fr] sm:gap-5 sm:p-6">
          {/* ------------------------------------------------ left: input → engine */}
          <div className="flex min-h-[280px] flex-col">
            <div
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center rounded-[14px] border border-dashed px-5 py-7 text-center transition-colors duration-300',
                phase === 'idle' ? 'border-line-strong' : 'border-accent-line bg-accent-tint/35',
              )}
            >
              <AnimatePresence mode="wait">
                {phase === 'idle' ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: DUR.fast }}
                    className="flex flex-col items-center"
                  >
                    <span className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-[10px] bg-raised text-ink-3">
                      <UploadCloud size={17} />
                    </span>
                    <p className="text-[13px] font-medium text-ink">Drop something to learn</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-4">PDF · slides · notes</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, y: -34, scale: 0.94, rotate: -3 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                    transition={SPRING}
                    className="flex w-full items-center gap-2.5 rounded-[11px] border border-line bg-surface px-3 py-2.5 text-left shadow-sm"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-accent-tint text-accent">
                      <FileText size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink">
                        Cell Biology — Lecture 04.pdf
                      </span>
                      <span className="block text-[11px] text-ink-4">2.4 MB · 18 pages</span>
                    </span>
                    {at(phase, 'ready') && (
                      <motion.span
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={SPRING}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-good text-white"
                      >
                        <Check size={11} strokeWidth={3} />
                      </motion.span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stage checklist */}
              <AnimatePresence>
                {at(phase, 'reading') && (
                  <motion.ol
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: DUR.base, ease: EASE.out }}
                    className="mt-4 w-full space-y-1.5 overflow-hidden text-left"
                  >
                    {STAGES.map((s, i) => {
                      const done = i < stageIndex - 1 || at(phase, 'ready')
                      const active = i === stageIndex - 1 && !at(phase, 'ready')
                      const visible = i <= stageIndex - 1
                      return (
                        <motion.li
                          key={s.id}
                          animate={{ opacity: visible ? 1 : 0.35 }}
                          transition={{ duration: DUR.base }}
                          className="flex items-center gap-2"
                        >
                          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                            {done ? (
                              <motion.span
                                initial={{ scale: 0.3 }}
                                animate={{ scale: 1 }}
                                transition={SPRING}
                                className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-good text-white"
                              >
                                <Check size={8} strokeWidth={3.5} />
                              </motion.span>
                            ) : active ? (
                              <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                                <motion.span
                                  animate={{ scale: [1, 2], opacity: [0.4, 0] }}
                                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                                  className="absolute inset-0 rounded-full bg-accent"
                                />
                                <span className="relative h-1.5 w-1.5 rounded-full bg-accent" />
                              </span>
                            ) : (
                              <span className="h-1 w-1 rounded-full bg-line-strong" />
                            )}
                          </span>
                          <span
                            className={cn(
                              'text-[11.5px]',
                              active ? 'font-medium text-ink' : done ? 'text-ink-3' : 'text-ink-4',
                            )}
                          >
                            {s.label}
                          </span>
                        </motion.li>
                      )
                    })}
                  </motion.ol>
                )}
              </AnimatePresence>
            </div>

            {/* Concept graph forming */}
            <div className="relative mt-3 h-[104px] overflow-hidden rounded-[14px] border border-line bg-canvas">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                {LINKS.map(([a, b], i) => (
                  <motion.line
                    key={i}
                    x1={NODES[a].x}
                    y1={NODES[a].y}
                    x2={NODES[b].x}
                    y2={NODES[b].y}
                    stroke="var(--color-accent)"
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={
                      at(phase, 'linking')
                        ? { pathLength: 1, opacity: 0.4 }
                        : { pathLength: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.5, delay: i * 0.07, ease: EASE.out }}
                  />
                ))}
              </svg>
              {NODES.map((n, i) => (
                <motion.span
                  key={n.label}
                  initial={{ opacity: 0, scale: 0.2 }}
                  animate={
                    at(phase, 'concepts')
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.2 }
                  }
                  transition={{ ...SPRING, delay: at(phase, 'concepts') ? i * 0.07 : 0 }}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <span className="flex items-center gap-1 rounded-full border border-line bg-surface px-1.5 py-0.5 text-[9px] font-medium whitespace-nowrap text-ink-2 shadow-xs">
                    <span className="h-1 w-1 rounded-full bg-accent" />
                    {n.label}
                  </span>
                </motion.span>
              ))}
            </div>
          </div>

          {/* ------------------------------------------------ right: what falls out */}
          <div className="flex min-h-[280px] flex-col gap-2">
            {OUTPUTS.map((o, i) => (
              <motion.div
                key={o.label}
                initial={{ opacity: 0, x: 16 }}
                animate={at(phase, 'output') ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
                transition={{ ...SPRING, delay: at(phase, 'output') ? i * 0.09 : 0 }}
                className="flex items-center gap-2.5 rounded-[11px] border border-line px-3 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-raised text-ink-3">
                  <o.icon size={13.5} />
                </span>
                <span className="text-[12.5px] font-medium text-ink">{o.label}</span>
                <span className="ml-auto text-[11px] tabular-nums text-ink-4">{o.detail}</span>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={at(phase, 'ready') ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: DUR.slow, ease: EASE.out }}
              className="mt-1 flex-1 rounded-[12px] border border-line bg-canvas p-3.5"
            >
              <p className="mb-2.5 text-[10.5px] font-semibold tracking-wide text-ink-4 uppercase">
                Your learning path
              </p>
              <ul className="space-y-2.5">
                {PATH.map((p, i) => (
                  <motion.li
                    key={p.title}
                    initial={{ opacity: 0 }}
                    animate={at(phase, 'ready') ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ delay: at(phase, 'ready') ? 0.15 + i * 0.09 : 0, duration: DUR.base }}
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[11.5px] font-medium text-ink">
                        {p.title}
                      </span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-ink-4">
                        {Math.round(p.mastery * 100)}%
                      </span>
                    </div>
                    <div className="h-[3px] overflow-hidden rounded-full bg-sunken">
                      <motion.div
                        className={cn(
                          'h-full rounded-full',
                          p.mastery < 0.55 ? 'bg-warn' : 'bg-ink',
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: at(phase, 'ready') ? `${p.mastery * 100}%` : 0 }}
                        transition={{
                          duration: 0.7,
                          delay: at(phase, 'ready') ? 0.25 + i * 0.09 : 0,
                          ease: EASE.out,
                        }}
                      />
                    </div>
                  </motion.li>
                ))}
              </ul>

              <motion.p
                initial={{ opacity: 0 }}
                animate={at(phase, 'ready') ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: at(phase, 'ready') ? 0.75 : 0, duration: DUR.base }}
                className="mt-3.5 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-2"
              >
                Weakest area:{' '}
                <span className="font-medium text-ink">cellular respiration</span>. Start there.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
