import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Info, Key, TriangleAlert } from 'lucide-react'
import type { NoteBlock, NoteSection } from '../../lib/types'
import { cn } from '../../lib/cn'
import { DUR, EASE } from '../../lib/motion'

export type ConceptAction = 'ask' | 'simpler' | 'example' | 'quiz'

export const ACTION_PROMPT: Record<ConceptAction, (concept: string) => string> = {
  ask: (c) => `Tell me about ${c}`,
  simpler: (c) => `Explain ${c} simply`,
  example: (c) => `Give me an example of ${c}`,
  quiz: (c) => `Quiz me on ${c}`,
}

const CALLOUT = {
  key: { icon: Key, className: 'border-accent-line bg-accent-tint', title: 'text-accent-ink' },
  note: { icon: Info, className: 'border-line bg-raised', title: 'text-ink' },
  warn: { icon: TriangleAlert, className: 'border-warn-line bg-warn-tint', title: 'text-warn' },
}

interface RenderContext {
  concepts: string[]
  onAction?: (concept: string, action: ConceptAction) => void
}

/**
 * A concept mentioned in the prose.
 *
 * Hovering it offers the four things a student actually wants at that moment, in place —
 * no copying the term into a chat box, no losing your position in the document.
 */
function ConceptMention({
  name,
  onAction,
}: {
  name: string
  onAction?: (concept: string, action: ConceptAction) => void
}) {
  const [open, setOpen] = useState(false)
  if (!onAction) return <>{name}</>

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => onAction(name, 'ask')}
        className={cn(
          'interactive rounded-[3px] px-0.5 font-medium decoration-1 underline-offset-[3px]',
          open ? 'bg-accent-tint text-accent-ink' : 'text-ink underline decoration-line-strong',
        )}
      >
        {name}
      </button>

      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.98 }}
            transition={{ duration: DUR.fast, ease: EASE.out }}
            className="absolute bottom-[calc(100%+8px)] left-1/2 z-30 flex -translate-x-1/2 gap-0.5 rounded-[10px] border border-line bg-surface p-1 whitespace-nowrap shadow-lg"
          >
            {(
              [
                ['ask', 'Ask Lattice'],
                ['simpler', 'Explain simpler'],
                ['example', 'Give example'],
                ['quiz', 'Quiz me'],
              ] as const
            ).map(([action, label]) => (
              <button
                key={action}
                onClick={() => {
                  setOpen(false)
                  onAction(name, action)
                }}
                className="interactive rounded-[7px] px-2 py-1 text-[11.5px] font-medium text-ink-2 hover:bg-raised hover:text-ink"
              >
                {label}
              </button>
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

/**
 * Wrap the first mention of each known concept. Only the first — highlighting every
 * occurrence turns the page into a minefield and stops meaning anything.
 */
function useMentions(text: string, ctx: RenderContext): ReactNode {
  return useMemo(() => {
    if (!ctx.concepts.length || !ctx.onAction) return text

    const found: { start: number; end: number; name: string }[] = []
    const lower = text.toLowerCase()
    // Longest first, so "active transport" wins over "transport".
    for (const name of [...ctx.concepts].sort((a, b) => b.length - a.length)) {
      const idx = lower.indexOf(name.toLowerCase())
      if (idx === -1) continue
      // Whole-word only, and never overlapping an earlier match.
      const before = idx === 0 ? ' ' : text[idx - 1]
      const after = text[idx + name.length] ?? ' '
      if (/[a-z0-9]/i.test(before) || /[a-z0-9]/i.test(after)) continue
      if (found.some((f) => idx < f.end && idx + name.length > f.start)) continue
      found.push({ start: idx, end: idx + name.length, name })
    }
    if (!found.length) return text

    found.sort((a, b) => a.start - b.start)
    const out: ReactNode[] = []
    let cursor = 0
    found.forEach((f, i) => {
      if (f.start > cursor) out.push(text.slice(cursor, f.start))
      out.push(
        <ConceptMention key={`${f.name}-${i}`} name={text.slice(f.start, f.end)} onAction={ctx.onAction} />,
      )
      cursor = f.end
    })
    if (cursor < text.length) out.push(text.slice(cursor))
    return out
  }, [text, ctx])
}

function Paragraph({ text, ctx }: { text: string; ctx: RenderContext }) {
  const content = useMentions(text, ctx)
  return <p className="my-4 text-[15px] leading-[1.75] text-pretty text-ink-2">{content}</p>
}

function Block({ block, ctx }: { block: NoteBlock; ctx: RenderContext }) {
  switch (block.type) {
    case 'heading':
      return (
        <h3 className="mt-9 mb-3 text-[16px] font-semibold text-ink first:mt-0">{block.text}</h3>
      )

    case 'paragraph':
      return <Paragraph text={block.text} ctx={ctx} />

    case 'bullets':
      return (
        <ul className="my-4 space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-[1.7] text-ink-2">
              <span className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-ink-4" />
              <span className="text-pretty">{item}</span>
            </li>
          ))}
        </ul>
      )

    case 'callout': {
      const c = CALLOUT[block.tone]
      const Icon = c.icon
      return (
        <aside className={cn('my-5 flex gap-3 rounded-[12px] border p-4', c.className)}>
          <Icon size={15} className={cn('mt-0.5 shrink-0', c.title)} />
          <div className="min-w-0">
            <p className={cn('text-[13px] font-semibold', c.title)}>{block.title}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-pretty text-ink-2">{block.text}</p>
          </div>
        </aside>
      )
    }

    case 'equation':
      return (
        <figure className="my-6">
          <div className="overflow-x-auto rounded-[12px] border border-line bg-raised/60 px-5 py-4 text-center">
            <span className="font-mono text-[14.5px] whitespace-nowrap text-ink">
              {block.latex}
            </span>
          </div>
          {block.caption && (
            <figcaption className="mt-2 text-center text-[12px] text-ink-3">
              {block.caption}
            </figcaption>
          )}
        </figure>
      )

    case 'table':
      return (
        <div className="my-6 overflow-x-auto rounded-[12px] border border-line">
          <table className="w-full border-collapse text-left text-[13.5px]">
            <thead>
              <tr className="bg-raised/70">
                {block.head.map((h, i) => (
                  <th
                    key={i}
                    className="border-b border-line px-3.5 py-2.5 font-semibold text-ink whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={cn(
                        'px-3.5 py-2.5 align-top leading-relaxed',
                        j === 0 ? 'font-medium text-ink' : 'text-ink-2',
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

export function NoteRenderer({
  section,
  concepts = [],
  onConceptAction,
}: {
  section: NoteSection
  concepts?: string[]
  onConceptAction?: (concept: string, action: ConceptAction) => void
}) {
  const ctx: RenderContext = { concepts, onAction: onConceptAction }
  return (
    <section id={section.id} className="scroll-mt-24">
      <h2 className="mb-4 text-[21px] font-semibold tracking-[-0.02em] text-balance text-ink">
        {section.title}
      </h2>
      {section.blocks.map((b, i) => (
        <Block key={i} block={b} ctx={ctx} />
      ))}
    </section>
  )
}
