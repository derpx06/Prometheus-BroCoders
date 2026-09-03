import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Layers, ListChecks, Target } from 'lucide-react'
import { Page, PageHeader } from '../components/app/AppLayout'
import { Button } from '../components/ui/Button'
import { EmptyState, ProgressBar } from '../components/ui/primitives'
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal'
import { BAND, bandOf } from '../components/app/KnowledgeGraph'
import { useApp } from '../store/app'
import { useUpload } from '../store/upload'
import { SUBJECTS } from '../data/subjects'
import { hasStarted, packProgress, recommend } from '../lib/pack'
import { pct, titleCase } from '../lib/format'
import { SPRING } from '../lib/motion'

/**
 * Practice is the "just tell me what to do" screen: one recommended session at the top,
 * then every deck and question bank underneath for when the student disagrees.
 */
export function Practice() {
  const { packs } = useApp()
  const { openUpload } = useUpload()

  const focus = useMemo(() => {
    const started = packs.filter(hasStarted)
    const pool = started.length ? started : packs
    // The pack with the most ground still to cover is the one worth practising.
    return [...pool].sort((a, b) => packProgress(a) - packProgress(b))[0]
  }, [packs])

  const rec = focus ? recommend(focus) : null

  if (!packs.length) {
    return (
      <Page>
        <PageHeader title="Practice" description="Questions and cards built from your material." />
        <EmptyState
          icon={<Target size={19} />}
          title="Nothing to practise yet"
          description="Upload a lecture and we'll write a question bank and a deck of cards from it."
          action={
            <Button variant="primary" onClick={() => openUpload()}>
              Upload material
            </Button>
          }
        />
      </Page>
    )
  }

  const weakest = focus
    ? [...focus.concepts].filter((c) => c.attempts > 0).sort((a, b) => a.mastery - b.mastery).slice(0, 4)
    : []

  return (
    <Page>
      <PageHeader
        title="Practice"
        description="Served at the edge of what you know — hardest thing you can still get right."
      />

      {/* The recommended session */}
      {focus && rec && (
        <Reveal weight="primary">
          <div className="overflow-hidden rounded-[16px] border border-line bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5 p-5 sm:p-6">
              <div className="min-w-0 max-w-xl">
                <p className="text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Recommended session
                </p>
                <h2 className="mt-2.5 text-[20px] leading-snug font-semibold text-balance text-ink sm:text-[23px]">
                  {rec.weakest ? rec.weakest.title : focus.title}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-pretty text-ink-2">
                  {rec.detail}
                </p>

                {weakest.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {weakest.map((c) => (
                      <li
                        key={c.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-2"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: BAND[bandOf(c)].color }}
                        />
                        {titleCase(c.name)}
                        <span className="tabular-nums text-ink-4">{pct(c.mastery)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                <Link to={`/app/quiz/${focus.id}`}>
                  <Button variant="primary" size="lg" iconRight={<ArrowRight size={16} />} block>
                    Start · {rec.minutes} min
                  </Button>
                </Link>
                <Link to={`/app/flashcards/${focus.id}`}>
                  <Button size="lg" block icon={<Layers size={15} />}>
                    Drill the cards instead
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* Everything else */}
      <section className="mt-10">
        <h2 className="mb-4 text-[16px] font-semibold text-ink">All practice</h2>
        <RevealGroup className="grid gap-2.5 sm:grid-cols-2" each={0.05}>
          {packs.map((p) => {
            const subject = SUBJECTS[p.subject]
            const progress = packProgress(p)
            return (
              <RevealItem key={p.id}>
                <motion.div whileHover={{ y: -2 }} transition={SPRING} className="h-full">
                  <div className="card flex h-full flex-col p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: subject.color }}
                      />
                      <span className="text-[11.5px] font-medium" style={{ color: subject.color }}>
                        {subject.label}
                      </span>
                    </div>

                    <h3 className="mt-2 text-[14.5px] font-semibold text-ink">{p.title}</h3>

                    <div className="mt-3 flex items-center gap-2.5">
                      <ProgressBar
                        value={progress}
                        height={4}
                        tone={progress >= 0.8 ? 'good' : 'ink'}
                      />
                      <span className="shrink-0 text-[11.5px] tabular-nums text-ink-4">
                        {progress > 0 ? pct(progress) : '—'}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link to={`/app/quiz/${p.id}`} className="flex-1">
                        <Button size="sm" block icon={<ListChecks size={13.5} />}>
                          {p.quiz.length || p.concepts.length * 2} questions
                        </Button>
                      </Link>
                      <Link to={`/app/flashcards/${p.id}`} className="flex-1">
                        <Button size="sm" block icon={<Layers size={13.5} />}>
                          {p.flashcards.length} cards
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </section>
    </Page>
  )
}
