import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  Printer,
  Save,
  Send,
  Trash2,
} from 'lucide-react'
import { Page, PageHeader } from '../components/app/AppLayout'
import { Button, IconButton } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge, EmptyState, Skeleton } from '../components/ui/primitives'
import { NoteRenderer } from '../components/app/NoteRenderer'
import { useApp } from '../store/app'
import { useAuth } from '../store/auth'
import { api } from '../lib/api'
import { titleCase } from '../lib/format'
import { cn } from '../lib/cn'
import { INPUT, Labelled, Problem } from './Classes'
import type {
  ClassRoom,
  Material,
  MaterialQuestion,
  MaterialSection,
  NoteSection,
} from '../lib/types'

/**
 * One material, viewed or edited.
 *
 * The same route serves both roles because the document is the same document — what differs
 * is whether the fields are writable and whether the answer key is present at all (the server
 * strips it for a student reading assigned work, so there is nothing here to hide).
 *
 * Editing is deliberately in-place rather than a separate "edit mode": a teacher reviewing
 * generated output is already reading it, and making them press Edit first adds a step to the
 * one workflow that always happens.
 */

const AUTOSAVE_MS = 1200

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved'

export function MaterialView() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { isTeacher } = useAuth()
  const { toast } = useApp()

  const [material, setMaterial] = useState<Material | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [save, setSave] = useState<SaveState>('idle')
  const [assigning, setAssigning] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    api
      .material(id)
      .then((r) => setMaterial(r.material))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not open that.'))
  }, [id])

  const editable = Boolean(material && isTeacher && !material.readOnly)

  /** Debounced autosave. Only ever fires for an editable material. */
  const queueSave = useCallback(
    (next: Material) => {
      setMaterial(next)
      if (!isTeacher || next.readOnly) return
      setSave('dirty')
      clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        setSave('saving')
        try {
          await api.patchMaterial(next.id, { title: next.title, body: next.body })
          setSave('saved')
          setTimeout(() => setSave((s) => (s === 'saved' ? 'idle' : s)), 1800)
        } catch (e) {
          setSave('dirty')
          toast({
            tone: 'error',
            title: 'Could not save that edit',
            description: e instanceof Error ? e.message : 'Try again.',
          })
        }
      }, AUTOSAVE_MS)
    },
    [isTeacher, toast],
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  if (error) {
    return (
      <Page>
        <EmptyState icon={<ClipboardList size={19} />} title="Cannot open that material" description={error} />
      </Page>
    )
  }
  if (!material) {
    return (
      <Page>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-6 h-[220px] w-full rounded-[14px]" />
      </Page>
    )
  }

  const sections = normaliseSections(material)
  const isDocument = sections.some((s) => 'questions' in s)
  const isNotes = material.kind === 'notes' || material.kind === 'summary'

  return (
    <Page>
      <PageHeader
        title={material.title}
        description={
          material.readOnly
            ? 'Read-only — this was shared with you, and the answer key is not included.'
            : editable
              ? 'Everything below is editable. Changes save themselves.'
              : undefined
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SaveBadge state={save} readOnly={!editable} />
            <Button icon={<ArrowLeft size={15} />} onClick={() => navigate(-1)}>
              Back
            </Button>
            {isDocument && (
              <Button icon={<Printer size={15} />} onClick={() => window.print()}>
                Print
              </Button>
            )}
            {editable && (
              <Button variant="primary" icon={<Send size={15} />} onClick={() => setAssigning(true)}>
                Assign
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
        <Badge tone="neutral">{material.kind.replace('_', ' ')}</Badge>
        {material.status === 'draft' ? <Badge tone="warn">Draft</Badge> : <Badge tone="good">Published</Badge>}
        {material.body.totalMarks ? <span>{material.body.totalMarks} marks</span> : null}
        {material.body.durationMinutes ? <span>{material.body.durationMinutes} minutes</span> : null}
        {material.body.readingMinutes ? <span>{material.body.readingMinutes} min read</span> : null}
        {material.sourceId && (
          <Link to={`/app/pack/src-${material.sourceId}`} className="text-accent hover:underline">
            View the source
          </Link>
        )}
      </div>

      {material.kind === 'lesson_plan' ? (
        <LessonPlanView material={material} />
      ) : material.kind === 'flashcards' ? (
        <FlashcardList material={material} />
      ) : isNotes ? (
        <article className="card max-w-[70ch] space-y-8 p-6 sm:p-8">
          {(sections as NoteSection[]).map((s) => (
            <NoteRenderer key={s.id} section={s} />
          ))}
        </article>
      ) : (
        <QuestionDocument
          material={material}
          sections={sections as MaterialSection[]}
          editable={editable}
          onChange={queueSave}
        />
      )}

      <AssignFromMaterial
        open={assigning}
        material={material}
        onClose={() => setAssigning(false)}
        onDone={(className) => {
          setAssigning(false)
          toast({ tone: 'success', title: `${material.title} assigned`, description: className })
        }}
      />
    </Page>
  )
}

/** Quizzes carry a flat `questions` list; tests and assignments carry sections. One shape. */
function normaliseSections(material: Material): (MaterialSection | NoteSection)[] {
  if (material.body.questions) {
    return [
      {
        id: 'all',
        title: 'Questions',
        instructions: material.body.instructions,
        questions: material.body.questions,
      },
    ]
  }
  return material.body.sections ?? []
}

function SaveBadge({ state, readOnly }: { state: SaveState; readOnly: boolean }) {
  if (readOnly) return null
  if (state === 'saving')
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
        <Loader2 size={13} className="animate-spin" />
        Saving
      </span>
    )
  if (state === 'saved')
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-good">
        <CheckCircle2 size={13} />
        Saved
      </span>
    )
  if (state === 'dirty')
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-4">
        <Save size={13} />
        Unsaved
      </span>
    )
  return null
}

