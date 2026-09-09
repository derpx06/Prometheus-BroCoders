import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronLeft,
  ClipboardList,
  Target,
  Users,
  X as XIcon,
} from 'lucide-react'
import { Page, PageHeader } from '../components/app/AppLayout'
import { Button } from '../components/ui/Button'
import { Badge, EmptyState, ProgressBar, Skeleton } from '../components/ui/primitives'
import { useAuth } from '../store/auth'
import { api, type AnswerResult, type AssignmentView } from '../lib/api'
import { pct, relativeTime, titleCase } from '../lib/format'
import { cn } from '../lib/cn'
import type { Assignment, Attempt, Material, MaterialQuestion } from '../lib/types'

/* ------------------------------------------------------------- student's list */

export function Assignments() {
  const [items, setItems] = useState<Assignment[] | null>(null)

  useEffect(() => {
    api
      .assignments()
      .then((r) => setItems(r.assignments))
      .catch(() => setItems([]))
  }, [])

  const pending = (items ?? []).filter((a) => !a.attemptId)
  const done = (items ?? []).filter((a) => a.attemptId)

  return (
    <Page>
      <PageHeader
        title="Assignments"
        description="Work your teachers have set. Everything is graded the moment you answer it."
      />

      {!items ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-[12px]" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState
          icon={<ClipboardList size={19} />}
          title="Nothing assigned"
          description="When a teacher assigns work it appears here. In the meantime, Practice builds questions from your own material."
          action={
            <Link to="/app/practice">
              <Button variant="primary">Practice instead</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && <List title="To do" items={pending} />}
          {done.length > 0 && <List title="Completed" items={done} />}
        </div>
      )}
    </Page>
  )
}

