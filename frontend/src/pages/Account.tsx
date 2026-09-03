import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, RotateCcw } from 'lucide-react'
import { Page, PageHeader } from '../components/app/AppLayout'
import { Button } from '../components/ui/Button'
import { Avatar, Badge, Card, ProgressBar } from '../components/ui/primitives'
import { useApp } from '../store/app'
import { USER } from '../data/user'
import { SUBJECTS } from '../data/subjects'
import { packProgress } from '../lib/pack'
import { duration, pct } from '../lib/format'
import { cn } from '../lib/cn'

export function Settings() {
  const { engine, toast } = useApp()
  const [goal, setGoal] = useState(USER.goalMinutes)
  const [reminders, setReminders] = useState(true)
  const [shuffle, setShuffle] = useState(false)

  return (
    <Page className="max-w-[720px]">
      <PageHeader title="Settings" description="Only the things that change how studying works." />

      <Card className="divide-y divide-line">
        <Row
          title="Daily study goal"
          description="Used for the streak and the bars on your progress page."
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={15}
              max={120}
              step={15}
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
              className="w-32 accent-[var(--color-accent)]"
              aria-label="Daily study goal in minutes"
            />
            <span className="w-14 text-right text-[13px] tabular-nums text-ink-2">
              {duration(goal)}
            </span>
          </div>
        </Row>

        <Row title="Study reminders" description="A nudge if you have not studied by the evening.">
          <Toggle checked={reminders} onChange={setReminders} label="Study reminders" />
        </Row>

        <Row
          title="Shuffle flashcards"
          description="Otherwise cards follow the order concepts appear in your material."
        >
          <Toggle checked={shuffle} onChange={setShuffle} label="Shuffle flashcards" />
        </Row>

        <Row
          title="Learning engine"
          description="Concept extraction, question generation and mastery tracking run locally."
        >
          <Badge tone={engine === 'online' ? 'good' : 'neutral'}>
            {engine === 'online' ? 'Connected' : engine === 'checking' ? 'Checking…' : 'Offline'}
          </Badge>
        </Row>

        <Row
          title="Reset demo data"
          description="Clears locally stored packs and restores the bundled sample library."
        >
          <Button
            icon={<RotateCcw size={14} />}
            onClick={() => {
              try {
                localStorage.removeItem('lattice.state.v2')
              } catch {
                /* nothing stored to clear */
              }
              toast({ title: 'Demo data reset', description: 'Reloading…', tone: 'default' })
              setTimeout(() => location.reload(), 600)
            }}
          >
            Reset
          </Button>
        </Row>
      </Card>
    </Page>
  )
}

export function Profile() {
  const { packs, activity } = useApp()
  const minutes = packs.reduce((n, p) => n + p.minutes, 0)
  const concepts = packs.flatMap((p) => p.concepts)
  const mastered = concepts.filter((c) => c.mastery >= 0.8).length

  const bySubject = Object.values(SUBJECTS)
    .map((s) => ({
      meta: s,
      packs: packs.filter((p) => p.subject === s.key),
    }))
    .filter((x) => x.packs.length)

  return (
    <Page className="max-w-[720px]">
      <div className="mb-8 flex items-center gap-4">
        <Avatar name={USER.name} size={56} />
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold text-ink">{USER.name}</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-2">{USER.email}</p>
        </div>
        <Badge tone="accent" className="ml-auto shrink-0">
          {USER.plan}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-[12px] font-medium text-ink-3">Study time</p>
          <p className="mt-1.5 text-[21px] font-semibold tabular-nums text-ink">
            {duration(minutes)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-medium text-ink-3">Concepts held</p>
          <p className="mt-1.5 text-[21px] font-semibold tabular-nums text-ink">
            {mastered}
            <span className="text-[14px] font-medium text-ink-4">/{concepts.length}</span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-medium text-ink-3">Sessions</p>
          <p className="mt-1.5 text-[21px] font-semibold tabular-nums text-ink">
            {activity.length}
          </p>
        </Card>
      </div>

      <h2 className="mt-9 mb-3 text-[15px] font-semibold text-ink">Subjects</h2>
      <div className="space-y-3">
        {bySubject.map(({ meta, packs: subjectPacks }) => {
          const progress =
            subjectPacks.reduce((n, p) => n + packProgress(p), 0) / subjectPacks.length
          return (
            <Card key={meta.key} className="p-4">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: meta.color }}
                />
                <span className="text-[14px] font-medium text-ink">{meta.label}</span>
                <span className="text-[12.5px] text-ink-3">
                  {subjectPacks.length} {subjectPacks.length === 1 ? 'pack' : 'packs'}
                </span>
                <span className="ml-auto text-[12.5px] tabular-nums text-ink-2">
                  {pct(progress)}
                </span>
              </div>
              <ProgressBar value={progress} height={4} tone="ink" className="mt-3" />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {subjectPacks.map((p) => (
                  <Link
                    key={p.id}
                    to={`/app/pack/${p.id}`}
                    className="interactive rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-2 hover:border-line-strong hover:text-ink"
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </Page>
  )
}

function Row({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'interactive relative h-6 w-10 shrink-0 rounded-full',
        checked ? 'bg-accent' : 'bg-line-strong',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-xs transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      >
        {checked && <Check size={11} className="text-accent" />}
      </span>
    </button>
  )
}
