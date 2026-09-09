import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Layers,
  ListChecks,
  RotateCcw,
  X as XIcon,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge, EmptyState, ProgressBar, Skeleton } from '../components/ui/primitives'
import { useApp } from '../store/app'
import { api, demo } from '../lib/api'
import { FREE_THRESHOLD, shuffleOptions, similarity } from '../lib/quiz'
import { pct, titleCase } from '../lib/format'
import { cn } from '../lib/cn'
import type { Pack } from '../lib/types'

const TARGET = 10

interface Live {
  questionId: number
  kind: 'mcq' | 'free'
  stem: string
  options: string[]
  concept: string
  difficulty: number
}

interface Graded {
  correct: boolean
  score: number
  ideal: string
  explanation: string
  masteryAfter?: number
}

export function Quiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getPack, patchPack, setConceptMastery, logActivity, toast } = useApp()
  const pack = getPack(id)

  const [index, setIndex] = useState(0)
  const [question, setQuestion] = useState<Live | null>(null)
  const [loading, setLoading] = useState(true)
  const [choice, setChoice] = useState<string>('')
  const [text, setText] = useState('')
  const [graded, setGraded] = useState<Graded | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState<{ concept: string; correct: boolean }[]>([])
  const [finished, setFinished] = useState(false)
  const logged = useRef(false)

  const loadStatic = useCallback(
    (p: Pack, i: number) => {
      const q = p.quiz[i]
      if (!q) {
        setFinished(true)
        return
      }
      setQuestion({
        questionId: q.id,
        kind: q.kind,
        stem: q.stem,
        options: shuffleOptions(q.options, q.id),
        concept: q.concept,
        difficulty: q.difficulty,
      })
      setLoading(false)
    },
    [],
  )

  const loadNext = useCallback(async () => {
    if (!pack) return
    setLoading(true)
    setChoice('')
    setText('')
    setGraded(null)

    if (!pack.sourceId && !pack.sessionId) {
      loadStatic(pack, index)
      return
    }

    try {
      // A server-backed pack uses the persistent loop, so mastery carries across sessions;
      // an anonymous demo pack uses the ephemeral one.
      const res = pack.sourceId
        ? await api.studyNext(pack.sourceId)
        : await demo.next(pack.sessionId!)
      if (res.done) {
        setFinished(true)
      } else {
        setQuestion({
          questionId: 'questionId' in res ? res.questionId : res.question_id,
          kind: res.kind,
          stem: res.stem,
          options: res.options,
          concept: res.concept.name,
          difficulty: res.difficulty,
        })
      }
    } catch {
      toast({
        tone: 'error',
        title: 'Lost the engine connection',
        description: 'Your progress so far has been kept.',
      })
      setFinished(true)
    } finally {
      setLoading(false)
    }
  }, [pack, index, loadStatic, toast])

  useEffect(() => {
    void loadNext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pack?.id])

  // Record the session once, when it ends.
  useEffect(() => {
    if (!finished || !pack || logged.current || !history.length) return
    logged.current = true
    const correct = history.filter((h) => h.correct).length
    logActivity({
      kind: 'quiz',
      packId: pack.id,
      label: pack.title,
      detail: `Quiz — ${correct} of ${history.length} correct`,
      score: correct / history.length,
    })
    patchPack(pack.id, { lastStudied: Date.now(), minutes: pack.minutes + 6 })
  }, [finished, pack, history, logActivity, patchPack])

  if (!pack) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState
          icon={<ListChecks size={19} />}
          title="No quiz here"
          description="This pack no longer exists. Pick another from your library and we'll build one."
          action={
            <Link to="/app/practice">
              <Button variant="primary">All practice</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const submit = async () => {
    if (!question || graded) return
    const response = question.kind === 'mcq' ? choice : text
    if (!response.trim()) return
    setSubmitting(true)

    try {
      let wasCorrect = false
      if (pack.sourceId) {
        const res = await api.studyAnswer(pack.sourceId, question.questionId, response)
        wasCorrect = res.correct
        setGraded({
          correct: res.correct,
          score: res.score,
          ideal: res.idealAnswer,
          // The server now writes the explanation, grounded in the concept's own evidence and
          // its prerequisites, rather than the client assembling a sentence about it.
          explanation: res.explanation,
          masteryAfter: res.masteryAfter,
        })
        setConceptMastery(pack.id, question.concept, res.masteryAfter)
      } else if (pack.sessionId) {
        const res = await demo.answer(pack.sessionId, question.questionId, response)
        wasCorrect = res.correct
        setGraded({
          correct: res.correct,
          score: res.score,
          ideal: res.ideal_answer,
          explanation:
            question.kind === 'mcq'
              ? `The answer is “${res.ideal_answer}”. It is the concept this sentence was written about — the other options are its nearest neighbours in the material, which is what makes them tempting.`
              : res.ideal_answer,
          masteryAfter: res.mastery_after,
        })
        setConceptMastery(pack.id, question.concept, res.mastery_after)
      } else {
        const q = pack.quiz.find((x) => x.id === question.questionId)!
        const correct =
          q.kind === 'mcq'
            ? response.trim().toLowerCase() === q.answer.trim().toLowerCase()
            : similarity(response, q.answer) >= FREE_THRESHOLD
        const score = q.kind === 'mcq' ? (correct ? 1 : 0) : similarity(response, q.answer)
        wasCorrect = correct
        setGraded({ correct, score, ideal: q.answer, explanation: q.explanation })
        const current = pack.concepts.find((c) => c.name === q.concept)
        if (current) {
          const next = correct
            ? Math.min(0.98, current.mastery + 0.12 * (1 - current.mastery))
            : Math.max(0.05, current.mastery - 0.18 * current.mastery)
          setConceptMastery(pack.id, q.concept, next)
        }
      }
      setHistory((h) => [...h, { concept: question.concept, correct: wasCorrect }])
    } catch {
      toast({ tone: 'error', title: 'Could not grade that', description: 'Try once more.' })
    } finally {
      setSubmitting(false)
    }
  }

  const advance = () => {
    const live = Boolean(pack.sourceId || pack.sessionId)
    if (index + 1 >= TARGET || (!live && index + 1 >= pack.quiz.length)) {
      setFinished(true)
      return
    }
    setIndex((i) => i + 1)
  }

  const total = pack.sourceId || pack.sessionId ? TARGET : Math.min(TARGET, pack.quiz.length)

  if (finished) return <Results pack={pack} history={history} onRestart={() => location.reload()} />

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(`/app/pack/${pack.id}`)}
          className="interactive -ml-1.5 inline-flex items-center gap-1 rounded-[8px] px-1.5 py-1 text-[13px] font-medium text-ink-3 hover:bg-raised hover:text-ink"
        >
          <ChevronLeft size={14} />
          Exit
        </button>
        <span className="ml-auto flex items-center gap-2.5 text-[13px] text-ink-3">
          <span className="hidden truncate sm:inline">{pack.title}</span>
          <span className="hidden text-ink-5 sm:inline">·</span>
          <span className="font-medium tabular-nums text-ink-2">
            Question {Math.min(index + 1, total)} / {total}
          </span>
        </span>
      </div>
      <ProgressBar value={(index + (graded ? 1 : 0)) / total} height={4} tone="ink" />

      <div className="mt-8">
        {loading ? (
          <QuestionSkeleton />
        ) : question ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={question.questionId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{titleCase(question.concept)}</Badge>
                {(pack.sourceId || pack.sessionId) && (
                  <Badge tone="accent">
                    Chosen for you · difficulty {Math.round(question.difficulty * 100)}
                  </Badge>
                )}
              </div>

              <h1 className="text-[21px] leading-snug font-semibold text-balance text-ink sm:text-[24px]">
                {question.stem}
              </h1>

              {question.kind === 'mcq' ? (
                <div className="mt-6 space-y-2.5">
                  {question.options.map((opt) => (
                    <Option
                      key={opt}
                      label={opt}
                      selected={choice === opt}
                      graded={graded}
                      isAnswer={graded ? opt === graded.ideal : false}
                      onSelect={() => !graded && setChoice(opt)}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={Boolean(graded)}
                    rows={5}
                    placeholder="Answer in your own words — a couple of sentences is plenty."
                    className="interactive w-full resize-y rounded-[12px] border border-line bg-surface p-3.5 text-[14.5px] leading-relaxed hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12 disabled:bg-raised/60"
                  />
                </div>
              )}

              <AnimatePresence>
                {graded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div
                      className={cn(
                        'mt-5 rounded-[14px] border p-4',
                        graded.correct
                          ? 'border-good-line bg-good-tint'
                          : 'border-bad-line bg-bad-tint',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full text-white',
                            graded.correct ? 'bg-good' : 'bg-bad',
                          )}
                        >
                          {graded.correct ? <Check size={12} /> : <XIcon size={12} />}
                        </span>
                        <p
                          className={cn(
                            'text-[14px] font-semibold',
                            graded.correct ? 'text-good' : 'text-bad',
                          )}
                        >
                          {graded.correct ? 'Correct' : 'Not quite'}
                        </p>
                        {question.kind === 'free' && (
                          <span className="ml-auto text-[12px] tabular-nums text-ink-3">
                            {pct(graded.score)} match
                          </span>
                        )}
                      </div>

                      <p className="mt-2.5 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">
                        Why
                      </p>
                      <p className="mt-1 text-[14px] leading-relaxed text-pretty text-ink-2">
                        {graded.explanation}
                      </p>

                      {graded.masteryAfter !== undefined && (
                        <p className="mt-3 text-[12.5px] text-ink-3">
                          {titleCase(question.concept)} mastery is now{' '}
                          <span className="font-medium text-ink">{pct(graded.masteryAfter)}</span>.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 flex justify-end">
                {graded ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={advance}
                    iconRight={<ArrowRight size={16} />}
                  >
                    {index + 1 >= total ? 'See results' : 'Next question'}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    loading={submitting}
                    disabled={question.kind === 'mcq' ? !choice : !text.trim()}
                    onClick={submit}
                  >
                    Check answer
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  )
}

function Option({
  label,
  selected,
  graded,
  isAnswer,
  onSelect,
}: {
  label: string
  selected: boolean
  graded: Graded | null
  isAnswer: boolean
  onSelect: () => void
}) {
  const wrong = Boolean(graded) && selected && !isAnswer
  const right = Boolean(graded) && isAnswer

  return (
    <button
      onClick={onSelect}
      disabled={Boolean(graded)}
      aria-pressed={selected}
      className={cn(
        'interactive flex w-full items-center gap-3 rounded-[12px] border px-4 py-3.5 text-left text-[14.5px] leading-snug',
        right
          ? 'border-good-line bg-good-tint text-ink'
          : wrong
            ? 'border-bad-line bg-bad-tint text-ink'
            : selected
              ? 'border-accent bg-accent-tint text-ink'
              : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-raised/60 hover:text-ink',
        !graded && 'active:scale-[0.995]',
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-white',
          right
            ? 'border-good bg-good'
            : wrong
              ? 'border-bad bg-bad'
              : selected
                ? 'border-accent bg-accent'
                : 'border-line-strong bg-transparent',
        )}
      >
        {right ? <Check size={12} /> : wrong ? <XIcon size={12} /> : null}
      </span>
      <span className="min-w-0 flex-1 text-pretty">{label}</span>
    </button>
  )
}

function QuestionSkeleton() {
  return (
    <div>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-4 h-7 w-full" />
      <Skeleton className="mt-2 h-7 w-4/5" />
      <div className="mt-6 space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[52px] w-full rounded-[12px]" />
        ))}
      </div>
    </div>
  )
}

function Results({
  pack,
  history,
  onRestart,
}: {
  pack: Pack
  history: { concept: string; correct: boolean }[]
  onRestart: () => void
}) {
  const correct = history.filter((h) => h.correct).length
  const total = history.length || 1
  const ratio = correct / total

  const weak = [...new Set(history.filter((h) => !h.correct).map((h) => h.concept))]

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-12 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <p className="text-[13px] font-medium text-ink-3">
          {ratio >= 0.8 ? 'You’re ready to review' : 'Good session — here’s what to work on'}
        </p>
        <div className="mt-3 flex items-baseline justify-center gap-1">
          <span className="text-[52px] leading-none font-semibold tabular-nums text-ink">
            {correct}
          </span>
          <span className="text-[24px] leading-none font-medium text-ink-4">/{total}</span>
        </div>
        <p className="mt-3 text-[14px] text-ink-2">
          {ratio >= 0.8
            ? 'Strong recall across the concepts you were served.'
            : ratio >= 0.5
              ? 'Solid on the fundamentals; the gaps are specific and fixable.'
              : 'Worth another pass through the notes before the next quiz.'}
        </p>
      </motion.div>

      {weak.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="card mt-8 p-5"
        >
          <h2 className="text-[14px] font-semibold text-ink">Topics to review</h2>
          <ul className="mt-3 space-y-2">
            {weak.map((c) => (
              <li key={c} className="flex items-center gap-2.5 text-[13.5px] text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                {titleCase(c)}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4"
      >
        <p className="mb-2.5 px-1 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">
          Recommended next
        </p>
        <div className="flex flex-col gap-2">
          <Link to={`/app/flashcards/${pack.id}`}>
            <Button block icon={<Layers size={15} />} className="justify-start">
              Drill the {weak.length ? 'weak' : 'full'} set as flashcards
            </Button>
          </Link>
          <Link to={`/app/notes/${pack.id}`}>
            <Button block className="justify-start">
              Re-read the notes
            </Button>
          </Link>
          <Button block variant="ghost" icon={<RotateCcw size={15} />} onClick={onRestart}>
            Run the quiz again
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