/* -------------------------------------------------------- the question editor */

function QuestionDocument({
  material,
  sections,
  editable,
  onChange,
}: {
  material: Material
  sections: MaterialSection[]
  editable: boolean
  onChange: (m: Material) => void
}) {
  /** Writes a mutated section list back into whichever shape the body actually uses. */
  const write = (next: MaterialSection[]) => {
    if (material.body.questions) {
      onChange({ ...material, body: { ...material.body, questions: next[0]?.questions ?? [] } })
    } else {
      onChange({ ...material, body: { ...material.body, sections: next } })
    }
  }

  const patchQuestion = (si: number, qi: number, patch: Partial<MaterialQuestion>) => {
    const next = sections.map((s, i) =>
      i !== si ? s : { ...s, questions: s.questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)) },
    )
    write(next)
  }

  const removeQuestion = (si: number, qi: number) =>
    write(sections.map((s, i) => (i !== si ? s : { ...s, questions: s.questions.filter((_, j) => j !== qi) })))

  const duplicateQuestion = (si: number, qi: number) =>
    write(
      sections.map((s, i) => {
        if (i !== si) return s
        const copy = { ...s.questions[qi], ref: `${s.questions[qi].ref}-copy-${Date.now()}` }
        return { ...s, questions: [...s.questions.slice(0, qi + 1), copy, ...s.questions.slice(qi + 1)] }
      }),
    )

  const move = (si: number, qi: number, delta: number) => {
    const to = qi + delta
    write(
      sections.map((s, i) => {
        if (i !== si || to < 0 || to >= s.questions.length) return s
        const qs = [...s.questions]
        ;[qs[qi], qs[to]] = [qs[to], qs[qi]]
        return { ...s, questions: qs }
      }),
    )
  }

  let counter = 0

  return (
    <div className="space-y-8">
      {material.body.instructions && (
        <p className="rounded-[12px] border border-line bg-raised p-3.5 text-[13.5px] leading-relaxed text-ink-2">
          {material.body.instructions}
        </p>
      )}

      {sections.map((section, si) => (
        <section key={section.id}>
          <h2 className="text-[16px] font-semibold text-ink">{section.title}</h2>
          {section.instructions && (
            <p className="mt-1 text-[13px] text-ink-3">{section.instructions}</p>
          )}

          <ol className="mt-4 space-y-3">
            {section.questions.map((q, qi) => {
              counter += 1
              return (
                <QuestionCard
                  key={q.ref}
                  number={counter}
                  question={q}
                  editable={editable}
                  onPatch={(patch) => patchQuestion(si, qi, patch)}
                  onRemove={() => removeQuestion(si, qi)}
                  onDuplicate={() => duplicateQuestion(si, qi)}
                  onMove={(d) => move(si, qi, d)}
                  first={qi === 0}
                  last={qi === section.questions.length - 1}
                />
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}

function QuestionCard({
  number,
  question,
  editable,
  onPatch,
  onRemove,
  onDuplicate,
  onMove,
  first,
  last,
}: {
  number: number
  question: MaterialQuestion
  editable: boolean
  onPatch: (p: Partial<MaterialQuestion>) => void
  onRemove: () => void
  onDuplicate: () => void
  onMove: (delta: number) => void
  first: boolean
  last: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <li className="card p-4">
      <div className="flex gap-3">
        <span className="mt-0.5 w-5 shrink-0 text-[13px] font-semibold tabular-nums text-ink-4">
          {number}.
        </span>
        <div className="min-w-0 flex-1">
          {editable ? (
            <textarea
              value={question.stem}
              onChange={(e) => onPatch({ stem: e.target.value })}
              rows={2}
              className="w-full resize-y rounded-[8px] border border-transparent bg-transparent p-1 text-[14.5px] leading-snug font-medium text-ink hover:border-line focus:border-accent focus:bg-surface focus:outline-none"
            />
          ) : (
            <p className="text-[14.5px] leading-snug font-medium text-ink">{question.stem}</p>
          )}

          {question.kind === 'mcq' && (
            <ul className="mt-2.5 space-y-1.5">
              {question.options.map((opt, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-[12px] text-ink-4">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {editable ? (
                    <input
                      value={opt}
                      onChange={(e) =>
                        onPatch({
                          options: question.options.map((o, j) => (j === i ? e.target.value : o)),
                          // Renaming the correct option must keep it correct, or editing an
                          // answer silently breaks the question.
                          ...(question.answer === opt ? { answer: e.target.value } : {}),
                        })
                      }
                      className="min-w-0 flex-1 rounded-[7px] border border-transparent bg-transparent px-1.5 py-0.5 text-[13.5px] text-ink-2 hover:border-line focus:border-accent focus:bg-surface focus:outline-none"
                    />
                  ) : (
                    <span className="text-[13.5px] text-ink-2">{opt}</span>
                  )}
                  {question.answer === opt && <Badge tone="good">Answer</Badge>}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-ink-3">
            <Badge tone="neutral">{titleCase(question.concept)}</Badge>
            {question.marks != null && (
              <label className="inline-flex items-center gap-1.5">
                Marks
                {editable ? (
                  <input
                    type="number"
                    min={0}
                    value={question.marks}
                    onChange={(e) => onPatch({ marks: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-14 rounded-[7px] border border-line bg-surface px-1.5 py-0.5 text-center tabular-nums focus:border-accent focus:outline-none"
                  />
                ) : (
                  <span className="font-medium text-ink-2">{question.marks}</span>
                )}
              </label>
            )}
            {'bloom' in question && editable && (
              <label className="inline-flex items-center gap-1.5">
                Bloom's
                <input
                  value={question.bloom ?? ''}
                  placeholder="set it"
                  onChange={(e) => onPatch({ bloom: e.target.value })}
                  className="w-24 rounded-[7px] border border-line bg-surface px-1.5 py-0.5 focus:border-accent focus:outline-none"
                />
              </label>
            )}
            {question.answer !== undefined && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="interactive font-medium text-accent hover:underline"
              >
                {open ? 'Hide' : 'Show'} answer
              </button>
            )}
          </div>

          {open && question.answer !== undefined && (
            <div className="mt-3 rounded-[10px] border border-line bg-raised p-3">
              <p className="text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">Answer</p>
              {editable ? (
                <textarea
                  value={question.answer}
                  onChange={(e) => onPatch({ answer: e.target.value })}
                  rows={2}
                  className="mt-1 w-full resize-y rounded-[8px] border border-line bg-surface p-2 text-[13.5px] leading-relaxed focus:border-accent focus:outline-none"
                />
              ) : (
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{question.answer}</p>
              )}
              {question.explanation !== undefined && (
                <>
                  <p className="mt-3 text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">
                    Explanation
                  </p>
                  {editable ? (
                    <textarea
                      value={question.explanation}
                      onChange={(e) => onPatch({ explanation: e.target.value })}
                      rows={3}
                      className="mt-1 w-full resize-y rounded-[8px] border border-line bg-surface p-2 text-[13px] leading-relaxed focus:border-accent focus:outline-none"
                    />
                  ) : (
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                      {question.explanation}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {editable && (
          <div className="flex shrink-0 flex-col gap-0.5">
            <IconButton label="Move up" size="sm" className="text-ink-4" disabled={first} onClick={() => onMove(-1)}>
              <span aria-hidden>↑</span>
            </IconButton>
            <IconButton label="Move down" size="sm" className="text-ink-4" disabled={last} onClick={() => onMove(1)}>
              <span aria-hidden>↓</span>
            </IconButton>
            <IconButton label="Duplicate" size="sm" className="text-ink-4" onClick={onDuplicate}>
              <Plus size={14} />
            </IconButton>
            <IconButton label="Delete" size="sm" className="text-ink-4 hover:text-bad" onClick={onRemove}>
              <Trash2 size={14} />
            </IconButton>
          </div>
        )}
      </div>
    </li>
  )
}

/* ------------------------------------------------------------- other kinds */

function LessonPlanView({ material }: { material: Material }) {
  const b = material.body
  return (
    <div className="space-y-5">
      {b.scaffold && (
        <div className="flex gap-2.5 rounded-[12px] border border-warn-line bg-warn-tint p-3.5">
          <Badge tone="warn" className="mt-px h-fit shrink-0">
            Scaffold
          </Badge>
          <p className="text-[13px] leading-relaxed text-ink-2">
            The objectives and the sequence come from the material's own concept structure, and
            the timings are arithmetic over the lesson length. This is a starting structure to
            write into, not a finished plan.
          </p>
        </div>
      )}
      <div className="card p-5">
        <h2 className="text-[15px] font-semibold text-ink">Objectives</h2>
        <ul className="mt-2.5 space-y-1.5">
          {(b.objectives ?? []).map((o) => (
            <li key={o} className="flex gap-2 text-[13.5px] leading-relaxed text-ink-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-5" />
              {o}
            </li>
          ))}
        </ul>
      </div>
      <div className="card p-5">
        <h2 className="text-[15px] font-semibold text-ink">
          Sequence · {b.durationMinutes} minutes
        </h2>
        <ol className="mt-3 space-y-2.5">
          {(b.activities ?? []).map((a, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-14 shrink-0 text-[12.5px] font-medium tabular-nums text-ink-3">
                {a.minutes} min
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-ink">{a.title}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-2">
                  {a.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-[15px] font-semibold text-ink">Assessment</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{b.assessment}</p>
        </div>
        <div className="card p-5">
          <h2 className="text-[15px] font-semibold text-ink">Differentiation</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{b.differentiation}</p>
        </div>
      </div>
    </div>
  )
}

function FlashcardList({ material }: { material: Material }) {
  const cards = material.body.cards ?? []
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {cards.map((c) => (
        <li key={c.id} className="card p-4">
          <p className="text-[14px] font-medium text-ink">{c.front}</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{c.back}</p>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------- assign */

function AssignFromMaterial({
  open,
  material,
  onClose,
  onDone,
}: {
  open: boolean
  material: Material
  onClose: () => void
  onDone: (className: string) => void
}) {
  const [classes, setClasses] = useState<ClassRoom[] | null>(null)
  const [classId, setClassId] = useState('')
  const [due, setDue] = useState('')
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    api
      .classes()
      .then((r) => setClasses(r.teaching))
      .catch(() => setClasses([]))
  }, [open])

  const chosen = useMemo(() => classes?.find((c) => c.id === classId), [classes, classId])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assign ${material.title}`}
      description="Students in the class see it immediately."
    >
      {classes === null ? (
        <Skeleton className="h-20 w-full" />
      ) : !classes.length ? (
        <EmptyState
          icon={<ClipboardList size={19} />}
          title="No classes yet"
          description="Create a class first — it is how material reaches students."
          action={
            <Link to="/app/classes">
              <Button variant="primary">Go to classes</Button>
            </Link>
          }
        />
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError(null)
            try {
              await api.assign(classId, {
                materialId: material.id,
                instructions: instructions || undefined,
                dueAt: due ? new Date(due).getTime() / 1000 : null,
              })
              onDone(chosen?.name ?? 'the class')
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not assign that.')
            } finally {
              setBusy(false)
            }
          }}
          className="flex flex-col gap-3.5"
        >
          <Labelled label="Class">
            <select required value={classId} onChange={(e) => setClassId(e.target.value)} className={INPUT}>
              <option value="">Choose…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Labelled>
          <Labelled label="Due date (optional)">
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={INPUT} />
          </Labelled>
          <Labelled label="Instructions (optional)">
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="interactive w-full resize-y rounded-[12px] border border-line bg-surface p-3 text-[13.5px] leading-relaxed hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
            />
          </Labelled>
          <Problem message={error} />
          <div className={cn('flex justify-end gap-2 pt-1')}>
            <Button onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={busy} disabled={!classId}>
              Assign
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
