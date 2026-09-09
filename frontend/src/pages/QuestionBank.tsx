import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Library, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Page, PageHeader } from '../components/app/AppLayout'
import { Button, IconButton } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge, EmptyState, SearchInput, Skeleton } from '../components/ui/primitives'
import { useApp } from '../store/app'
import { api, type BankQuestion } from '../lib/api'
import { titleCase } from '../lib/format'
import { cn } from '../lib/cn'
import { INPUT, Labelled, Problem } from './Classes'
import type { Source } from '../lib/types'

/**
 * The reusable question store.
 *
 * Questions arrive two ways: written by hand, or promoted from a source the engine has already
 * analysed. The second is the interesting one — every source already carries a grounded bank,
 * so "generate questions" is really "keep these ones", with the source recorded as provenance.
 */
export function QuestionBank() {
  const { toast } = useApp()
  const [items, setItems] = useState<BankQuestion[] | null>(null)
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all')
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)

  const load = () =>
    api
      .bank()
      .then((r) => setItems(r.questions))
      .catch(() => setItems([]))

  useEffect(() => {
    void load()
  }, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (items ?? []).filter(
      (item) =>
        (difficulty === 'all' || item.difficulty === difficulty) &&
        (!q ||
          `${item.question} ${item.answer} ${item.topic ?? ''} ${item.tags.join(' ')}`
            .toLowerCase()
            .includes(q)),
    )
  }, [items, query, difficulty])

  return (
    <Page>
      <PageHeader
        title="Question bank"
        description="Questions you can reuse across quizzes, tests and assignments."
        action={
          <div className="flex gap-2">
            <Button icon={<Sparkles size={15} />} onClick={() => setImporting(true)}>
              From material
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
              Add a question
            </Button>
          </div>
        }
      />

      {items && items.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <SearchInput value={query} onChange={setQuery} placeholder="Search questions, topics, tags…" />
          </div>
          <div className="inline-flex rounded-[10px] border border-line bg-raised p-0.5">
            {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  'interactive rounded-[8px] px-3 py-1.5 text-[13px] font-medium capitalize',
                  difficulty === d ? 'bg-surface text-ink shadow-xs' : 'text-ink-3 hover:text-ink-2',
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <span className="text-[12.5px] tabular-nums text-ink-4">
            {shown.length} of {items.length}
          </span>
        </div>
      )}

      {!items ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[96px] w-full rounded-[12px]" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState
          icon={<Library size={19} />}
          title="The bank is empty"
          description="Every source you add already has a grounded question bank behind it — pull a spread of it in here, or write your own."
          action={
            <Button variant="primary" onClick={() => setImporting(true)}>
              Pull from my material
            </Button>
          }
        />
      ) : !shown.length ? (
        <EmptyState
          icon={<Library size={19} />}
          title="Nothing matches"
          description="Try a different search, or clear the difficulty filter."
        />
      ) : (
        <ul className="space-y-2">
          {shown.map((item) => (
            <li key={item.id} className="card flex gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-snug font-medium text-ink">{item.question}</p>
                {item.options.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {item.options.map((o, i) => (
                      <li
                        key={i}
                        className={cn(
                          'rounded-[7px] border px-2 py-0.5 text-[12.5px]',
                          o === item.answer
                            ? 'border-good-line bg-good-tint text-ink'
                            : 'border-line bg-raised text-ink-2',
                        )}
                      >
                        {o}
                      </li>
                    ))}
                  </ul>
                )}
                {!item.options.length && item.answer && (
                  <p className="mt-1.5 text-[13px] text-ink-2">
                    <span className="text-ink-4">Answer: </span>
                    {item.answer}
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">{item.type.replace('_', ' ')}</Badge>
                  <Badge
                    tone={item.difficulty === 'hard' ? 'warn' : item.difficulty === 'easy' ? 'good' : 'neutral'}
                  >
                    {item.difficulty}
                  </Badge>
                  {item.topic && <Badge tone="accent">{titleCase(item.topic)}</Badge>}
                  {item.tags.map((t) => (
                    <span key={t} className="text-[11.5px] text-ink-4">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
              <IconButton
                label="Delete question"
                size="sm"
                className="shrink-0 self-start text-ink-4 hover:text-bad"
                onClick={async () => {
                  await api.deleteBankItem(item.id)
                  setItems((prev) => (prev ?? []).filter((x) => x.id !== item.id))
                }}
              >
                <Trash2 size={14} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <AddModal
        open={adding}
        onClose={() => setAdding(false)}
        onDone={() => {
          setAdding(false)
          void load()
        }}
      />
      <ImportModal
        open={importing}
        onClose={() => setImporting(false)}
        onDone={(n) => {
          setImporting(false)
          void load()
          toast({ tone: 'success', title: `${n} question${n === 1 ? '' : 's'} added to the bank` })
        }}
      />
    </Page>
  )
}

function AddModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [form, setForm] = useState({
    question: '',
    answer: '',
    options: '',
    topic: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    type: 'mcq' as BankQuestion['type'],
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal open={open} onClose={onClose} title="Add a question" size="lg">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            await api.addBankItem({
              question: form.question,
              answer: form.answer,
              type: form.type,
              difficulty: form.difficulty,
              topic: form.topic || undefined,
              options: form.options
                .split('\n')
                .map((o) => o.trim())
                .filter(Boolean),
            })
            setForm({ ...form, question: '', answer: '', options: '' })
            onDone()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add that question.')
          } finally {
            setBusy(false)
          }
        }}
        className="flex flex-col gap-3.5"
      >
        <Labelled label="Question">
          <textarea
            required
            rows={2}
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            className="interactive w-full resize-y rounded-[12px] border border-line bg-surface p-3 text-[13.5px] leading-relaxed hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
          />
        </Labelled>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Labelled label="Type">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as BankQuestion['type'] })}
              className={INPUT}
            >
              {['mcq', 'true_false', 'short_answer', 'fill_blank', 'long_answer'].map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Labelled>
          <Labelled label="Difficulty">
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
              className={INPUT}
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </Labelled>
          <Labelled label="Topic">
            <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={INPUT} />
          </Labelled>
        </div>
        <Labelled label="Options — one per line, leave empty for a written answer">
          <textarea
            rows={4}
            value={form.options}
            onChange={(e) => setForm({ ...form, options: e.target.value })}
            className="interactive w-full resize-y rounded-[12px] border border-line bg-surface p-3 text-[13.5px] leading-relaxed hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
          />
        </Labelled>
        <Labelled label="Answer">
          <input
            required
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            className={INPUT}
          />
        </Labelled>
        <Problem message={error} />
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={busy} disabled={!form.question.trim()}>
            Add to bank
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function ImportModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: (count: number) => void
}) {
  const [sources, setSources] = useState<Source[] | null>(null)
  const [sourceId, setSourceId] = useState('')
  const [count, setCount] = useState(8)
  const [difficulty, setDifficulty] = useState('medium')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    api
      .sources()
      .then((r) => setSources(r.sources))
      .catch(() => setSources([]))
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pull questions from material"
      description="The engine already wrote a grounded bank for each source. This keeps a spread of it, with the source recorded."
    >
      {sources === null ? (
        <Skeleton className="h-20 w-full" />
      ) : !sources.length ? (
        <EmptyState
          icon={<Sparkles size={19} />}
          title="No material yet"
          description="Add a source first — upload a file, paste text, or point us at a lecture video."
          action={
            <Link to="/app/create">
              <Button variant="primary">Add material</Button>
            </Link>
          }
        />
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError(null)
            try {
              const r = await api.bankFromSource(sourceId, count, difficulty)
              onDone(r.added)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not pull those questions.')
            } finally {
              setBusy(false)
            }
          }}
          className="flex flex-col gap-3.5"
        >
          <Labelled label="Source">
            <select required value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={INPUT}>
              <option value="">Choose…</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </Labelled>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Labelled label="How many">
              <input
                type="number"
                min={1}
                max={40}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(40, Number(e.target.value) || 1)))}
                className={INPUT}
              />
            </Labelled>
            <Labelled label="Tag them as">
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={INPUT}>
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </Labelled>
          </div>
          <Problem message={error} />
          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={busy} disabled={!sourceId}>
              Add to bank
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
