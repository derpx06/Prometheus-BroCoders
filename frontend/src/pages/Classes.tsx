import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  ClipboardList,
  Copy,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { Page, PageHeader } from '../components/app/AppLayout'
import { Button, IconButton } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge, EmptyState, ProgressBar, Skeleton } from '../components/ui/primitives'
import { useApp } from '../store/app'
import { useAuth } from '../store/auth'
import { api, type ClassView } from '../lib/api'
import { pct, relativeTime } from '../lib/format'
import { cn } from '../lib/cn'
import type { Assignment, ClassRoom, Material } from '../lib/types'

/* -------------------------------------------------------------------- the list */

export function Classes() {
  const { isTeacher } = useAuth()
  const { toast } = useApp()
  const [data, setData] = useState<{ teaching: ClassRoom[]; enrolled: ClassRoom[] } | null>(null)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  const load = useCallback(() => {
    api
      .classes()
      .then(setData)
      .catch(() => setData({ teaching: [], enrolled: [] }))
  }, [])

  useEffect(load, [load])

  const nothing = data && !data.teaching.length && !data.enrolled.length

  return (
    <Page>
      <PageHeader
        title={isTeacher ? 'Classes' : 'My classes'}
        description={
          isTeacher
            ? 'A class is how material reaches students. Share its code and they join themselves.'
            : 'Work your teachers have assigned you lives in here.'
        }
        action={
          <div className="flex gap-2">
            <Button icon={<UserPlus size={15} />} onClick={() => setJoining(true)}>
              Join a class
            </Button>
            {isTeacher && (
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreating(true)}>
                New class
              </Button>
            )}
          </div>
        }
      />

      {!data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-[14px]" />
          ))}
        </div>
      ) : nothing ? (
        <EmptyState
          icon={<Users size={19} />}
          title={isTeacher ? 'No classes yet' : 'You have not joined a class'}
          description={
            isTeacher
              ? 'Create one, share the code, and anything you generate can be assigned to it.'
              : 'Ask your teacher for the six-character class code.'
          }
          action={
            isTeacher ? (
              <Button variant="primary" onClick={() => setCreating(true)}>
                Create a class
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setJoining(true)}>
                Enter a code
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-8">
          {data.teaching.length > 0 && (
            <Group title="Teaching" classes={data.teaching} showCode />
          )}
          {data.enrolled.length > 0 && <Group title="Enrolled" classes={data.enrolled} />}
        </div>
      )}

      <CreateClassModal
        open={creating}
        onClose={() => setCreating(false)}
        onDone={(klass) => {
          setCreating(false)
          load()
          toast({ tone: 'success', title: `${klass.name} created`, description: `Code ${klass.joinCode}` })
        }}
      />
      <JoinModal
        open={joining}
        onClose={() => setJoining(false)}
        onDone={(klass) => {
          setJoining(false)
          load()
          toast({ tone: 'success', title: `Joined ${klass.name}` })
        }}
      />
    </Page>
  )
}

function Group({
  title,
  classes,
  showCode,
}: {
  title: string
  classes: ClassRoom[]
  showCode?: boolean
}) {
  return (
    <section>
      <h2 className="mb-3 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <Link
            key={c.id}
            to={`/app/classes/${c.id}`}
            className="interactive card flex flex-col p-4 hover:border-line-strong hover:shadow-sm"
          >
            <h3 className="text-[15px] font-semibold text-ink">{c.name}</h3>
            <p className="mt-0.5 text-[12.5px] text-ink-3">
              {c.teacherName ? `${c.teacherName} · ` : ''}
              {c.subject ?? 'No subject set'}
            </p>
            <div className="mt-auto flex items-center gap-2 pt-4 text-[12px] text-ink-3">
              {typeof c.studentCount === 'number' && (
                <span className="inline-flex items-center gap-1">
                  <Users size={12.5} />
                  {c.studentCount} student{c.studentCount === 1 ? '' : 's'}
                </span>
              )}
              {showCode && <CodeChip code={c.joinCode} />}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function CodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <span
      role="button"
      tabIndex={0}
      title="Copy the class code"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        navigator.clipboard?.writeText(code).then(
          () => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
          },
          () => undefined,
        )
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.currentTarget as HTMLElement).click()
      }}
      className="interactive ml-auto inline-flex items-center gap-1 rounded-[7px] border border-line bg-raised px-1.5 py-0.5 font-mono text-[11.5px] tracking-wider text-ink-2 hover:border-line-strong"
    >
      {copied ? <Check size={11} className="text-good" /> : <Copy size={11} />}
      {code}
    </span>
  )
}

function CreateClassModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: (c: ClassRoom) => void
}) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New class"
      description="Students join with the code this creates — you do not have to add them one by one."
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            const { class: created } = await api.createClass({
              name,
              subject: subject || undefined,
              grade: grade || undefined,
            })
            setName('')
            setSubject('')
            setGrade('')
            onDone(created)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create that class.')
          } finally {
            setBusy(false)
          }
        }}
        className="flex flex-col gap-3.5"
      >
        <Labelled label="Class name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Grade 9 Biology"
            className={INPUT}
          />
        </Labelled>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Labelled label="Subject (optional)">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={INPUT} />
          </Labelled>
          <Labelled label="Grade (optional)">
            <input value={grade} onChange={(e) => setGrade(e.target.value)} className={INPUT} />
          </Labelled>
        </div>
        <Problem message={error} />
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={busy} disabled={!name.trim()}>
            Create class
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function JoinModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: (c: ClassRoom) => void
}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal open={open} onClose={onClose} title="Join a class" description="Six characters, not case-sensitive.">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            const { class: joined } = await api.joinClass(code.trim())
            setCode('')
            onDone(joined)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not join that class.')
          } finally {
            setBusy(false)
          }
        }}
        className="flex flex-col gap-3.5"
      >
        <Labelled label="Class code">
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="K7M2QX"
            maxLength={12}
            className={cn(INPUT, 'font-mono tracking-wider')}
          />
        </Labelled>
        <Problem message={error} />
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={busy} disabled={code.trim().length < 4}>
            Join
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ the detail */

export function ClassDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useApp()
  const [view, setView] = useState<ClassView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [inviting, setInviting] = useState(false)

  const load = useCallback(() => {
    api
      .classView(id)
      .then(setView)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not open that class.'))
  }, [id])

  useEffect(load, [load])

  if (error) {
    return (
      <Page>
        <EmptyState
          icon={<Users size={19} />}
          title="Cannot open that class"
          description={error}
          action={
            <Link to="/app/classes">
              <Button variant="primary">All classes</Button>
            </Link>
          }
        />
      </Page>
    )
  }

  if (!view) {
    return (
      <Page>
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-6 h-[140px] w-full rounded-[14px]" />
      </Page>
    )
  }

  const { class: klass, teaching, assignments, members } = view
  const students = (members ?? []).filter((m) => m.role === 'student')

  return (
    <Page>
      <PageHeader
        title={klass.name}
        description={
          teaching
            ? `Share the code ${klass.joinCode} and students join themselves.`
            : klass.teacherName
              ? `Taught by ${klass.teacherName}.`
              : undefined
        }
        action={
          teaching ? (
            <div className="flex flex-wrap gap-2">
              <Link to={`/app/analytics?class=${klass.id}`}>
                <Button icon={<BarChart3 size={15} />}>Results</Button>
              </Link>
              <Button icon={<UserPlus size={15} />} onClick={() => setInviting(true)}>
                Invite
              </Button>
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => setAssigning(true)}>
                Assign work
              </Button>
            </div>
          ) : undefined
        }
      />

      {teaching && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-surface p-4">
          <span className="text-[12.5px] font-medium text-ink-2">Class code</span>
          <CodeChip code={klass.joinCode} />
          <span className="text-[12.5px] text-ink-3">
            · {students.length} student{students.length === 1 ? '' : 's'} joined
          </span>
        </div>
      )}

      <section className="mb-9">
        <h2 className="mb-3 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">
          {teaching ? 'Assigned work' : 'Your work'}
        </h2>
        {assignments.length ? (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <AssignmentRow key={a.id} assignment={a} teaching={teaching} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<ClipboardList size={19} />}
            title={teaching ? 'Nothing assigned yet' : 'No work assigned yet'}
            description={
              teaching
                ? 'Generate a quiz or a test, then assign it here. Students see it immediately.'
                : 'When your teacher assigns something it will appear here.'
            }
            action={
              teaching ? (
                <Button variant="primary" onClick={() => setAssigning(true)}>
                  Assign work
                </Button>
              ) : undefined
            }
          />
        )}
      </section>

      {teaching && (
        <section>
          <h2 className="mb-3 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">
            Roster
          </h2>
          {students.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
              {students.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">{m.name}</span>
                    <span className="block truncate text-[12px] text-ink-3">{m.email}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-4">
                    joined {relativeTime(m.joined_at * 1000)}
                  </span>
                  <IconButton
                    label={`Remove ${m.name}`}
                    size="sm"
                    className="shrink-0 text-ink-4 hover:text-bad"
                    onClick={async () => {
                      await api.removeMember(klass.id, m.id)
                      toast({ tone: 'default', title: `${m.name} removed from ${klass.name}` })
                      load()
                    }}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Users size={19} />}
              title="Nobody has joined"
              description={`Share the code ${klass.joinCode}, or send an invitation by email.`}
              action={
                <Button variant="primary" onClick={() => setInviting(true)}>
                  Send an invitation
                </Button>
              }
            />
          )}
        </section>
      )}

      <AssignModal
        open={assigning}
        classId={klass.id}
        onClose={() => setAssigning(false)}
        onDone={(a) => {
          setAssigning(false)
          load()
          toast({ tone: 'success', title: `${a.title} assigned`, description: klass.name })
        }}
      />
      <InviteModal
        open={inviting}
        classId={klass.id}
        onClose={() => setInviting(false)}
        onDone={() => navigate(0)}
      />
    </Page>
  )
}

