import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { Check, FileText, X } from 'lucide-react'
import { DUR, EASE, SPRING } from '../../lib/motion'
import { cn } from '../../lib/cn'

/**
 * One visual per step of the story. Each plays when it scrolls into view rather than on
 * load, so the page reveals the product at the pace the reader moves through it.
 */

function useEnter() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const inView = useInView(ref, { once: true, amount: 0.5 })
  return { ref, on: reduced ? true : inView }
}

const Frame = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-[16px] border border-line bg-surface p-5 shadow-sm sm:p-6',
      className,
    )}
  >
    {children}
  </div>
)

/* ---------------------------------------------------------------- 1. Upload */

export function UploadVisual() {
  const { ref, on } = useEnter()
  return (
    <div ref={ref}>
      <Frame className="flex min-h-[248px] items-center justify-center">
        <div
          className={cn(
            'flex w-full max-w-xs flex-col items-center rounded-[14px] border border-dashed px-5 py-8 transition-colors duration-500',
            on ? 'border-accent-line bg-accent-tint/40' : 'border-line-strong',
          )}
        >
          <AnimatePresence>
            {on && (
              <motion.div
                initial={{ opacity: 0, y: -46, rotate: -6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                transition={{ ...SPRING, delay: 0.15 }}
                className="flex w-full items-center gap-2.5 rounded-[11px] border border-line bg-surface px-3 py-2.5 shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-accent-tint text-accent">
                  <FileText size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-ink">
                    Cell Biology — Lecture 04.pdf
                  </span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="block text-[11px] text-ink-4"
                  >
                    Uploaded
                  </motion.span>
                </span>
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...SPRING, delay: 0.85 }}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-good text-white"
                >
                  <Check size={11} strokeWidth={3} />
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="mt-4 text-[12px] text-ink-4">One file is enough.</p>
        </div>
      </Frame>
    </div>
  )
}

/* ------------------------------------------------------------ 2. Understand */

const TREE = [
  { label: 'Cell Biology', depth: 0 },
  { label: 'Cell membrane', depth: 1 },
  { label: 'Membrane transport', depth: 1 },
  { label: 'Osmosis', depth: 2 },
  { label: 'Active transport', depth: 2 },
  { label: 'Organelles', depth: 1 },
  { label: 'Mitochondria', depth: 2 },
  { label: 'Protein synthesis', depth: 1 },
]

export function UnderstandVisual() {
  const { ref, on } = useEnter()
  return (
    <div ref={ref}>
      <Frame className="min-h-[248px]">
        <p className="mb-4 text-[10.5px] font-semibold tracking-wide text-ink-4 uppercase">
          Concepts found
        </p>
        <ul className="space-y-1.5">
          {TREE.map((n, i) => (
            <motion.li
              key={n.label}
              initial={{ opacity: 0, x: -8 }}
              animate={on ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: DUR.base, delay: i * 0.09, ease: EASE.out }}
              style={{ paddingLeft: n.depth * 18 }}
              className="flex items-center gap-2"
            >
              {n.depth > 0 && (
                <span className="h-px w-2.5 shrink-0 bg-line-strong" aria-hidden />
              )}
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  n.depth === 0 ? 'bg-ink' : n.depth === 1 ? 'bg-accent' : 'bg-ink-4',
                )}
              />
              <span
                className={cn(
                  n.depth === 0
                    ? 'text-[13.5px] font-semibold text-ink'
                    : 'text-[12.5px] text-ink-2',
                )}
              >
                {n.label}
              </span>
            </motion.li>
          ))}
        </ul>
      </Frame>
    </div>
  )
}

/* -------------------------------------------------------------- 3. Diagnose */

const DIAGNOSIS = [
  { label: 'Cell structure', value: 0.92, band: 'mastered' as const },
  { label: 'Organelles', value: 0.74, band: 'familiar' as const },
  { label: 'Membrane transport', value: 0.61, band: 'familiar' as const },
  { label: 'Cellular respiration', value: 0.43, band: 'review' as const },
  { label: 'Protein synthesis', value: 0.28, band: 'review' as const },
]

const BAND_STYLE = {
  mastered: { dot: 'bg-good', bar: 'bg-good', label: 'Mastered' },
  familiar: { dot: 'bg-warn', bar: 'bg-warn', label: 'Familiar' },
  review: { dot: 'bg-bad', bar: 'bg-bad', label: 'Needs review' },
}

