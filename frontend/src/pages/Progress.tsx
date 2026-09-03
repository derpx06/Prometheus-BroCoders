import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Flame, Layers, ListChecks, FileText, Upload } from 'lucide-react'
import { Page, PageHeader } from '../components/app/AppLayout'
import { Button } from '../components/ui/Button'
import { Reveal } from '../components/ui/Reveal'
import { BAND, bandFor, GraphLegend, KnowledgeGraph } from '../components/app/KnowledgeGraph'
import { useApp } from '../store/app'
import { studyMinutes } from '../data/packs'
import { USER } from '../data/user'
import { SUBJECTS } from '../data/subjects'
import { conceptsOf, hasStarted, packProgress, topicMastery } from '../lib/pack'
import { duration, pct, relativeTime, titleCase } from '../lib/format'
import { useCountUp } from '../lib/hooks'
import { DUR, EASE } from '../lib/motion'
import { cn } from '../lib/cn'
import type { ActivityEntry, Concept, Pack } from '../lib/types'

const ACTIVITY_ICON: Record<ActivityEntry['kind'], typeof ListChecks> = {
  quiz: ListChecks,
  flashcards: Layers,
  notes: FileText,
  upload: Upload,
}

export function Progress() {
  const { packs, activity } = useApp()
  const [open, setOpen] = useState<string | null>(null)

  const stats = useMemo(() => {
    const all = packs.flatMap((p) => p.concepts)
    const quizzes = activity.filter((a) => a.kind === 'quiz' && a.score !== undefined)
    return {
      minutes: packs.reduce((n, p) => n + p.minutes, 0),
      mastered: all.filter((c) => c.mastery >= 0.8 && c.attempts > 0).length,
      total: all.length,
      accuracy: quizzes.length
        ? quizzes.reduce((n, a) => n + (a.score ?? 0), 0) / quizzes.length
        : 0,
    }
  }, [packs, activity])

  const studied = packs.filter(hasStarted).sort((a, b) => packProgress(b) - packProgress(a))
  const focus = studied[0] ?? packs[0]

  return (
    <Page>
      <PageHeader
        title="Progress"
        description="What is holding, what is not, and where the next session should go."
      />

      {/* Stats — a single quiet row, not four boxes */}
      <Reveal weight="primary">
        <div className="grid grid-cols-2 gap-y-6 border-y border-line py-6 sm:grid-cols-4 sm:divide-x sm:divide-line">
          <Stat label="Learning streak" value={USER.streak} suffix=" days" icon={<Flame size={13} />} />
          <Stat label="Study time" value={stats.minutes} format={(n) => duration(Math.round(n))} />
          <Stat label="Concepts held" value={stats.mastered} suffix={` / ${stats.total}`} />
          <Stat
            label="Quiz accuracy"
            value={stats.accuracy * 100}
            format={(n) => `${Math.round(n)}%`}
          />
        </div>
      </Reveal>

      {/* Understanding map */}
      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold text-ink">Understanding map</h2>
            <p className="mt-0.5 max-w-lg text-[13px] leading-relaxed text-ink-3">
              Every topic you have been tested on, weakest first inside each subject. The gaps are
              meant to catch your eye.
            </p>
          </div>
          <GraphLegend />
        </div>

        <div className="space-y-8">
          {studied.map((pack) => (
            <SubjectBlock
              key={pack.id}
              pack={pack}
              openKey={open}
              onOpen={setOpen}
            />
          ))}
        </div>

        {!studied.length && (
          <p className="rounded-[14px] border border-dashed border-line-strong px-5 py-10 text-center text-[13.5px] text-ink-3">
            Nothing has been tested yet. Answer a few questions and your map will fill in.
          </p>
        )}
      </section>

      {/* Concept-level view of whatever you have studied most */}
      {focus && (
        <section className="mt-12">
          <div className="mb-4">
            <h2 className="text-[17px] font-semibold text-ink">
              Concept detail — {focus.title}
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-3">
              The same map the engine uses to choose your next question.
            </p>
          </div>
          <div className="card overflow-hidden p-4 sm:p-5">
            <KnowledgeGraph concepts={focus.concepts} edges={focus.edges} />
          </div>
        </section>
      )}

      {/* Rhythm + activity */}
      <section className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink">Last two weeks</h2>
            <span className="text-[12px] text-ink-3">Daily goal {USER.goalMinutes} min</span>
          </div>
          <div className="flex h-24 items-end gap-1.5">
            {studyMinutes.map((m, i) => {
              const height = Math.max(3, Math.round((m / Math.max(...studyMinutes)) * 96))
              return (
                <motion.div
                  key={i}
                  initial={{ height: 3 }}
                  whileInView={{ height }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.025, ease: EASE.out }}
                  title={`${m} min`}
                  className={cn(
                    'flex-1 rounded-[3px]',
                    m >= USER.goalMinutes ? 'bg-accent' : m > 0 ? 'bg-ink-4' : 'bg-sunken',
                  )}
                />
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-ink-4">
            <span>14 days ago</span>
            <span>Today</span>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-[15px] font-semibold text-ink">Recent activity</h2>
          <ul className="-mx-2 space-y-0.5">
            {activity.slice(0, 6).map((a) => {
              const Icon = ACTIVITY_ICON[a.kind]
              return (
                <li key={a.id}>
                  <Link
                    to={`/app/pack/${a.packId}`}
                    className="interactive group flex items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-raised"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-raised text-ink-3 group-hover:bg-surface">
                      <Icon size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {a.label}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-3">{a.detail}</span>
                    </span>
                    <span className="shrink-0 text-[11.5px] text-ink-4">{relativeTime(a.at)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </Page>
  )
}

/* ------------------------------------------------------------ subject block */

function SubjectBlock({
  pack,
  openKey,
  onOpen,
}: {
  pack: Pack
  openKey: string | null
  onOpen: (k: string | null) => void
}) {
  const subject = SUBJECTS[pack.subject]
  const rows = pack.topics
    .map((topic) => ({
      topic,
      mastery: topicMastery(pack, topic),
      touched: conceptsOf(pack, topic).some((c) => c.attempts > 0),
      weakest: [...conceptsOf(pack, topic)]
        .filter((c) => c.attempts > 0)
        .sort((a, b) => a.mastery - b.mastery)[0],
    }))
    .filter((r) => r.touched)
    .sort((a, b) => a.mastery - b.mastery)

  if (!rows.length) return null

  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full" style={{ background: subject.color }} />
        <Link
          to={`/app/pack/${pack.id}`}
          className="interactive text-[14px] font-semibold text-ink hover:text-accent"
        >
          {pack.title}
        </Link>
        <span className="text-[12px] text-ink-4">{subject.label}</span>
      </div>

      <ul className="divide-y divide-line border-y border-line">
        {rows.map(({ topic, mastery, weakest }) => {
          const key = `${pack.id}:${topic.id}`
          const isOpen = openKey === key
          const band = bandFor(mastery)
          return (
            <li key={key}>
              <button
                onClick={() => onOpen(isOpen ? null : key)}
                aria-expanded={isOpen}
                className="interactive flex w-full items-center gap-4 px-1 py-3 text-left hover:bg-raised/50"
              >
                <span className="w-40 shrink-0 truncate text-[13.5px] font-medium text-ink sm:w-52">
                  {topic.title}
                </span>

                <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-sunken">
                  <motion.span
                    initial={{ width: 0 }}
                    whileInView={{ width: `${mastery * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: EASE.out }}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: BAND[band].color }}
                  />
                </span>

                <span
                  className={cn(
                    'w-11 shrink-0 text-right text-[12.5px] font-medium tabular-nums',
                    band === 'review' ? 'text-bad' : 'text-ink-2',
                  )}
                >
                  {pct(mastery)}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: DUR.base, ease: EASE.out }}
                    className="overflow-hidden"
                  >
                    <NextStep pack={pack} weakest={weakest} topicTitle={topic.title} />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NextStep({
  pack,
  weakest,
  topicTitle,
}: {
  pack: Pack
  weakest: Concept | undefined
  topicTitle: string
}) {
  return (
    <div className="mb-3 rounded-[12px] bg-raised/70 p-4">
      <p className="text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
        What should I do next?
      </p>
      {weakest && (
        <p className="mt-2 text-[13.5px] leading-relaxed text-pretty text-ink-2">
          Within {topicTitle.toLowerCase()}, <b className="font-medium text-ink">{titleCase(weakest.name)}</b> is
          the weakest link at {pct(weakest.mastery)}
          {weakest.evidence[0] && ` — "${weakest.evidence[0]}"`}
        </p>
      )}
      <div className="mt-3.5 flex flex-wrap gap-2">
        <Link to={`/app/notes/${pack.id}`}>
          <Button size="sm">Review</Button>
        </Link>
        <Link to={`/app/flashcards/${pack.id}`}>
          <Button size="sm">Drill cards</Button>
        </Link>
        <Link to={`/app/quiz/${pack.id}`}>
          <Button size="sm" variant="primary" iconRight={<ArrowRight size={13} />}>
            Retest
          </Button>
        </Link>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- stat */

function Stat({
  label,
  value,
  suffix,
  format,
  icon,
}: {
  label: string
  value: number
  suffix?: string
  format?: (n: number) => string
  icon?: React.ReactNode
}) {
  const animated = useCountUp(value)
  return (
    <div className="px-0 sm:px-6 sm:first:pl-0">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-[26px] leading-none font-semibold tabular-nums text-ink">
        {format ? format(animated) : Math.round(animated)}
        {suffix && <span className="text-[15px] font-medium text-ink-4">{suffix}</span>}
      </p>
    </div>
  )
}
