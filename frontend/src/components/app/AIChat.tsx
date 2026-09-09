import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, ListChecks, Quote, Sparkles } from 'lucide-react'
import type { Pack } from '../../lib/types'
import { answer, STARTER_PROMPTS, type TutorReply } from '../../lib/tutor'
import { api } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { SUBJECTS } from '../../data/subjects'
import { LogoMark } from './Logo'
import { cn } from '../../lib/cn'
import { titleCase } from '../../lib/format'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text?: string
  reply?: TutorReply
}

export function AIChat({
  pack,
  className,
  compact = false,
  seed,
}: {
  pack: Pack
  className?: string
  compact?: boolean
  /** A question to ask automatically — set when the user acts on a concept in the notes. */
  seed?: string
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'seed',
      role: 'assistant',
      reply: {
        paragraphs: [
          `I have read ${pack.sourceLabel} and indexed ${pack.concepts.length} concepts from it. Ask me anything about this material and I will answer from the document itself.`,
        ],
        citations: [],
        suggestions: STARTER_PROMPTS,
      },
    },
  ])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const { status } = useAuth()
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => {
    if (!pack.sourceId || status !== 'authenticated') return
    let alive = true
    api.chatHistory(pack.sourceId)
      .then(({ messages: history }) => {
        if (!alive || !history.length) return
        setMessages(history.map((m) => m.role === 'user'
          ? { id: m.id, role: 'user', text: m.content }
          : { id: m.id, role: 'assistant', reply: { paragraphs: [m.content], citations: m.citations, suggestions: [] } }))
      })
      .catch((e) => console.warn('Could not load study chat', e))
    return () => { alive = false }
  }, [pack.sourceId, status])

  const send = useCallback(
    (text: string) => {
    const q = text.trim()
    if (!q) return
    setDraft('')
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: q }])
    setThinking(true)
    if (pack.sourceId && status === 'authenticated') {
      void api.chat(pack.sourceId, q)
        .then(({ message }) => {
          setMessages((m) => [...m, { id: message.id, role: 'assistant', reply: { paragraphs: [message.content], citations: message.citations, suggestions: [] } }])
        })
        .catch((e) => {
          setMessages((m) => [...m, { id: `e${Date.now()}`, role: 'assistant', reply: { paragraphs: [e instanceof Error ? e.message : 'The study assistant is unavailable. Please try again.'], citations: [], suggestions: [] } }])
        })
        .finally(() => setThinking(false))
      return
    }
    // Anonymous demo packs retain the local citation-based tutor.
    setTimeout(() => {
        setMessages((m) => [
          ...m,
          { id: `a${Date.now()}`, role: 'assistant', reply: answer(pack, q) },
        ])
        setThinking(false)
      }, 520 + Math.random() * 320)
    },
    [pack, status],
  )

  // A concept action from the notes arrives as a seed; ask it once.
  const asked = useRef<string | undefined>()
  useEffect(() => {
    if (!seed || asked.current === seed) return
    asked.current = seed
    send(seed)
  }, [seed, send])

  const subject = SUBJECTS[pack.subject]

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <header className="flex items-start gap-2.5 border-b border-line px-4 py-3">
        <LogoMark size={18} className="mt-0.5 text-accent" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-semibold text-ink">Study Assistant</h3>
          <p className="mt-0.5 truncate text-[11.5px] text-ink-3">
            Based on: {subject.label} — {pack.title}
          </p>
        </div>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((m) =>
          m.role === 'user' ? (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-end"
            >
              <p className="max-w-[85%] rounded-[14px] rounded-br-[6px] bg-ink px-3 py-2 text-[13.5px] leading-relaxed text-white">
                {m.text}
              </p>
            </motion.div>
          ) : (
            <AssistantMessage key={m.id} reply={m.reply!} pack={pack} onAsk={send} />
          ),
        )}

        <AnimatePresence>{thinking && <Thinking />}</AnimatePresence>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
        }}
        className="border-t border-line p-3"
      >
        <div className="interactive flex items-end gap-2 rounded-[12px] border border-line bg-surface p-1.5 pl-3 focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/12">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(draft)
              }
            }}
            rows={1}
            placeholder={compact ? 'Ask about this material…' : 'Ask about these notes…'}
            className="max-h-28 min-h-[24px] flex-1 resize-none bg-transparent py-1 text-[13.5px] leading-relaxed outline-none placeholder:text-ink-4"
          />
          <button
            type="submit"
            disabled={!draft.trim() || thinking}
            aria-label="Send"
            className="interactive flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-accent text-white disabled:bg-line-strong disabled:text-ink-4"
          >
            <ArrowUp size={15} />
          </button>
        </div>
        <p className="mt-2 px-0.5 text-[11px] text-ink-4">
          Answers are drawn from your own material, with the source shown.
        </p>
      </form>
    </div>
  )
}

function AssistantMessage({
  reply,
  pack,
  onAsk,
}: {
  reply: TutorReply
  pack: Pack
  onAsk: (q: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-2.5"
    >
      {reply.paragraphs.map((p, i) => (
        <p key={i} className="text-[13.5px] leading-relaxed text-pretty text-ink">
          {p}
        </p>
      ))}

      {reply.citations.map((c, i) => (
        <figure
          key={i}
          className="rounded-[10px] border border-line bg-raised/60 px-3 py-2.5"
        >
          <blockquote className="flex gap-2 text-[13px] leading-relaxed text-ink-2">
            <Quote size={12} className="mt-1 shrink-0 text-ink-4" />
            {c.sentence}
          </blockquote>
          <figcaption className="mt-1.5 pl-5 text-[11px] text-ink-4">
            {titleCase(c.concept)} · {pack.sourceLabel}
          </figcaption>
        </figure>
      ))}

      {reply.quizPrompt && (
        <Link
          to={`/app/quiz/${pack.id}`}
          className="interactive inline-flex items-center gap-1.5 rounded-[9px] border border-accent-line bg-accent-tint px-2.5 py-1.5 text-[12.5px] font-medium text-accent-ink hover:border-accent"
        >
          <ListChecks size={13} />
          Start the quiz
        </Link>
      )}

      {reply.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {reply.suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onAsk(s)}
              className="interactive inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] text-ink-2 hover:border-line-strong hover:text-ink"
            >
              <Sparkles size={11} className="text-ink-4" />
              {s}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function Thinking() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-1.5 py-1"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-ink-4"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.14, ease: 'easeInOut' }}
        />
      ))}
      <span className="ml-1 text-[12px] text-ink-4">Looking through your material…</span>
    </motion.div>
  )
}