function List({ title, items }: { title: string; items: Assignment[] }) {
  return (
    <section>
      <h2 className="mb-3 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">{title}</h2>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id}>
            <Link
              to={`/app/assignments/${a.id}`}
              className="interactive flex items-center gap-3 rounded-[12px] border border-line bg-surface p-4 hover:border-line-strong hover:bg-raised/40"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[14.5px] font-medium text-ink">{a.title}</span>
                  {a.materialKind && <Badge tone="neutral">{a.materialKind.replace('_', ' ')}</Badge>}
                  {a.attemptId && <Badge tone="good">Submitted</Badge>}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 text-[12.5px] text-ink-3">
                  {a.className && <span>{a.className}</span>}
                  {a.dueAt ? (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock size={12.5} />
                      due {new Date(a.dueAt * 1000).toLocaleDateString()}
                    </span>
                  ) : (
                    <span>No due date</span>
                  )}
                </span>
              </span>
              <ArrowRight size={15} className="shrink-0 text-ink-4" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------ one assignment */

export function AssignmentDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { isTeacher } = useAuth()
  const [view, setView] = useState<AssignmentView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    api
      .assignment(id)
      .then(setView)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not open that.'))
  }, [id])

  if (error) {
    return (
      <Page>
        <EmptyState icon={<ClipboardList size={19} />} title="Cannot open that assignment" description={error} />
      </Page>
    )
  }
  if (!view) {
    return (
      <Page>
        <Skeleton className="h-8 w-60" />
        <Skeleton className="mt-6 h-[160px] w-full rounded-[14px]" />
      </Page>
    )
  }

  const { assignment, teaching, results, openAttemptId, locked } = view

  return (
    <Page>
      <PageHeader
        title={assignment.title}
        description={assignment.instructions ?? undefined}
        action={
          <Link to={`/app/classes/${assignment.classId}`}>
            <Button icon={<ChevronLeft size={15} />}>{assignment.className ?? 'Class'}</Button>
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
        {assignment.materialKind && <Badge tone="neutral">{assignment.materialKind.replace('_', ' ')}</Badge>}
        {assignment.dueAt ? (
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={13} />
            Due {new Date(assignment.dueAt * 1000).toLocaleDateString()}
          </span>
        ) : (
          <span>No due date</span>
        )}
        {locked && <Badge tone="warn">Locked — work has been submitted</Badge>}
      </div>

      {teaching ? (
        <TeacherResults assignment={assignment} results={results ?? []} />
      ) : (
        <div className="card p-6">
          <h2 className="text-[16px] font-semibold text-ink">
            {openAttemptId ? 'You have this open' : 'Ready when you are'}
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
            Each answer is checked as you go, and you get an explanation either way. You can stop
            part way through and come back — answers you have given are kept.
          </p>
          <div className="mt-5 flex gap-2">
            <Button
              variant="primary"
              size="lg"
              loading={starting}
              iconRight={<ArrowRight size={16} />}
              onClick={async () => {
                setStarting(true)
                try {
                  const { attempt } = await api.startAttempt(assignment.id)
                  navigate(`/app/attempt/${attempt.id}`)
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not start that.')
                } finally {
                  setStarting(false)
                }
              }}
            >
              {openAttemptId ? 'Continue' : 'Start'}
            </Button>
            {isTeacher && (
              <Link to={`/app/material/${assignment.materialId}`}>
                <Button>View the material</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </Page>
  )
}

function TeacherResults({
  assignment,
  results,
}: {
  assignment: Assignment
  results: NonNullable<AssignmentView['results']>
}) {
  if (!results.length) {
    return (
      <EmptyState
        icon={<Users size={19} />}
        title="No submissions yet"
        description="Results appear here as students submit. Nothing is estimated in the meantime — an empty table is the honest answer."
        action={
          <Link to={`/app/material/${assignment.materialId}`}>
            <Button variant="primary">Review the material</Button>
          </Link>
        }
      />
    )
  }

  const scored = results.filter((r) => r.score != null && r.max_score)
  const mean = scored.length
    ? scored.reduce((n, r) => n + r.score! / r.max_score!, 0) / scored.length
    : null

  return (
    <div>
      {mean !== null && (
        <div className="mb-5 flex flex-wrap items-center gap-5 rounded-[14px] border border-line bg-surface p-4">
          <Stat label="Submissions" value={String(results.length)} />
          <Stat label="Class average" value={pct(mean)} />
        </div>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
        {results.map((r) => {
          const ratio = r.score != null && r.max_score ? r.score / r.max_score : null
          return (
            <li key={r.id} className="flex items-center gap-4 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
                {r.student_name}
              </span>
              {ratio !== null && (
                <span className="hidden w-32 shrink-0 sm:block">
                  <ProgressBar value={ratio} height={4} tone={ratio >= 0.7 ? 'good' : 'ink'} />
                </span>
              )}
              <span className="w-20 shrink-0 text-right text-[13px] tabular-nums text-ink-2">
                {r.score != null ? `${Math.round(r.score * 10) / 10}/${r.max_score}` : '—'}
              </span>
              <span className="hidden w-28 shrink-0 text-right text-[12px] text-ink-4 sm:block">
                {relativeTime(r.submitted_at * 1000)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="block text-[11.5px] font-medium tracking-wide text-ink-3 uppercase">
        {label}
      </span>
      <span className="mt-0.5 block text-[20px] font-semibold tabular-nums text-ink">{value}</span>
    </span>
  )
}

/* ---------------------------------------------------------- taking an attempt */

export function AttemptPlayer() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [material, setMaterial] = useState<Material | null>(null)
  const [index, setIndex] = useState(0)
  const [choice, setChoice] = useState('')
  const [text, setText] = useState('')
  const [graded, setGraded] = useState<AnswerResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState<Attempt | null>(null)

  const load = useCallback(async () => {
    try {
      const { attempt: a } = await api.attempt(id)
      setAttempt(a)
      if (a.submitted_at) setFinished(a)
      if (a.material_id) {
        const { material: m } = await api.material(a.material_id)
        setMaterial(m)
        // Resume where they left off rather than restarting from question one.
        setIndex(a.answers.length)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open that attempt.')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (error) {
    return (
      <Page>
        <EmptyState icon={<Target size={19} />} title="Cannot open that" description={error} />
      </Page>
    )
  }
  if (!attempt || !material) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-10">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-6 h-8 w-full" />
        <div className="mt-6 space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[52px] w-full rounded-[12px]" />
          ))}
        </div>
      </div>
    )
  }

  const questions: MaterialQuestion[] =
    material.body.questions ??
    (material.body.sections ?? []).flatMap((s) =>
      'questions' in s && Array.isArray(s.questions) ? (s.questions as MaterialQuestion[]) : [],
    )

  if (finished) return <AttemptResults attempt={finished} questions={questions} />

  const question = questions[index]
  if (!question) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 py-16 text-center">
        <h1 className="text-[21px] font-semibold text-ink">That is everything</h1>
        <p className="mt-2 text-[14px] text-ink-2">
          Submit to record it. Your answers are already saved.
        </p>
        <div className="mt-6">
          <Button
            variant="primary"
            size="lg"
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                const { attempt: done } = await api.submitAttempt(attempt.id)
                setFinished(done)
              } finally {
                setBusy(false)
              }
            }}
          >
            Submit
          </Button>
        </div>
      </div>
    )
  }

  const total = questions.length

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="interactive -ml-1.5 inline-flex items-center gap-1 rounded-[8px] px-1.5 py-1 text-[13px] font-medium text-ink-3 hover:bg-raised hover:text-ink"
        >
          <ChevronLeft size={14} />
          Exit
        </button>
        <span className="ml-auto text-[13px] font-medium tabular-nums text-ink-2">
          Question {index + 1} / {total}
        </span>
      </div>
      <ProgressBar value={(index + (graded ? 1 : 0)) / total} height={4} tone="ink" />

      <motion.div
        key={question.ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{titleCase(question.concept)}</Badge>
          {question.marks != null && <Badge tone="accent">{question.marks} mark{question.marks === 1 ? '' : 's'}</Badge>}
        </div>

        <h1 className="text-[21px] leading-snug font-semibold text-balance text-ink sm:text-[24px]">
          {question.stem}
        </h1>

        {question.kind === 'mcq' ? (
          <div className="mt-6 space-y-2.5">
            {question.options.map((opt) => {
              const isAnswer = graded ? opt === graded.idealAnswer : false
              const wrong = Boolean(graded) && choice === opt && !isAnswer
              return (
                <button
                  key={opt}
                  onClick={() => !graded && setChoice(opt)}
                  disabled={Boolean(graded)}
                  aria-pressed={choice === opt}
                  className={cn(
                    'interactive flex w-full items-center gap-3 rounded-[12px] border px-4 py-3.5 text-left text-[14.5px] leading-snug',
                    graded && isAnswer
                      ? 'border-good-line bg-good-tint text-ink'
                      : wrong
                        ? 'border-bad-line bg-bad-tint text-ink'
                        : choice === opt
                          ? 'border-accent bg-accent-tint text-ink'
                          : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-raised/60 hover:text-ink',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-white',
                      graded && isAnswer
                        ? 'border-good bg-good'
                        : wrong
                          ? 'border-bad bg-bad'
                          : choice === opt
                            ? 'border-accent bg-accent'
                            : 'border-line-strong bg-transparent',
                    )}
                  >
                    {graded && isAnswer ? <Check size={12} /> : wrong ? <XIcon size={12} /> : null}
                  </span>
                  <span className="min-w-0 flex-1 text-pretty">{opt}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={Boolean(graded)}
            rows={5}
            placeholder="Answer in your own words."
            className="interactive mt-6 w-full resize-y rounded-[12px] border border-line bg-surface p-3.5 text-[14.5px] leading-relaxed hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12 disabled:bg-raised/60"
          />
        )}

        {graded && (
          <div
            className={cn(
              'mt-5 rounded-[14px] border p-4',
              graded.correct ? 'border-good-line bg-good-tint' : 'border-bad-line bg-bad-tint',
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
              <p className={cn('text-[14px] font-semibold', graded.correct ? 'text-good' : 'text-bad')}>
                {graded.correct ? 'Correct' : 'Not quite'}
              </p>
              <span className="ml-auto text-[12px] tabular-nums text-ink-3">
                {Math.round(graded.awarded * 10) / 10} / {graded.marks}
              </span>
            </div>
            <p className="mt-2.5 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">Why</p>
            <p className="mt-1 text-[14px] leading-relaxed text-pretty text-ink-2">
              {graded.explanation}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {graded ? (
            <Button
              variant="primary"
              size="lg"
              iconRight={<ArrowRight size={16} />}
              onClick={() => {
                setGraded(null)
                setChoice('')
                setText('')
                setIndex((i) => i + 1)
              }}
            >
              {index + 1 >= total ? 'Finish' : 'Next question'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              loading={busy}
              disabled={question.kind === 'mcq' ? !choice : !text.trim()}
              onClick={async () => {
                setBusy(true)
                try {
                  setGraded(
                    await api.answerAttempt(
                      attempt.id,
                      question.ref,
                      question.kind === 'mcq' ? choice : text,
                    ),
                  )
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not check that answer.')
                } finally {
                  setBusy(false)
                }
              }}
            >
              Check answer
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function AttemptResults({
  attempt,
  questions,
}: {
  attempt: Attempt
  questions: MaterialQuestion[]
}) {
  const ratio = attempt.score != null && attempt.max_score ? attempt.score / attempt.max_score : 0
  const wrong = attempt.answers.filter((a) => !a.correct)
  const weak = [...new Set(wrong.map((a) => a.concept).filter(Boolean))] as string[]

  return (
    <div className="mx-auto w-full max-w-[620px] px-4 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <p className="text-[13px] font-medium text-ink-3">Submitted</p>
        <div className="mt-3 flex items-baseline justify-center gap-1">
          <span className="text-[52px] leading-none font-semibold tabular-nums text-ink">
            {Math.round((attempt.score ?? 0) * 10) / 10}
          </span>
          <span className="text-[24px] leading-none font-medium text-ink-4">
            /{attempt.max_score}
          </span>
        </div>
        <p className="mt-3 text-[14px] text-ink-2">
          {ratio >= 0.8
            ? 'Strong across the whole set.'
            : ratio >= 0.5
              ? 'Solid on the fundamentals; the gaps are specific.'
              : 'Worth another pass through the notes before the next one.'}
        </p>
      </motion.div>

      {weak.length > 0 && (
        <div className="card mt-8 p-5">
          <h2 className="text-[14px] font-semibold text-ink">Concepts to review</h2>
          <ul className="mt-3 space-y-2">
            {weak.map((c) => (
              <li key={c} className="flex items-center gap-2.5 text-[13.5px] text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                {titleCase(c)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card mt-4 divide-y divide-line">
        <h2 className="p-5 pb-3 text-[14px] font-semibold text-ink">Every answer</h2>
        {attempt.answers.map((a) => {
          const q = questions.find((x) => x.ref === a.question_ref)
          return (
            <div key={a.id} className="p-5">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white',
                    a.correct ? 'bg-good' : 'bg-bad',
                  )}
                >
                  {a.correct ? <Check size={12} /> : <XIcon size={12} />}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] leading-snug font-medium text-ink">
                    {a.prompt ?? q?.stem}
                  </p>
                  <p className="mt-1.5 text-[13px] text-ink-2">
                    You answered: <span className="text-ink">{a.response || '—'}</span>
                  </p>
                  {/* The key comes back on the submitted attempt, not on the material, so a
                      student sees the right answer here and only here. */}
                  {!a.correct && (a.ideal_answer ?? q?.answer) && (
                    <p className="mt-1 text-[13px] text-ink-2">
                      Expected: <span className="text-ink">{a.ideal_answer ?? q?.answer}</span>
                    </p>
                  )}
                  {(a.explanation ?? q?.explanation) && (
                    <p className="mt-2 text-[13px] leading-relaxed text-pretty text-ink-3">
                      {a.explanation ?? q?.explanation}
                    </p>
                  )}
                </div>
                <span className="ml-auto shrink-0 text-[12px] tabular-nums text-ink-4">
                  {Math.round(a.score * 10) / 10}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link to="/app/assignments" className="flex-1">
          <Button block variant="primary">
            Back to assignments
          </Button>
        </Link>
        <Link to="/app/progress" className="flex-1">
          <Button block>See my progress</Button>
        </Link>
      </div>
    </div>
  )
}
