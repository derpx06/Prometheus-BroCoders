import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart3, Info, Users } from 'lucide-react'
import { Page, PageHeader } from '../components/app/AppLayout'
import { Button } from '../components/ui/Button'
import { Badge, EmptyState, ProgressBar, Skeleton } from '../components/ui/primitives'
import { api } from '../lib/api'
import { pct, titleCase } from '../lib/format'
import { cn } from '../lib/cn'
import type { ClassAnalytics, ClassRoom, ConceptStat } from '../lib/types'

/**
 * Teacher analytics.
 *
 * Every figure on this screen is an aggregate over answers students actually submitted.
 * Savitrix's analytics page was static mock data; the replacement for that is not better mock
 * data, it is a screen that renders nothing when nothing has been submitted and says why.
 */
export function Analytics() {
  const [params, setParams] = useSearchParams()
  const classId = params.get('class')
  const [classes, setClasses] = useState<ClassRoom[] | null>(null)
  const [data, setData] = useState<ClassAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .classes()
      .then((r) => {
        setClasses(r.teaching)
        if (!classId && r.teaching.length) setParams({ class: r.teaching[0].id }, { replace: true })
      })
      .catch(() => setClasses([]))
  }, [classId, setParams])

  useEffect(() => {
    if (!classId) return
    setData(null)
    api
      .classAnalytics(classId)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load results.'))
  }, [classId])

  if (classes && !classes.length) {
    return (
      <Page>
        <PageHeader title="Analytics" />
        <EmptyState
          icon={<Users size={19} />}
          title="No classes to report on"
          description="Analytics are computed from work students submit, so they begin with a class and an assignment."
          action={
            <Link to="/app/classes">
              <Button variant="primary">Create a class</Button>
            </Link>
          }
        />
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title="Analytics"
        description="Computed from submitted answers only — nothing here is estimated."
        action={
          classes && classes.length > 1 ? (
            <select
              value={classId ?? ''}
              onChange={(e) => setParams({ class: e.target.value })}
              className="interactive h-9 rounded-[10px] border border-line bg-surface px-3 text-[13.5px] hover:border-line-strong focus:border-accent focus:outline-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-5 rounded-[12px] border border-bad-line bg-bad-tint p-3.5 text-[13.5px] text-ink">
          {error}
        </div>
      )}

      {!data ? (
        <div className="space-y-4">
          <Skeleton className="h-[90px] w-full rounded-[14px]" />
          <Skeleton className="h-[220px] w-full rounded-[14px]" />
        </div>
      ) : !data.hasData ? (
        <EmptyState
          icon={<BarChart3 size={19} />}
          title="Nothing submitted yet"
          description={
            data.roster === 0
              ? 'No students have joined this class, so there is nothing to measure. Share the class code.'
              : 'Students have joined but not submitted any work yet. Assign something and results appear here.'
          }
          action={
            <Link to={`/app/classes/${classId}`}>
              <Button variant="primary">Open the class</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-9">
          <section className="grid gap-3 sm:grid-cols-3">
            <Tile label="Students" value={String(data.roster)} />
            <Tile
              label="Assignments set"
              value={String(data.assignments.length)}
              hint={`${data.assignments.filter((a) => a.submissions > 0).length} with submissions`}
            />
            <Tile
              label="Class accuracy"
              value={
                data.assignments.some((a) => a.accuracy != null)
                  ? pct(
                      data.assignments
                        .filter((a) => a.accuracy != null)
                        .reduce((n, a) => n + a.accuracy!, 0) /
                        data.assignments.filter((a) => a.accuracy != null).length,
                    )
                  : '—'
              }
              hint="Across every answer given"
            />
          </section>

          <section>
            <h2 className="mb-3 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">
              By assignment
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
              {data.assignments.map((a) => (
                <li key={a.id} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      to={`/app/assignments/${a.id}`}
                      className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink hover:text-accent"
                    >
                      {a.title}
                    </Link>
                    {a.kind && <Badge tone="neutral">{a.kind.replace('_', ' ')}</Badge>}
                    <span className="shrink-0 text-[12.5px] tabular-nums text-ink-3">
                      {a.submissions}/{a.roster} submitted
                    </span>
                  </div>
                  {a.submissions === 0 ? (
                    <p className="mt-1.5 text-[12.5px] text-ink-4">No submissions yet</p>
                  ) : (
                    <div className="mt-2 flex items-center gap-3">
                      <span className="w-full max-w-[220px]">
                        <ProgressBar
                          value={a.averageScore ?? 0}
                          height={4}
                          tone={(a.averageScore ?? 0) >= 0.7 ? 'good' : 'ink'}
                        />
                      </span>
                      <span className="text-[12.5px] tabular-nums text-ink-2">
                        average {a.averageScore != null ? pct(a.averageScore) : '—'}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <ConceptPanel
              title="Weakest concepts"
              hint="Lowest accuracy across the class."
              stats={data.weakConcepts}
              tone="warn"
            />
            <ConceptPanel
              title="Strongest concepts"
              hint="Where the class is already solid."
              stats={data.strongConcepts}
              tone="good"
            />
          </div>

          {data.mostMissed.length > 0 && (
            <section>
              <h2 className="mb-1 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">
                Most-missed questions
              </h2>
              <p className="mb-3 text-[12.5px] text-ink-3">
                Questions at least two students answered. A question nobody gets may be a gap in
                teaching, or a question worth rewriting.
              </p>
              <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
                {data.mostMissed.map((q) => (
                  <li key={q.prompt} className="flex items-start gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-2">
                      {q.prompt}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-[12.5px] font-medium tabular-nums',
                        q.accuracy < 0.4 ? 'text-bad' : 'text-ink-3',
                      )}
                    >
                      {pct(q.accuracy)} correct
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">
              Students
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
              {data.students.map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
                    {s.name}
                  </span>
                  <span className="shrink-0 text-[12.5px] tabular-nums text-ink-3">
                    {s.completed}/{s.assigned} done
                  </span>
                  <span className="hidden w-28 shrink-0 sm:block">
                    {s.averageScore != null ? (
                      <ProgressBar
                        value={s.averageScore}
                        height={4}
                        tone={s.averageScore >= 0.7 ? 'good' : 'ink'}
                      />
                    ) : (
                      <span className="block text-right text-[12px] text-ink-4">not started</span>
                    )}
                  </span>
                  <span className="w-12 shrink-0 text-right text-[12.5px] tabular-nums text-ink-2">
                    {s.averageScore != null ? pct(s.averageScore) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Page>
  )
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">{label}</p>
      <p className="mt-1 text-[26px] leading-none font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1.5 text-[12px] text-ink-4">{hint}</p>}
    </div>
  )
}

export function ConceptPanel({
  title,
  hint,
  stats,
  tone,
}: {
  title: string
  hint: string
  stats: ConceptStat[]
  tone: 'warn' | 'good'
}) {
  return (
    <section>
      <h2 className="mb-1 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">{title}</h2>
      <p className="mb-3 text-[12.5px] text-ink-3">{hint}</p>
      {stats.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
          {stats.map((s) => (
            <li key={s.concept} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  tone === 'warn' ? 'bg-warn' : 'bg-good',
                )}
              />
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">
                {titleCase(s.concept)}
              </span>
              <span className="shrink-0 text-[12px] text-ink-4">{s.attempts} answers</span>
              <span className="w-11 shrink-0 text-right text-[12.5px] font-medium tabular-nums text-ink-2">
                {pct(s.accuracy)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-start gap-2 rounded-[12px] border border-line bg-raised p-3.5 text-[12.5px] leading-relaxed text-ink-2">
          <Info size={14} className="mt-px shrink-0 text-ink-4" />
          Not enough answers on any one concept yet to say anything useful. Three attempts is the
          threshold — below that an accuracy figure is noise.
        </p>
      )}
    </section>
  )
}
