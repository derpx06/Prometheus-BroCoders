import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  ListChecks,
  RotateCcw,
  RotateCw,
  Check,
} from 'lucide-react'
import { Button, IconButton } from '../components/ui/Button'
import { Badge, EmptyState, ProgressBar } from '../components/ui/primitives'
import { useApp } from '../store/app'
import { titleCase } from '../lib/format'
import { cn } from '../lib/cn'

export function Flashcards() {
  const { id } = useParams()
  const { getPack, patchPack, logActivity } = useApp()
  const pack = getPack(id)

  const deck = useMemo(() => pack?.flashcards ?? [], [pack])

  /** Cards still to see, front of the list first. "Review again" sends one to the back. */
  const [queue, setQueue] = useState<string[]>(() => deck.map((c) => c.id))
  const [seen, setSeen] = useState<string[]>([])
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<Set<string>>(new Set())
  const [done, setDone] = useState(false)
  const logged = useRef(false)

  const restart = useCallback(() => {
    setQueue(deck.map((c) => c.id))
    setSeen([])
    setKnown(new Set())
    setFlipped(false)
    setDone(false)
    logged.current = false
  }, [deck])

  useEffect(() => {
    restart()
  }, [restart])

  const card = deck.find((c) => c.id === queue[0])

  const advance = useCallback(
    (requeue: boolean) => {
      setFlipped(false)
      setQueue((q) => {
        if (!q.length) return q
        const [head, ...rest] = q
        setSeen((s) => [...s, head])
        const next = requeue ? [...rest, head] : rest
        if (!next.length) setDone(true)
        return next
      })
    },
    [],
  )

  const markKnown = useCallback(() => {
    if (!card) return
    setKnown((k) => new Set(k).add(card.id))
    advance(false)
  }, [card, advance])

  const back = useCallback(() => {
    setFlipped(false)
    setSeen((s) => {
      if (!s.length) return s
      const previous = s[s.length - 1]
      setQueue((q) => [previous, ...q.filter((id) => id !== previous)])
      return s.slice(0, -1)
    })
  }, [])

  const position = Math.min(seen.length + 1, deck.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !card) return
      if (e.key === ' ') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        markKnown()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        advance(true)
      } else if (e.key === 'Backspace') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, back, markKnown, done, card])

  useEffect(() => {
    if (!done || !pack || logged.current) return
    logged.current = true
    logActivity({
      kind: 'flashcards',
      packId: pack.id,
      label: pack.title,
      detail: `Reviewed ${deck.length} cards`,
    })
    patchPack(pack.id, { lastStudied: Date.now(), minutes: pack.minutes + 5 })
  }, [done, pack, deck.length, logActivity, patchPack])

  if (!pack || !deck.length || (!card && !done)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState
          icon={<Layers size={19} />}
          title="No cards in this deck"
          description="Upload material and we'll write a card for every concept we find in it."
          action={
            <Link to="/app/practice">
              <Button variant="primary">All decks</Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-[520px] px-4 py-16 text-center sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-good-tint text-good">
            <Check size={20} />
          </div>
          <h1 className="text-[24px] font-semibold text-ink">Deck complete</h1>
          <p className="mt-2 text-[14.5px] text-ink-2">
            You marked{' '}
            <span className="font-medium text-ink">
              {known.size} of {deck.length}
            </span>{' '}
            as known. The rest are worth another pass before your next quiz.
          </p>
          <div className="mt-7 flex flex-col gap-2">
            <Link to={`/app/quiz/${pack.id}`}>
              <Button variant="primary" block icon={<ListChecks size={15} />}>
                Test yourself on this
              </Button>
            </Link>
            <Button block icon={<RotateCcw size={15} />} onClick={restart}>
              Run the deck again
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!card) return null

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          to={`/app/pack/${pack.id}`}
          className="interactive -ml-1.5 inline-flex items-center gap-1 rounded-[8px] px-1.5 py-1 text-[13px] font-medium text-ink-3 hover:bg-raised hover:text-ink"
        >
          <ChevronLeft size={14} />
          {pack.title}
        </Link>
        <span className="ml-auto text-[13px] font-medium tabular-nums text-ink-2">
          {position} / {deck.length}
        </span>
      </div>
      <ProgressBar value={known.size / deck.length} height={4} tone="ink" />

      {/* The card */}
      <div className="mt-8 [perspective:1600px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.button
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? 'Show the question' : 'Show the answer'}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flip-3d relative block w-full cursor-pointer text-left"
              style={{ minHeight: 288 }}
            >
              <Face>
                <Badge tone="neutral" className="mb-5 self-start">
                  {titleCase(card.concept)}
                </Badge>
                <p className="text-[21px] leading-snug font-semibold text-balance text-ink sm:text-[24px]">
                  {card.front}
                </p>
                <p className="mt-auto pt-6 text-[12.5px] text-ink-4">
                  Click the card, or press Space, to flip
                </p>
              </Face>

              <Face back>
                <Badge tone="accent" className="mb-5 self-start">
                  Answer
                </Badge>
                <p className="text-[16px] leading-relaxed text-pretty text-ink">{card.back}</p>
                <p className="mt-auto pt-6 text-[12.5px] text-ink-4">
                  From {pack.sourceLabel}
                </p>
              </Face>
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center gap-2">
        <IconButton label="Previous card" onClick={back} disabled={!seen.length}>
          <ChevronLeft size={17} />
        </IconButton>

        <div className="flex flex-1 gap-2">
          <Button
            block
            icon={<RotateCw size={15} />}
            onClick={() => advance(true)}
            className="flex-1"
          >
            Again
          </Button>
          <Button
            block
            variant="primary"
            icon={<Check size={15} />}
            onClick={markKnown}
            className="flex-1"
          >
            Got it
          </Button>
        </div>

        <IconButton label="Next card" onClick={() => advance(false)}>
          <ChevronRight size={17} />
        </IconButton>
      </div>

      <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11.5px] text-ink-4">
        <span className="inline-flex items-center gap-1.5">
          <Key>Space</Key> flip
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Key>←</Key> again
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Key>→</Key> got it
        </span>
      </p>
    </div>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[5px] border border-line bg-surface px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-ink-3 shadow-xs">
      {children}
    </kbd>
  )
}

function Face({ children, back = false }: { children: React.ReactNode; back?: boolean }) {
  return (
    <div
      className={cn(
        'backface-hidden card flex flex-col p-6 sm:p-8',
        back ? 'absolute inset-0' : 'relative',
      )}
      style={{
        minHeight: 288,
        transform: back ? 'rotateY(180deg)' : undefined,
      }}
    >
      {children}
    </div>
  )
}
