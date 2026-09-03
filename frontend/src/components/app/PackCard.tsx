import { Link } from 'react-router-dom'
import { FileText, Layers, ListChecks, Mic, Presentation, Route, Youtube } from 'lucide-react'
import type { Pack, SourceKind } from '../../lib/types'
import { SUBJECTS } from '../../data/subjects'
import { packProgress } from '../../lib/pack'
import { pct, relativeTime } from '../../lib/format'
import { ProgressBar } from '../ui/primitives'
import { cn } from '../../lib/cn'

export const SOURCE_ICON: Record<SourceKind, typeof FileText> = {
  pdf: FileText,
  notes: FileText,
  slides: Presentation,
  youtube: Youtube,
  recording: Mic,
}

export function SubjectDot({ subject }: { subject: Pack['subject'] }) {
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: SUBJECTS[subject].color }}
      aria-hidden
    />
  )
}

export function PackCard({ pack, className }: { pack: Pack; className?: string }) {
  const meta = SUBJECTS[pack.subject]
  const progress = packProgress(pack)
  const Icon = SOURCE_ICON[pack.sourceKind]

  return (
    <Link
      to={`/app/pack/${pack.id}`}
      className={cn(
        'card interactive group flex flex-col p-4 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[8px]"
          style={{ background: meta.tint, color: meta.color }}
        >
          <Icon size={14} />
        </span>
        <span className="truncate text-[12px] font-medium" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </div>

      <h3 className="text-[15px] leading-snug font-semibold text-balance text-ink">{pack.title}</h3>
      <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-3">{pack.summary}</p>

      <div className="mt-auto pt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[12px] font-medium tabular-nums text-ink-2">
            {progress > 0 ? `${pct(progress)} mastered` : 'Not started'}
          </span>
          <span className="text-[11.5px] text-ink-4">{relativeTime(pack.lastStudied)}</span>
        </div>
        <ProgressBar value={progress} height={4} tone={progress > 0.75 ? 'good' : 'ink'} />

        <div className="mt-3 flex items-center gap-3 text-[11.5px] text-ink-4">
          <span className="inline-flex items-center gap-1">
            <Route size={12} /> {pack.topics.length} topics
          </span>
          <span className="inline-flex items-center gap-1">
            <Layers size={12} /> {pack.flashcards.length}
          </span>
          <span className="inline-flex items-center gap-1">
            <ListChecks size={12} /> {pack.quiz.length || pack.concepts.length * 2}
          </span>
        </div>
      </div>
    </Link>
  )
}

/** Compact row used in lists where the card grid would be too heavy. */
export function PackRow({ pack, to, meta }: { pack: Pack; to: string; meta?: string }) {
  const subject = SUBJECTS[pack.subject]
  const Icon = SOURCE_ICON[pack.sourceKind]
  return (
    <Link
      to={to}
      className="interactive group flex items-center gap-3.5 rounded-[12px] border border-transparent px-3 py-3 hover:border-line hover:bg-surface"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: subject.tint, color: subject.color }}
      >
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-ink">{pack.title}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
          <SubjectDot subject={pack.subject} />
          {subject.label}
          {meta && <span className="text-ink-4">· {meta}</span>}
        </span>
      </span>
      <span className="shrink-0 text-[12px] tabular-nums text-ink-4">
        {relativeTime(pack.lastStudied)}
      </span>
    </Link>
  )
}