function AssignmentRow({ assignment, teaching }: { assignment: Assignment; teaching: boolean }) {
  const done = assignment.attemptId != null
  const ratio =
    teaching && assignment.submissions != null ? assignment.submissions : null

  return (
    <li>
      <Link
        to={`/app/assignments/${assignment.id}`}
        className="interactive flex items-center gap-3 rounded-[12px] border border-line bg-surface p-4 hover:border-line-strong hover:bg-raised/40"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[14.5px] font-medium text-ink">{assignment.title}</span>
            {assignment.materialKind && (
              <Badge tone="neutral">{assignment.materialKind.replace('_', ' ')}</Badge>
            )}
            {!teaching && done && <Badge tone="good">Submitted</Badge>}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
            {assignment.dueAt ? (
              <span className="inline-flex items-center gap-1">
                <CalendarClock size={12.5} />
                due {new Date(assignment.dueAt * 1000).toLocaleDateString()}
              </span>
            ) : (
              <span>No due date</span>
            )}
            {ratio !== null && (
              <span>
                {ratio} submission{ratio === 1 ? '' : 's'}
              </span>
            )}
            {!teaching && done && assignment.score != null && (
              <span className="font-medium text-ink-2">Scored {assignment.score}</span>
            )}
          </span>
        </span>
        <ArrowRight size={15} className="shrink-0 text-ink-4" />
      </Link>
    </li>
  )
}

function AssignModal({
  open,
  classId,
  onClose,
  onDone,
}: {
  open: boolean
  classId: string
  onClose: () => void
  onDone: (a: Assignment) => void
}) {
  const [materials, setMaterials] = useState<Omit<Material, 'body'>[] | null>(null)
  const [materialId, setMaterialId] = useState('')
  const [due, setDue] = useState('')
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    api
      .materials()
      .then((r) =>
        setMaterials(
          r.materials.filter((m) =>
            ['quiz', 'test', 'assignment', 'notes', 'summary', 'flashcards'].includes(m.kind),
          ),
        ),
      )
      .catch(() => setMaterials([]))
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign work"
      description="Pick something from your library. Students in this class see it straight away."
    >
      {materials === null ? (
        <Skeleton className="h-20 w-full" />
      ) : materials.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={19} />}
          title="Nothing to assign yet"
          description="Generate a quiz, test or assignment first — then it can be assigned to a class."
          action={
            <Link to="/app/create">
              <Button variant="primary">Create with AI</Button>
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
              const { assignment } = await api.assign(classId, {
                materialId,
                instructions: instructions || undefined,
                dueAt: due ? new Date(due).getTime() / 1000 : null,
              })
              onDone(assignment)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not assign that.')
            } finally {
              setBusy(false)
            }
          }}
          className="flex flex-col gap-3.5"
        >
          <Labelled label="What to assign">
            <select
              required
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className={INPUT}
            >
              <option value="">Choose…</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.kind.replace('_', ' ')})
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
              placeholder="Complete before Friday's lesson."
              className="interactive w-full resize-y rounded-[12px] border border-line bg-surface p-3 text-[13.5px] leading-relaxed hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
            />
          </Labelled>
          <Problem message={error} />
          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={busy} disabled={!materialId}>
              Assign
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function InviteModal({
  open,
  classId,
  onClose,
  onDone,
}: {
  open: boolean
  classId: string
  onClose: () => void
  onDone: () => void
}) {
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  return (
    <Modal
      open={open}
      onClose={() => {
        setUrl(null)
        setEmail('')
        onClose()
      }}
      title="Invite a student"
      description="This creates a single-use link. They choose their own password — you never see it."
    >
      {url ? (
        <div>
          <p className="text-[13.5px] leading-relaxed text-ink-2">
            Send this link to {email}. It works once and expires in 14 days.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-[12px] border border-line bg-raised p-3">
            <code className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">{url}</code>
            <Button
              size="sm"
              icon={copied ? <Check size={14} /> : <Copy size={14} />}
              onClick={() =>
                navigator.clipboard?.writeText(url).then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1600)
                })
              }
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                setUrl(null)
                setEmail('')
                onDone()
              }}
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError(null)
            try {
              const invite = await api.invite({ email, role: 'student', class_id: classId })
              setUrl(invite.url)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not create that invitation.')
            } finally {
              setBusy(false)
            }
          }}
          className="flex flex-col gap-3.5"
        >
          <Labelled label="Their email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT}
            />
          </Labelled>
          <Problem message={error} />
          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={busy} disabled={!email.trim()}>
              Create invitation
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/* -------------------------------------------------------------------- shared */

export const INPUT =
  'interactive h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px] hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12'

export function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  )
}

export function Problem({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="flex gap-2.5 rounded-[12px] border border-bad-line bg-bad-tint p-3">
      <AlertCircle size={16} className="mt-px shrink-0 text-bad" />
      <p className="text-[13px] leading-relaxed text-ink">{message}</p>
    </div>
  )
}

export { ProgressBar, pct }
