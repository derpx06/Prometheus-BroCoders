import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  ListChecks,
  MessageSquareText,
  Sparkles,
} from 'lucide-react'
import { Page } from '../components/app/AppLayout'
import { Button } from '../components/ui/Button'
import { Badge, EmptyState, ProgressBar } from '../components/ui/primitives'
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal'
import { BAND, bandOf, GraphLegend, KnowledgeGraph } from '../components/app/KnowledgeGraph'
import { TutorDrawer } from '../components/app/TutorDrawer'
import { SOURCE_ICON } from '../components/app/PackCard'
import { useApp } from '../store/app'
import { SUBJECTS } from '../data/subjects'
import { conceptsOf, packProgress, recommend, topicMastery } from '../lib/pack'
import { pct, titleCase } from '../lib/format'
import { DUR, EASE, SPRING } from '../lib/motion'
import { cn } from '../lib/cn'
import type { Pack, Topic } from '../lib/types'

export function StudyPack() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { getPack } = useApp()
  const pack = getPack(id)
  const [tutorOpen, setTutorOpen] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    if (params.get('tutor')) {
      setTutorOpen(true)
      params.delete('tutor')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const rec = useMemo(() => (pack ? recommend(pack) : null), [pack])

  if (!pack || !rec) {
    return (
      <Page>
        <EmptyState
          icon={<FileText size={19} />}
          title="That path is gone"
          description="It may have been built in another session. Everything else is still in your library."
          action={
            <Link to="/app/library">
              <Button variant="primary">Open library</Button>
            </Link>
          }
        />
      </Page>
    )
  }

  const subject = SUBJECTS[pack.subject]
  const SourceIcon = SOURCE_ICON[pack.sourceKind]
  const isFresh = Date.now() - pack.createdAt < 120_000
  const progress = packProgress(pack)
  const questionCount = pack.quiz.length || pack.concepts.length * 2
  const selectedConcept = pack.concepts.find((c) => c.id === selected) ?? null

  return (
    <Page>
      <Link
        to="/app/learn"
        className="interactive mb-5 -ml-1.5 inline-flex items-center gap-1 rounded-[8px] px-1.5 py-1 text-[13px] font-medium text-ink-3 hover:bg-raised hover:text-ink"
      >
        <ChevronLeft size={14} />
        Learn
      </Link>

      {/* ------------------------------------------------------------- header */}
      <header className="mb-9">
        {isFresh && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.slow, ease: EASE.out }}
            className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-good"
          >
            <Sparkles size={13} />
            Your learning path is ready
          </motion.p>
        )}

        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
          <div className="min-w-0 max-w-2xl">
            <h1 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.026em] text-balance text-ink sm:text-[34px]">
              {pack.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12.5px] text-ink-3">
              <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: subject.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: subject.color }} />
                {subject.label}
              </span>
              <Dot />
              <span className="inline-flex max-w-[220px] items-center gap-1.5 truncate">
                <SourceIcon size={12} />
                {pack.sourceLabel}
              </span>
              <Dot />
              <span className="tabular-nums">{pack.concepts.length} concepts</span>
              <Dot />
              <span className="tabular-nums">{questionCount} questions</span>
              <Dot />
              <span className="tabular-nums">{pack.flashcards.length} flashcards</span>
              {pack.sessionId && (
                <>
                  <Dot />
                  <Badge tone="accent">Live engine</Badge>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button icon={<MessageSquareText size={15} />} onClick={() => setTutorOpen(true)}>
              Ask Lattice
            </Button>
            <Link to={`/app/quiz/${pack.id}`}>
              <Button variant="primary" iconRight={<ArrowRight size={15} />}>
                Start focused practice
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------- the one opinion */}
      <Recommendation pack={pack} rec={rec} />

      {/* --------------------------------------------------- learning path */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Learning path</h2>
            <p className="mt-0.5 text-[13px] text-ink-3">
              In dependency order — nothing arrives before what it needs.
            </p>
          </div>
          <span className="shrink-0 text-[13px] font-medium tabular-nums text-ink-2">
            {pct(progress)} overall
          </span>
        </div>

        <RevealGroup className="space-y-2" each={0.05}>
          {pack.topics.map((topic, i) => (
            <RevealItem key={topic.id}>
              <TopicRow pack={pack} topic={topic} index={i} />
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ------------------------------------------------------ study modes */}
      <section className="mt-10">
        <h2 className="mb-3 text-[16px] font-semibold text-ink">Everything built from it</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <ModeLink
            to={`/app/notes/${pack.id}`}
            icon={FileText}
            title="Notes"
            detail={`${pack.notes.length} sections`}
          />
          <ModeLink
            to={`/app/flashcards/${pack.id}`}
            icon={Layers}
            title="Flashcards"
            detail={`${pack.flashcards.length} cards`}
          />
          <ModeLink
            to={`/app/quiz/${pack.id}`}
            icon={ListChecks}
            title="Quiz"
            detail={`${questionCount} questions`}
          />
        </div>
      </section>

      {/* ----------------------------------------------------- concept map */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Concept map</h2>
            <p className="mt-0.5 max-w-lg text-[13px] leading-relaxed text-ink-3">
              {pack.concepts.length} concepts and {pack.edges.length} prerequisite links, inferred
              from the order and language of your material. Hover to trace what depends on what.
            </p>
          </div>
          <GraphLegend />
        </div>

        <div className="card overflow-hidden p-4 sm:p-5">
          <KnowledgeGraph
            concepts={pack.concepts}
            edges={pack.edges}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        <AnimatePresence>
          {selectedConcept && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: DUR.base, ease: EASE.out }}
              className="overflow-hidden"
            >
              <div className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: BAND[bandOf(selectedConcept)].color }}
                  />
                  <h3 className="text-[15px] font-semibold text-ink">
                    {titleCase(selectedConcept.name)}
                  </h3>
                  <span className="text-[12.5px] text-ink-3">
                    {BAND[bandOf(selectedConcept)].label}
                    {selectedConcept.attempts > 0 &&
                      ` · ${pct(selectedConcept.mastery)} · ${selectedConcept.attempts} attempt${selectedConcept.attempts === 1 ? '' : 's'}`}
                  </span>
                  <Link to={`/app/quiz/${pack.id}`} className="ml-auto shrink-0">
                    <Button size="sm" variant="primary">
                      Practise this
                    </Button>
                  </Link>
                </div>
                {selectedConcept.evidence[0] && (
                  <p className="mt-3 border-l-2 border-line pl-3 text-[13.5px] leading-relaxed text-pretty text-ink-2">
                    {selectedConcept.evidence[0]}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <TutorDrawer pack={pack} open={tutorOpen} onClose={() => setTutorOpen(false)} />
    </Page>
  )
}

const Dot = () => <span className="text-ink-5">·</span>

/* -------------------------------------------------------- recommendation */

function Recommendation({
  pack,
  rec,
}: {
  pack: Pack
  rec: ReturnType<typeof recommend>
}) {
  const navigate = useNavigate()
  return (
    <Reveal weight="primary">
      <div className="relative overflow-hidden rounded-[16px] border border-accent-line bg-accent-tint/55 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-0 max-w-xl">
            <p className="text-[11px] font-semibold tracking-[0.06em] text-accent-ink uppercase">
              What to do next
            </p>
            <h2 className="mt-2.5 text-[19px] leading-snug font-semibold text-balance text-ink sm:text-[21px]">
              {rec.headline}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-pretty text-ink-2">{rec.detail}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <Clock size={13} className="text-accent" />
              Let's spend {rec.minutes} minutes fixing that.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            iconRight={<ArrowRight size={16} />}
            onClick={() => navigate(`/app/quiz/${pack.id}`)}
            className="shrink-0"
          >
            Start focused practice
          </Button>
        </div>
      </div>
    </Reveal>
  )
}

/* ------------------------------------------------------------ topic row */

function TopicRow({ pack, topic, index }: { pack: Pack; topic: Topic; index: number }) {
  const [open, setOpen] = useState(false)
  const mastery = topicMastery(pack, topic)
  const concepts = conceptsOf(pack, topic)
  const touched = concepts.some((c) => c.attempts > 0)

  const action = !touched
    ? { label: 'Start here', to: `/app/notes/${pack.id}#${topic.id}` }
    : mastery < 0.6
      ? { label: 'Practise this', to: `/app/quiz/${pack.id}` }
      : mastery < 0.85
        ? { label: 'Review cards', to: `/app/flashcards/${pack.id}` }
        : { label: 'Retest', to: `/app/quiz/${pack.id}` }

  return (
    <div
      className={cn(
        'interactive card overflow-hidden',
        open ? 'border-line-strong shadow-sm' : 'hover:border-line-strong',
      )}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-[12px] font-semibold tabular-nums text-ink-3">
          {index + 1}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-[15px] font-semibold text-ink">{topic.title}</span>
            <span className="text-[12px] text-ink-4">
              {concepts.length} concept{concepts.length === 1 ? '' : 's'}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">{topic.summary}</span>

          <span className="mt-2.5 flex items-center gap-3">
            <ProgressBar
              value={mastery}
              height={4}
              tone={mastery >= 0.8 ? 'good' : 'ink'}
              className="max-w-[240px]"
            />
            <span className="shrink-0 text-[12px] font-medium tabular-nums text-ink-2">
              {touched ? `${pct(mastery)} understood` : 'Not started'}
            </span>
          </span>
        </span>

        <span className="hidden shrink-0 items-center gap-1.5 text-[12px] text-ink-4 sm:flex">
          <Clock size={12} />
          {topic.estMinutes} min
        </span>

        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: DUR.fast, ease: EASE.out }}
          className="shrink-0 text-ink-4"
        >
          <ChevronRight size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-4 py-4">
              <ul className="flex flex-wrap gap-1.5">
                {concepts.map((c) => (
                  <li key={c.id}>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-1 text-[12px] text-ink-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: BAND[bandOf(c)].color }}
                      />
                      {titleCase(c.name)}
                      {c.attempts > 0 && (
                        <span className="tabular-nums text-ink-4">{pct(c.mastery)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link to={action.to}>
                  <Button size="sm" variant="primary" iconRight={<ArrowRight size={13} />}>
                    {action.label}
                  </Button>
                </Link>
                <Link to={`/app/notes/${pack.id}`}>
                  <Button size="sm" variant="ghost">
                    Read the notes
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------ mode links */

function ModeLink({
  to,
  icon: Icon,
  title,
  detail,
}: {
  to: string
  icon: typeof FileText
  title: string
  detail: string
}) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={SPRING}>
      <Link
        to={to}
        className="card interactive group flex items-center gap-3 p-4 hover:border-line-strong hover:shadow-md"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-raised text-ink-3 transition-colors duration-200 group-hover:bg-accent-tint group-hover:text-accent">
          <Icon size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium text-ink">{title}</span>
          <span className="block text-[12px] tabular-nums text-ink-4">{detail}</span>
        </span>
        <ArrowRight
          size={14}
          className="shrink-0 text-ink-5 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-ink-3"
        />
      </Link>
    </motion.div>
  )
}