export function DiagnoseVisual() {
  const { ref, on } = useEnter()
  return (
    <div ref={ref}>
      <Frame className="min-h-[248px]">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-[10.5px] font-semibold tracking-wide text-ink-4 uppercase">
            What you actually know
          </p>
        </div>
        <ul className="space-y-3.5">
          {DIAGNOSIS.map((d, i) => {
            const style = BAND_STYLE[d.band]
            return (
              <li key={d.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 truncate text-[12.5px] font-medium text-ink">
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} />
                    {d.label}
                  </span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={on ? { opacity: 1 } : {}}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="shrink-0 text-[11.5px] tabular-nums text-ink-3"
                  >
                    {Math.round(d.value * 100)}%
                  </motion.span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-sunken">
                  <motion.div
                    className={cn('h-full rounded-full', style.bar)}
                    initial={{ width: 0 }}
                    animate={on ? { width: `${d.value * 100}%` } : {}}
                    transition={{ duration: 0.75, delay: i * 0.09, ease: EASE.out }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </Frame>
    </div>
  )
}

/* -------------------------------------------------------------- 4. Practice */

const OPTIONS = [
  'The cytoplasm',
  'The mitochondrial matrix',
  'The inner mitochondrial membrane',
  'The rough ER',
]

export function PracticeVisual() {
  const { ref, on } = useEnter()
  const reduced = useReducedMotion()
  const [picked, setPicked] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!on) return
    if (reduced) {
      setPicked(1)
      setRevealed(true)
      return
    }
    const a = setTimeout(() => setPicked(1), 1100)
    const b = setTimeout(() => setRevealed(true), 1750)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [on, reduced])

  return (
    <div ref={ref}>
      <Frame className="min-h-[248px]">
        <div className="mb-3 flex items-center justify-between text-[11px] text-ink-4">
          <span>Cell Biology</span>
          <span className="tabular-nums">Question 4 / 10</span>
        </div>
        <div className="mb-4 h-[3px] overflow-hidden rounded-full bg-sunken">
          <motion.div
            className="h-full rounded-full bg-ink"
            initial={{ width: '30%' }}
            animate={on ? { width: '40%' } : {}}
            transition={{ duration: 0.6, delay: 1.9, ease: EASE.out }}
          />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={on ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: DUR.base, ease: EASE.out }}
          className="text-[14.5px] leading-snug font-semibold text-balance text-ink"
        >
          Where in the cell does glycolysis occur?
        </motion.p>

        <ul className="mt-3.5 space-y-1.5">
          {OPTIONS.map((o, i) => {
            const isPicked = picked === i
            const isAnswer = i === 0
            const showRight = revealed && isAnswer
            const showWrong = revealed && isPicked && !isAnswer
            return (
              <motion.li
                key={o}
                initial={{ opacity: 0, y: 6 }}
                animate={on ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: DUR.base, delay: 0.12 + i * 0.06, ease: EASE.out }}
              >
                <div
                  className={cn(
                    'flex items-center gap-2.5 rounded-[10px] border px-3 py-2 text-[12.5px] transition-colors duration-300',
                    showRight
                      ? 'border-good-line bg-good-tint text-ink'
                      : showWrong
                        ? 'border-bad-line bg-bad-tint text-ink'
                        : isPicked
                          ? 'border-accent bg-accent-tint text-ink'
                          : 'border-line text-ink-2',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-white transition-colors duration-300',
                      showRight
                        ? 'border-good bg-good'
                        : showWrong
                          ? 'border-bad bg-bad'
                          : isPicked
                            ? 'border-accent bg-accent'
                            : 'border-line-strong',
                    )}
                  >
                    {showRight ? <Check size={9} strokeWidth={3.5} /> : showWrong ? <X size={9} strokeWidth={3.5} /> : null}
                  </span>
                  {o}
                </div>
              </motion.li>
            )
          })}
        </ul>

        <AnimatePresence>
          {revealed && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: DUR.base, ease: EASE.out }}
              className="overflow-hidden pt-3 text-[11.5px] leading-relaxed text-ink-2"
            >
              <span className="font-medium text-ink">Why:</span> glycolysis runs in the cytoplasm —
              which is exactly why cells without oxygen can still do it.
            </motion.p>
          )}
        </AnimatePresence>
      </Frame>
    </div>
  )
}

/* ---------------------------------------------------------------- 5. Master */

const BEFORE_AFTER = [
  { label: 'Membrane transport', from: 0.61, to: 0.88 },
  { label: 'Cellular respiration', from: 0.43, to: 0.79 },
  { label: 'Organelles', from: 0.74, to: 0.93 },
]

export function MasterVisual() {
  const { ref, on } = useEnter()
  const [after, setAfter] = useState(false)

  useEffect(() => {
    if (!on) return
    const id = setTimeout(() => setAfter(true), 900)
    return () => clearTimeout(id)
  }, [on])

  return (
    <div ref={ref}>
      <Frame className="min-h-[248px]">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-[10.5px] font-semibold tracking-wide text-ink-4 uppercase">
            Understanding
          </p>
          <AnimatePresence mode="wait">
            <motion.span
              key={after ? 'after' : 'before'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: DUR.fast }}
              className="text-[11px] font-medium text-ink-3"
            >
              {after ? 'after this week' : 'last week'}
            </motion.span>
          </AnimatePresence>
        </div>

        <ul className="space-y-4">
          {BEFORE_AFTER.map((b, i) => {
            const value = after ? b.to : b.from
            return (
              <li key={b.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[12.5px] font-medium text-ink">{b.label}</span>
                  <CountUp value={value} active={on} delay={i * 0.08} />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                  <motion.div
                    className={cn('h-full rounded-full', value >= 0.8 ? 'bg-good' : 'bg-warn')}
                    initial={{ width: 0 }}
                    animate={on ? { width: `${value * 100}%` } : {}}
                    transition={{ duration: 0.8, delay: i * 0.08, ease: EASE.out }}
                  />
                </div>
              </li>
            )
          })}
        </ul>

        <motion.p
          initial={{ opacity: 0 }}
          animate={after ? { opacity: 1 } : {}}
          transition={{ duration: DUR.slow, delay: 0.5 }}
          className="mt-5 border-t border-line pt-3.5 text-[12px] text-ink-2"
        >
          Two weak areas closed. You're ready to move on.
        </motion.p>
      </Frame>
    </div>
  )
}

function CountUp({ value, active, delay }: { value: number; active: boolean; delay: number }) {
  const [shown, setShown] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!active) return
    if (reduced) {
      setShown(value)
      return
    }
    let frame = 0
    const start = performance.now() + delay * 1000
    const from = shown
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / 800))
      setShown(from + (value - from) * (1 - Math.pow(1 - t, 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, active, reduced])

  return (
    <span className="shrink-0 text-[11.5px] tabular-nums text-ink-3">
      {Math.round(shown * 100)}%
    </span>
  )
}
