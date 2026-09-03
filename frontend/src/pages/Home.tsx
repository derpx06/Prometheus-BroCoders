import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUp,
  Link2,
  Mic,
  Paperclip,
  Sparkles,
  Upload as UploadIcon,
} from 'lucide-react'
import { Page } from '../components/app/AppLayout'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/primitives'
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal'
import { PackCard } from '../components/app/PackCard'
import { ACCEPT } from '../components/app/UploadZone'
import { useApp } from '../store/app'
import { useUpload } from '../store/upload'
import { greeting } from '../lib/format'
import { USER } from '../data/user'
import { hasStarted, packProgress, recommend } from '../lib/pack'
import { DUR, EASE, SPRING } from '../lib/motion'
import { cn } from '../lib/cn'

export function Home() {
  const { packs } = useApp()
  const { openUpload, submitFile, submitText, submitSample } = useUpload()
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const recent = useMemo(
    () =>
      [...packs]
        .sort((a, b) => (b.lastStudied ?? b.createdAt) - (a.lastStudied ?? a.createdAt))
        .slice(0, 4),
    [packs],
  )

  const resume = useMemo(() => {
    const started = packs.filter(hasStarted)
    if (!started.length) return null
    return [...started].sort((a, b) => packProgress(a) - packProgress(b))[0]
  }, [packs])

  const rec = resume ? recommend(resume) : null
  const canSubmit = draft.trim().length >= 400

  return (
    <Page>
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.slow, ease: EASE.out }}
        className="pt-3 pb-8 sm:pt-8 sm:pb-10"
      >
        <h1 className="text-[27px] leading-tight font-semibold tracking-[-0.026em] text-ink sm:text-[34px]">
          {greeting()}, {USER.firstName}.
        </h1>
        <p className="mt-2 text-[15.5px] text-ink-2 sm:text-[17px]">
          What are you learning today?
        </p>
      </motion.div>

      {/* The one primary action — a workspace input, not a form field */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.slow, delay: 0.06, ease: EASE.out }}
      >
        <div
          className={cn(
            'interactive relative rounded-[18px] border bg-surface p-2.5 shadow-xs',
            focused ? 'border-accent shadow-md ring-3 ring-accent/10' : 'border-line hover:border-line-strong',
          )}
        >
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) submitFile(file)
              e.target.value = ''
            }}
          />

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) {
                e.preventDefault()
                submitText(draft, 'Pasted notes')
              }
            }}
            rows={3}
            aria-label="Paste material to learn"
            placeholder="Drop something to learn — a lecture PDF, your notes, a transcript…"
            className="min-h-[76px] w-full resize-none bg-transparent px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-ink-4"
          />

          <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1 pb-1">
            <SourceButton
              icon={<Paperclip size={14} />}
              label="Upload"
              onClick={() => fileInput.current?.click()}
            />
            <SourceButton
              icon={<Link2 size={14} />}
              label="Paste link"
              onClick={() => openUpload('link')}
            />
            <SourceButton
              icon={<Mic size={14} />}
              label="Record"
              onClick={() => openUpload('link')}
            />

            <span className="ml-auto flex items-center gap-2.5">
              <span
                className={cn(
                  'hidden text-[11.5px] tabular-nums transition-colors duration-200 sm:block',
                  draft.length > 0 ? 'text-ink-4' : 'text-transparent',
                )}
              >
                {draft.trim().length < 400 && draft.length > 0
                  ? `${400 - draft.trim().length} more characters`
                  : `${draft.trim().length.toLocaleString()} characters`}
              </span>
              <motion.button
                onClick={() => (canSubmit ? submitText(draft, 'Pasted notes') : openUpload('file'))}
                whileTap={{ scale: 0.94 }}
                transition={SPRING}
                aria-label={canSubmit ? 'Build my learning path' : 'Add material'}
                className={cn(
                  'interactive flex h-9 w-9 items-center justify-center rounded-[10px]',
                  canSubmit
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'bg-raised text-ink-3 hover:bg-sunken hover:text-ink-2',
                )}
              >
                {canSubmit ? <ArrowUp size={16} /> : <UploadIcon size={15} />}
              </motion.button>
            </span>
          </div>
        </div>

        <p className="mt-2.5 px-1 text-[12px] text-ink-4">
          Drag a file anywhere on this page — or{' '}
          <button
            onClick={submitSample}
            className="interactive font-medium text-ink-3 underline-offset-2 hover:text-ink hover:underline"
          >
            try the sample lecture
          </button>
          .
        </p>
      </motion.div>

      {/* Adaptive nudge — the product's opinion, one card, never a grid of them */}
      {resume && rec && (
        <Reveal weight="primary" className="mt-10">
          <Link
            to={`/app/pack/${resume.id}`}
            className="interactive group block rounded-[16px] border border-line bg-surface p-5 hover:border-line-strong hover:shadow-md sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
              <div className="min-w-0 max-w-xl">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] text-accent-ink uppercase">
                  <Sparkles size={11} />
                  Pick up here
                </p>
                <h2 className="mt-2.5 text-[18px] leading-snug font-semibold text-balance text-ink sm:text-[20px]">
                  {rec.headline}
                </h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-pretty text-ink-2">
                  {rec.detail} About {rec.minutes} minutes.
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-[13.5px] font-medium text-accent">
                Open {resume.title}
                <ArrowRight
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
            </div>
          </Link>
        </Reveal>
      )}

      {/* Continue learning */}
      <section className="mt-12 sm:mt-14">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-[16px] font-semibold text-ink">Continue learning</h2>
          <Link
            to="/app/learn"
            className="interactive inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink"
          >
            View all
            <ArrowRight size={13} />
          </Link>
        </div>

        {recent.length ? (
          <RevealGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" each={0.05}>
            {recent.map((p) => (
              <RevealItem key={p.id} className="h-full">
                <PackCard pack={p} className="h-full" />
              </RevealItem>
            ))}
          </RevealGroup>
        ) : (
          <EmptyState
            icon={<Sparkles size={19} />}
            title="Your library is waiting."
            description="Drop your first lecture here and we'll turn it into something you can actually study."
            action={
              <Button variant="primary" onClick={() => openUpload()}>
                Upload material
              </Button>
            }
          />
        )}
      </section>
    </Page>
  )
}

function SourceButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={SPRING}
      className="interactive inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[12.5px] font-medium text-ink-2 hover:bg-raised hover:text-ink"
    >
      <span className="text-ink-4">{icon}</span>
      {label}
    </motion.button>
  )
}
