import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, GraduationCap, Mail, Plus, Trash2 } from 'lucide-react'
import { Page, PageHeader } from '../components/app/AppLayout'
import { Button, IconButton } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge, EmptyState, ProgressBar, Skeleton } from '../components/ui/primitives'
import { useApp } from '../store/app'
import { useAuth } from '../store/auth'
import { api } from '../lib/api'
import { relativeTime } from '../lib/format'
import { INPUT, Labelled, Problem } from './Classes'

/**
 * Teacher seats for a school administrator.
 *
 * Savitrix generated a temporary password, stored it in plaintext, and returned it from the
 * teacher-list API so the admin could read it out. Nothing here does that: an invitation is a
 * single-use link whose token is only ever stored as a hash, and the teacher chooses their own
 * password when they accept it. The admin never has access to a credential.
 */
export function Teachers() {
  const { school } = useAuth()
  const { toast } = useApp()
  const [data, setData] = useState<Awaited<ReturnType<typeof api.teachers>> | null>(null)
  const [inviting, setInviting] = useState(false)

  const load = useCallback(() => {
    api
      .teachers()
      .then(setData)
      .catch(() => setData(null))
  }, [])

  useEffect(load, [load])

  const limit = data?.seats.limit
  const used = data?.seats.used ?? 0

  return (
    <Page>
      <PageHeader
        title="Teachers"
        description={school ? `${school.name} — seats and invitations.` : undefined}
        action={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setInviting(true)}>
            Invite a teacher
          </Button>
        }
      />

      {!data ? (
        <Skeleton className="h-[220px] w-full rounded-[14px]" />
      ) : (
        <div className="space-y-8">
          <section className="card p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">
                  Teacher seats
                </p>
                <p className="mt-1 text-[24px] leading-none font-semibold tabular-nums text-ink">
                  {used}
                  <span className="text-[16px] font-medium text-ink-4">
                    {limit == null ? ' / unlimited' : ` / ${limit}`}
                  </span>
                </p>
              </div>
              <Badge tone="accent">{data.plan} plan</Badge>
            </div>
            {limit != null && (
              <div className="mt-4">
                <ProgressBar value={Math.min(1, used / limit)} height={5} tone={used >= limit ? 'warn' : 'ink'} />
                <p className="mt-2 text-[12.5px] text-ink-3">
                  An administrator account does not use a seat. Outstanding invitations count
                  toward the limit, so a seat cannot be double-booked.
                </p>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">
              Teachers
            </h2>
            {data.teachers.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
                {data.teachers.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink">{t.name}</span>
                      <span className="block truncate text-[12px] text-ink-3">{t.email}</span>
                    </span>
                    <span className="shrink-0 text-[12px] text-ink-4">
                      joined {relativeTime(t.created_at * 1000)}
                    </span>
                    <IconButton
                      label={`Remove ${t.name}`}
                      size="sm"
                      className="shrink-0 text-ink-4 hover:text-bad"
                      onClick={async () => {
                        await api.removeTeacher(t.id)
                        toast({ tone: 'default', title: `${t.name} removed` })
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
                icon={<GraduationCap size={19} />}
                title="No teachers yet"
                description="Send an invitation. They set their own password — you never see or generate one."
                action={
                  <Button variant="primary" onClick={() => setInviting(true)}>
                    Invite a teacher
                  </Button>
                }
              />
            )}
          </section>

          {data.pending.length > 0 && (
            <section>
              <h2 className="mb-3 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">
                Outstanding invitations
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
                {data.pending.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <Mail size={15} className="shrink-0 text-ink-4" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">{p.email}</span>
                    <Badge tone="neutral">{p.role}</Badge>
                    <span className="shrink-0 text-[12px] text-ink-4">
                      expires {new Date(p.expires_at * 1000).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <InviteTeacherModal
        open={inviting}
        onClose={() => setInviting(false)}
        onDone={() => {
          setInviting(false)
          load()
        }}
      />
    </Page>
  )
}

function InviteTeacherModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const close = () => {
    setUrl(null)
    setEmail('')
    setError(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Invite a teacher"
      description="A single-use link. Only its hash is stored, so nobody — including you — can read a password out of this system."
    >
      {url ? (
        <div>
          <p className="text-[13.5px] leading-relaxed text-ink-2">
            Send this to {email}. It works once and expires in 14 days.
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
              setUrl((await api.invite({ email, role: 'teacher' })).url)
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
            <Button onClick={close} type="button">
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
