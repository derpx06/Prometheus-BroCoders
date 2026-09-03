import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Logo } from '../components/app/Logo'
import { Button, ButtonLink } from '../components/ui/Button'
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal'
import { HeroDemo } from '../components/landing/HeroDemo'
import {
  DiagnoseVisual,
  MasterVisual,
  PracticeVisual,
  UnderstandVisual,
  UploadVisual,
} from '../components/landing/StoryVisuals'
import { DUR, EASE } from '../lib/motion'
import { cn } from '../lib/cn'

const STORY = [
  {
    id: 'upload',
    step: 'Upload',
    title: 'Give Lattice one thing to learn.',
    body: 'A lecture PDF, a set of slides, your own messy notes, a transcript. It does not need to be tidy — it needs to be yours.',
    visual: UploadVisual,
  },
  {
    id: 'understand',
    step: 'Understand',
    title: 'See the structure hiding inside your material.',
    body: 'Lattice pulls out the concepts and works out which ones depend on which. That order is not decoration — it decides what you get asked, and when.',
    visual: UnderstandVisual,
  },
  {
    id: 'diagnose',
    step: 'Diagnose',
    title: "Find what you actually don't know.",
    body: 'Every answer updates a probability that you know each concept. Confidence is not the same as competence, and this is the difference made visible.',
    visual: DiagnoseVisual,
  },
  {
    id: 'practice',
    step: 'Practice',
    title: 'Practise exactly where you are weakest.',
    body: 'Questions come from your own text, and the wrong options are the concepts nearest to the right one — so guessing does not work.',
    visual: PracticeVisual,
  },
  {
    id: 'master',
    step: 'Master',
    title: 'Watch your understanding change.',
    body: 'Not a streak, not a badge. The same map you started with, redrawn as the gaps close.',
    visual: MasterVisual,
  },
]

