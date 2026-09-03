import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, FileText, Layers, ListChecks, MessageSquareText } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/primitives'
import { ACTION_PROMPT, NoteRenderer, type ConceptAction } from '../components/app/NoteRenderer'
import { AIChat } from '../components/app/AIChat'
import { TutorDrawer } from '../components/app/TutorDrawer'
import { useApp } from '../store/app'
import { SUBJECTS } from '../data/subjects'
import { cn } from '../lib/cn'
import { duration } from '../lib/format'
import { useMediaQuery } from '../lib/hooks'

export function NotesReader() {
  const { id } = useParams()
  const { getPack } = useApp()
  const pack = getPack(id)
  const [active, setActive] = useState<string>('')
  const [tutorOpen, setTutorOpen] = useState(false)
  const [seed, setSeed] = useState<string | undefined>()
  const contentRef = useRef<HTMLDivElement>(null)
  // The assistant is already docked at xl, so the drawer is only for narrower screens.
  const wide = useMediaQuery('(min-width: 1280px)')

  const conceptNames = useMemo(() => pack?.concepts.map((c) => c.name) ?? [], [pack])

  // A concept action in the prose opens the assistant with that question already asked.
  const askAbout = (concept: string, action: ConceptAction) => {
    setSeed(ACTION_PROMPT[action](concept))
    setTutorOpen(true)
  }

  const sections = useMemo(() => pack?.notes ?? [], [pack])

  // Highlight the section currently under the reader's eye.
  useEffect(() => {
    if (!sections.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-88px 0px -65% 0px', threshold: 0 },
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  if (!pack) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState
          icon={<FileText size={19} />}
          title="No notes here"
          description="This pack no longer exists. Everything else is still in your library."
          action={
            <Link to="/app/library">
              <Button variant="primary">Open library</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const subject = SUBJECTS[pack.subject]

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-0">
      {/* Document navigation */}
      <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-line px-3 py-6 lg:block">
        <Link
          to={`/app/pack/${pack.id}`}
          className="interactive mb-4 inline-flex items-center gap-1 rounded-[8px] px-1.5 py-1 text-[12.5px] font-medium text-ink-3 hover:bg-raised hover:text-ink"
        >
          <ChevronLeft size={13} />
          Learning path
        </Link>
        <p className="mb-2 px-1.5 text-[11px] font-semibold tracking-wide text-ink-4 uppercase">
          In this document
        </p>
        <nav className="space-y-0.5">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={cn(
                'interactive block truncate rounded-[8px] px-2 py-1.5 text-[13px]',
                active === s.id
                  ? 'bg-raised font-medium text-ink'
                  : 'text-ink-3 hover:bg-raised/60 hover:text-ink-2',
              )}
            >
              {s.title}
            </a>
          ))}
        </nav>

        <div className="mt-6 space-y-1 border-t border-line pt-4">
          <Link
            to={`/app/quiz/${pack.id}`}
            className="interactive flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px] text-ink-2 hover:bg-raised hover:text-ink"
          >
            <ListChecks size={14} className="text-ink-4" />
            Take the quiz
          </Link>
          <Link
            to={`/app/flashcards/${pack.id}`}
            className="interactive flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px] text-ink-2 hover:bg-raised hover:text-ink"
          >
            <Layers size={14} className="text-ink-4" />
            Review flashcards
          </Link>
        </div>
      </aside>

      {/* The document */}
      <div ref={contentRef} className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[664px]">
          <Link
            to={`/app/pack/${pack.id}`}
            className="interactive mb-5 -ml-1.5 inline-flex items-center gap-1 rounded-[8px] px-1.5 py-1 text-[13px] font-medium text-ink-3 hover:bg-raised hover:text-ink lg:hidden"
          >
            <ChevronLeft size={14} />
            Study pack
          </Link>

          <header className="mb-9 border-b border-line pb-7">
            <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-3">
              <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: subject.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: subject.color }} />
                {subject.label}
              </span>
              <span className="text-ink-4">·</span>
              <span className="truncate">{pack.sourceLabel}</span>
              <span className="text-ink-4">·</span>
              <span>{duration(Math.max(3, Math.round(pack.notes.length * 2.5)))} read</span>
            </div>
            <h1 className="text-[30px] leading-[1.15] font-semibold tracking-[-0.024em] text-balance text-ink sm:text-[34px]">
              {pack.title}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-pretty text-ink-2">
              {pack.summary}
            </p>

            <Button
              className="mt-5 xl:hidden"
              icon={<MessageSquareText size={15} />}
              onClick={() => setTutorOpen(true)}
            >
              Ask about these notes
            </Button>
          </header>

          <article className="space-y-12 pb-16">
            {sections.map((s) => (
              <NoteRenderer
                key={s.id}
                section={s}
                concepts={conceptNames}
                onConceptAction={askAbout}
              />
            ))}
          </article>

          <div className="flex flex-wrap gap-2 border-t border-line pt-7">
            <Link to={`/app/quiz/${pack.id}`}>
              <Button variant="primary" icon={<ListChecks size={15} />}>
                Test yourself
              </Button>
            </Link>
            <Link to={`/app/flashcards/${pack.id}`}>
              <Button icon={<Layers size={15} />}>Review flashcards</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Contextual assistant, permanently docked on wide screens */}
      <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[340px] shrink-0 border-l border-line xl:flex xl:flex-col">
        <AIChat pack={pack} seed={seed} className="h-full" />
      </aside>

      <TutorDrawer
        pack={pack}
        seed={seed}
        open={tutorOpen && !wide}
        onClose={() => setTutorOpen(false)}
      />
    </div>
  )
}