export function Landing() {
  const [scrolled, setScrolled] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Nav — quiet until you leave the top of the page */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          scrolled
            ? 'border-b border-line bg-canvas/80 shadow-xs backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-15 max-w-[1120px] items-center px-5 sm:px-8">
          <Link to="/" aria-label="Lattice home">
            <Logo />
          </Link>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <a
              href="#upload"
              className="interactive hidden rounded-[8px] px-3 py-1.5 text-[13.5px] font-medium text-ink-2 hover:bg-raised hover:text-ink sm:block"
            >
              How it works
            </a>
            <Link
              to="/app"
              className="interactive hidden rounded-[8px] px-3 py-1.5 text-[13.5px] font-medium text-ink-2 hover:bg-raised hover:text-ink sm:block"
            >
              Sign in
            </Link>
            <ButtonLink to="/app" variant="primary" size="sm">
              Start learning
            </ButtonLink>
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        <div className="grid-veil pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-[1120px] px-5 pt-32 pb-16 sm:px-8 sm:pt-40 sm:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR.slow, ease: EASE.out }}
              className="text-[13px] font-medium tracking-[0.01em] text-ink-3"
            >
              Your study material, understood.
            </motion.p>

            <motion.h1
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.06, ease: EASE.out }}
              className="mt-5 text-[44px] leading-[0.98] font-semibold tracking-[-0.038em] text-balance text-ink sm:text-[68px]"
            >
              Learn smarter.
              <br />
              <span className="text-ink-4">Not harder.</span>
            </motion.h1>

            <motion.p
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR.slow, delay: 0.14, ease: EASE.out }}
              className="mx-auto mt-6 max-w-lg text-[16px] leading-relaxed text-pretty text-ink-2 sm:text-[17.5px]"
            >
              Turn lectures, notes and PDFs into a learning path that adapts to what you actually
              know.
            </motion.p>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR.slow, delay: 0.2, ease: EASE.out }}
              className="mt-9 flex flex-col items-center justify-center gap-2.5 sm:flex-row"
            >
              <ButtonLink to="/app" variant="primary" size="lg" iconRight={<ArrowRight size={16} />}>
                Start learning
              </ButtonLink>
              <a href="#upload">
                <Button size="lg" variant="ghost">
                  See how it works
                </Button>
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28, ease: EASE.out }}
            className="mx-auto mt-16 max-w-[900px] sm:mt-20"
          >
            <HeroDemo />
          </motion.div>
        </div>
      </section>

      {/* ----------------------------------------------------------- story */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1120px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal weight="primary" className="max-w-xl">
            <h2 className="text-[30px] leading-[1.08] font-semibold tracking-[-0.026em] text-balance text-ink sm:text-[40px]">
              Five steps, and the product does four of them.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-pretty text-ink-2">
              Most study tools stop at a summary. Lattice keeps going — it builds the structure of
              the subject, tracks what you know against it, and uses both to decide what to ask you
              next.
            </p>
          </Reveal>

          <div className="mt-20 space-y-24 sm:space-y-32">
            {STORY.map((s, i) => {
              const Visual = s.visual
              const flipped = i % 2 === 1
              return (
                <div
                  key={s.id}
                  id={s.id}
                  className="grid scroll-mt-24 items-center gap-8 lg:grid-cols-2 lg:gap-16"
                >
                  <Reveal weight="primary" className={cn(flipped && 'lg:order-2')}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-[11px] font-semibold tabular-nums text-ink-3">
                        {i + 1}
                      </span>
                      <span className="text-[12px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
                        {s.step}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[24px] leading-tight font-semibold tracking-[-0.02em] text-balance text-ink sm:text-[30px]">
                      {s.title}
                    </h3>
                    <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-pretty text-ink-2">
                      {s.body}
                    </p>
                  </Reveal>

                  <Reveal delay={0.08} className={cn(flipped && 'lg:order-1')}>
                    <Visual />
                  </Reveal>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- what makes it different */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1120px] px-5 py-20 sm:px-8 sm:py-24">
          <Reveal weight="primary" className="max-w-lg">
            <h2 className="text-[26px] leading-tight font-semibold tracking-[-0.024em] text-balance text-ink sm:text-[32px]">
              It is a student model, not a prompt.
            </h2>
          </Reveal>

          <RevealGroup className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" each={0.07}>
            {[
              {
                h: 'Prerequisites, inferred',
                p: 'A concept is only served once the ones it depends on are holding. That ordering comes from your material, not a generic syllabus.',
              },
              {
                h: 'Distractors that tempt',
                p: 'Wrong answers are the nearest neighbouring concepts, so a question tests understanding rather than recognition.',
              },
              {
                h: 'Mastery, tracked properly',
                p: 'Bayesian knowledge tracing keeps a probability you know each concept, updated on every answer — slips and lucky guesses included.',
              },
              {
                h: 'Answers you can check',
                p: 'The tutor quotes the sentence it is answering from. If your document does not cover it, it says so instead of inventing.',
              },
              {
                h: 'Spaced review, scheduled',
                p: 'Concepts come back at the interval that keeps them, rather than whenever you happen to open the app.',
              },
              {
                h: 'Instant after the first read',
                p: 'The language model runs once, at upload. Answering never waits on a network round trip.',
              },
            ].map((f) => (
              <RevealItem key={f.h}>
                <h3 className="text-[14.5px] font-semibold text-ink">{f.h}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-pretty text-ink-2">{f.p}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------------------------------ close */}
      <section className="border-t border-line bg-surface">
        <div className="relative mx-auto max-w-[1120px] overflow-hidden px-5 py-24 text-center sm:px-8 sm:py-32">
          <div className="dot-veil pointer-events-none absolute inset-0" aria-hidden />
          <Reveal weight="primary" className="relative">
            <h2 className="mx-auto max-w-xl text-[30px] leading-[1.08] font-semibold tracking-[-0.028em] text-balance text-ink sm:text-[42px]">
              Bring one document. Leave with a plan.
            </h2>
            <div className="mt-9">
              <ButtonLink to="/app" variant="primary" size="lg" iconRight={<ArrowRight size={16} />}>
                Start learning
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-5 gap-y-3 px-5 py-9 sm:px-8">
          <Logo />
          <p className="text-[12.5px] text-ink-4">Adaptive learning that shows its structure.</p>
          <Link
            to="/app"
            className="interactive ml-auto text-[12.5px] font-medium text-ink-2 hover:text-ink"
          >
            Open the app →
          </Link>
        </div>
      </footer>
    </div>
  )
}
