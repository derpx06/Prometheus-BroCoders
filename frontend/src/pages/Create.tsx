import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  ClipboardType,
  FileStack,
  FileText,
  Layers,
  ListChecks,
  Notebook,
  Presentation,
  ScrollText,
  Sparkles,
  Upload,
  Youtube,
} from 'lucide-react'
import { Page, PageHeader } from '../components/app/AppLayout'
import { Button } from '../components/ui/Button'
import { Badge, EmptyState, Skeleton } from '../components/ui/primitives'
import { UploadZone, SupportedFormats } from '../components/app/UploadZone'
import { useApp } from '../store/app'
import { useAuth } from '../store/auth'
import { api, type GenerateOptions } from '../lib/api'
import { packFromSource } from '../lib/pack'
import { relativeTime } from '../lib/format'
import { cn } from '../lib/cn'
import type { Material, MaterialKind, Source } from '../lib/types'

/**
 * Create with AI — the one creation surface.
 *
 * This replaces what would otherwise be five or six near-identical generator pages. The
 * shape is deliberately *what* before *where from*: a teacher arrives knowing they need a
 * test, not knowing which of their uploads it should come from. Advanced settings stay
 * folded away until the chosen output actually needs them, which is why a quiz is three
 * clicks and a test paper is the only thing that asks twelve questions.
 */

type Step = 'output' | 'source' | 'customise' | 'result'

interface OutputSpec {
  kind: MaterialKind
  label: string
  detail: string
  icon: typeof ListChecks
  /** Students generate for themselves; the rest are class-facing documents. */
  student: boolean
  /** Outputs with nothing worth configuring skip the customise step entirely. */
  configurable: boolean
}

const OUTPUTS: OutputSpec[] = [
  {
    kind: 'quiz',
    label: 'Quiz',
    detail: 'A set of questions with answers and explanations.',
    icon: ListChecks,
    student: true,
    configurable: true,
  },
  {
    kind: 'notes',
    label: 'Notes',
    detail: 'Structured notes in prerequisite order, quoting the source.',
    icon: Notebook,
    student: true,
    configurable: false,
  },
  {
    kind: 'flashcards',
    label: 'Flashcards',
    detail: 'One card per concept, front and back.',
    icon: Layers,
    student: true,
    configurable: false,
  },
  {
    kind: 'summary',
    label: 'Summary',
    detail: 'The spine of the material in a page.',
    icon: ScrollText,
    student: true,
    configurable: false,
  },
  {
    kind: 'test',
    label: 'Test paper',
    detail: 'A sectioned exam with marks, answer key and marking scheme.',
    icon: FileStack,
    student: false,
    configurable: true,
  },
  {
    kind: 'assignment',
    label: 'Assignment',
    detail: 'Homework tasks with student instructions.',
    icon: ClipboardList,
    student: false,
    configurable: true,
  },
  {
    kind: 'lesson_plan',
    label: 'Lesson plan',
    detail: 'A timed scaffold built from the concept graph.',
    icon: Presentation,
    student: false,
    configurable: true,
  },
]

const SOURCE_ICON = { file: FileText, text: ClipboardType, youtube: Youtube } as const

export function Create() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { isTeacher } = useAuth()
  const { addPack, toast } = useApp()

  const outputs = useMemo(() => OUTPUTS.filter((o) => isTeacher || o.student), [isTeacher])

  const [step, setStep] = useState<Step>(params.get('source') ? 'output' : 'output')
  const [kind, setKind] = useState<MaterialKind | null>(
    (params.get('kind') as MaterialKind | null) ?? null,
  )
  const [sourceId, setSourceId] = useState<string | null>(params.get('source'))
  const [sources, setSources] = useState<Source[] | null>(null)
  const [options, setOptions] = useState<GenerateOptions>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Material | null>(null)

  const spec = outputs.find((o) => o.kind === kind) ?? null
  const source = sources?.find((s) => s.id === sourceId) ?? null

  useEffect(() => {
    api
      .sources()
      .then((r) => setSources(r.sources))
      .catch(() => setSources([]))
  }, [])

  // Arriving with ?kind= and ?source= already chosen lands straight on the useful step.
  useEffect(() => {
    if (kind && sourceId) setStep(spec?.configurable ? 'customise' : 'output')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const chooseOutput = (next: MaterialKind) => {
    setKind(next)
    setError(null)
    setStep(sourceId ? (OUTPUTS.find((o) => o.kind === next)?.configurable ? 'customise' : 'result') : 'source')
    if (sourceId && !OUTPUTS.find((o) => o.kind === next)?.configurable) {
      void generate(next, sourceId, {})
    }
  }

  const chooseSource = (next: Source) => {
    setSourceId(next.id)
    setError(null)
    if (spec?.configurable) {
      setStep('customise')
    } else if (kind) {
      void generate(kind, next.id, {})
    }
  }

  const generate = useCallback(
    async (forKind: MaterialKind, forSource: string, opts: GenerateOptions) => {
      setBusy(true)
      setError(null)
      setStep('result')
      try {
        const { material } = await api.generate({ sourceId: forSource, kind: forKind, options: opts })
        setResult(material)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not generate that.')
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  /** A newly ingested source lands straight in the flow rather than navigating away. */
  const ingest = async (work: () => Promise<Source>) => {
    setBusy(true)
    setError(null)
    try {
      const created = await work()
      setSources((prev) => [created, ...(prev ?? [])])
      addPack(packFromSource(created))
      toast({
        tone: 'success',
        title: 'Material read',
        description: `${created.concepts?.length ?? 0} concepts found in ${created.title}.`,
      })
      chooseSource(created)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that material.')
    } finally {
      setBusy(false)
    }
  }

  const back = () => {
    setError(null)
    if (step === 'result') setStep(spec?.configurable ? 'customise' : 'source')
    else if (step === 'customise') setStep('source')
    else if (step === 'source') setStep('output')
  }

  return (
    <Page>
      <PageHeader
        title="Create with AI"
        description="Pick what you need, point it at your material, and edit whatever comes back."
        action={
          step !== 'output' ? (
            <Button icon={<ArrowLeft size={15} />} onClick={back} disabled={busy}>
              Back
            </Button>
          ) : undefined
        }
      />

      <Trail
        step={step}
        kind={spec?.label ?? null}
        sourceTitle={source?.title ?? null}
        onJump={(s) => !busy && setStep(s)}
      />

      {error && (
        <div className="mb-5 flex gap-2.5 rounded-[12px] border border-bad-line bg-bad-tint p-3.5">
          <AlertCircle size={17} className="mt-px shrink-0 text-bad" />
          <p className="text-[13.5px] leading-relaxed text-ink">{error}</p>
        </div>
      )}

      {/* A keyed entrance rather than AnimatePresence: `mode="wait"` holds the outgoing step
          until its exit resolves, and nested inside the shell's own AnimatePresence that exit
          can stall — leaving the previous step on screen at half opacity forever. Steps are a
          within-page state change, so an entrance alone is the right amount of motion anyway. */}
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <>
          {step === 'output' && (
            <Section
              title="What do you want to create?"
              hint={
                isTeacher
                  ? 'Everything here can be assigned to a class once you have saved it.'
                  : 'These are the outputs you can make for your own study.'
              }
            >
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {outputs.map((o) => (
                  <Tile
                    key={o.kind}
                    icon={<o.icon size={16} />}
                    label={o.label}
                    detail={o.detail}
                    active={kind === o.kind}
                    onClick={() => chooseOutput(o.kind)}
                  />
                ))}
              </div>
            </Section>
          )}

          {step === 'source' && (
            <SourceStep
              sources={sources}
              busy={busy}
              onPick={chooseSource}
              onFile={(file) => ingest(() => api.uploadSource(file))}
              onText={(text, title) => ingest(() => api.pasteSource(text, title))}
              onLink={(url, title) => ingest(() => api.youtubeSource(url, title))}
            />
          )}

          {step === 'customise' && spec && source && (
            <CustomiseStep
              spec={spec}
              source={source}
              options={options}
              onChange={setOptions}
              onGenerate={() => generate(spec.kind, source.id, options)}
            />
          )}

          {step === 'result' && (
            <ResultStep
              busy={busy}
              material={result}
              onOpen={() => result && navigate(`/app/material/${result.id}`)}
              onAgain={() => {
                setResult(null)
                setStep('output')
              }}
            />
          )}
        </>
      </motion.div>
    </Page>
  )
}

/* ------------------------------------------------------------------ scaffolding */

const TRAIL: { id: Step; label: string }[] = [
  { id: 'output', label: 'Output' },
  { id: 'source', label: 'Source' },
  { id: 'customise', label: 'Settings' },
  { id: 'result', label: 'Review' },
]

function Trail({
  step,
  kind,
  sourceTitle,
  onJump,
}: {
  step: Step
  kind: string | null
  sourceTitle: string | null
  onJump: (s: Step) => void
}) {
  const at = TRAIL.findIndex((t) => t.id === step)
  const value = (id: Step) =>
    id === 'output' ? kind : id === 'source' ? sourceTitle : null

  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px]">
      {TRAIL.map((t, i) => {
        const done = i < at
        const here = i === at
        return (
          <li key={t.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!done}
              onClick={() => onJump(t.id)}
              className={cn(
                'interactive flex items-center gap-1.5 rounded-[8px] px-2 py-1 font-medium',
                here ? 'bg-raised text-ink' : done ? 'text-ink-2 hover:bg-raised' : 'text-ink-4',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full text-[10px] tabular-nums',
                  done
                    ? 'bg-good text-white'
                    : here
                      ? 'bg-accent text-white'
                      : 'bg-sunken text-ink-4',
                )}
              >
                {done ? <Check size={10} /> : i + 1}
              </span>
              {t.label}
              {value(t.id) && done && (
                <span className="max-w-[160px] truncate text-ink-4">· {value(t.id)}</span>
              )}
            </button>
            {i < TRAIL.length - 1 && <span className="text-ink-5">›</span>}
          </li>
        )
      })}
    </ol>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-1 mb-4 text-[13.5px] leading-relaxed text-ink-2">{hint}</p>}
      <div className={hint ? '' : 'mt-4'}>{children}</div>
    </section>
  )
}

function Tile({
  icon,
  label,
  detail,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  detail: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'interactive flex gap-3 rounded-[12px] border p-3.5 text-left',
        active
          ? 'border-accent bg-accent-tint'
          : 'border-line bg-surface hover:border-line-strong hover:bg-raised/50',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]',
          active ? 'bg-accent text-white' : 'bg-raised text-ink-3',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-pretty text-ink-2">
          {detail}
        </span>
      </span>
    </button>
  )
}

/* ---------------------------------------------------------------- source step */

function SourceStep({
  sources,
  busy,
  onPick,
  onFile,
  onText,
  onLink,
}: {
  sources: Source[] | null
  busy: boolean
  onPick: (s: Source) => void
  onFile: (f: File) => void
  onText: (text: string, title: string) => void
  onLink: (url: string, title: string) => void
}) {
  const [tab, setTab] = useState<'existing' | 'file' | 'text' | 'link'>(
    sources?.length ? 'existing' : 'file',
  )
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (sources && !sources.length) setTab('file')
  }, [sources])

  const TABS = [
    { id: 'existing' as const, label: `My material${sources?.length ? ` (${sources.length})` : ''}`, icon: FileStack },
    { id: 'file' as const, label: 'Upload', icon: Upload },
    { id: 'text' as const, label: 'Paste text', icon: ClipboardType },
    { id: 'link' as const, label: 'YouTube', icon: Youtube },
  ]

  return (
    <Section
      title="What should it be built from?"
      hint="Material you have already added is reusable — one upload can become a quiz, a test, notes and flashcards without reading the file again."
    >
      <div className="mb-4 inline-flex flex-wrap gap-0.5 rounded-[10px] border border-line bg-raised p-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'interactive flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-medium',
              tab === t.id ? 'bg-surface text-ink shadow-xs' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {busy && (
        <div className="mb-4 flex items-center gap-2.5 rounded-[12px] border border-accent-line bg-accent-tint p-3.5">
          <Sparkles size={16} className="shrink-0 animate-pulse text-accent" />
          <p className="text-[13.5px] text-ink">
            Reading the material — extracting concepts and working out what depends on what.
          </p>
        </div>
      )}

      {tab === 'existing' &&
        (sources === null ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[58px] w-full rounded-[12px]" />
            ))}
          </div>
        ) : sources.length ? (
          <ul className="space-y-2">
            {sources.map((s) => {
              const Icon = SOURCE_ICON[s.kind]
              return (
                <li key={s.id}>
                  <button
                    onClick={() => onPick(s)}
                    disabled={busy}
                    className="interactive flex w-full items-center gap-3 rounded-[12px] border border-line bg-surface p-3.5 text-left hover:border-line-strong hover:bg-raised/50 disabled:opacity-60"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-raised text-ink-3">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink">
                        {s.title}
                      </span>
                      <span className="block truncate text-[12px] text-ink-3">
                        {s.charCount.toLocaleString()} characters · added{' '}
                        {relativeTime(s.createdAt * 1000)}
                      </span>
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-ink-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            icon={<FileStack size={19} />}
            title="No material yet"
            description="Upload a file, paste some text, or point us at a lecture video — whatever you add becomes reusable."
          />
        ))}

      {tab === 'file' && (
        <>
          <UploadZone onFile={onFile} size="lg" />
          <SupportedFormats className="mt-3" />
        </>
      )}

      {tab === 'text' && (
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
            What should we call it?
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lecture 7 — Waves"
            className="interactive mb-3 h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px] hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            placeholder="Paste the material you want to build from…"
            className="interactive w-full resize-y rounded-[12px] border border-line bg-surface p-3 text-[13.5px] leading-relaxed hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[12px] tabular-nums text-ink-4">
              {text.trim().length.toLocaleString()} characters
            </span>
            <Button
              variant="primary"
              loading={busy}
              disabled={text.trim().length < 400}
              onClick={() => onText(text, title.trim() || 'Pasted notes')}
            >
              Use this text
            </Button>
          </div>
        </div>
      )}

      {tab === 'link' && (
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">YouTube link</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="interactive h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px] hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
          />
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
            We read the video's own caption track. A video with captions turned off has no
            transcript to read — paste the text instead.
          </p>
          <div className="mt-3 flex justify-end">
            <Button
              variant="primary"
              loading={busy}
              disabled={url.trim().length < 8}
              onClick={() => onLink(url.trim(), '')}
            >
              Fetch the transcript
            </Button>
          </div>
        </div>
      )}
    </Section>
  )
}

/* ------------------------------------------------------------- customise step */

function CustomiseStep({
  spec,
  source,
  options,
  onChange,
  onGenerate,
}: {
  spec: OutputSpec
  source: Source
  options: GenerateOptions
  onChange: (o: GenerateOptions) => void
  onGenerate: () => void
}) {
  const [advanced, setAdvanced] = useState(false)
  const set = <K extends keyof GenerateOptions>(key: K, value: GenerateOptions[K]) =>
    onChange({ ...options, [key]: value })

  const concepts = source.concepts?.length ?? 0
  const maxQuestions = Math.max(4, Math.min(40, concepts * 2))

  return (
    <Section
      title={`Set up the ${spec.label.toLowerCase()}`}
      hint={`Built from ${source.title} — ${concepts} concepts available. Everything here can still be edited afterwards.`}
    >
      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {spec.kind !== 'lesson_plan' && (
            <NumberField
              label="Questions"
              value={options.questionCount ?? (spec.kind === 'test' ? 12 : spec.kind === 'assignment' ? 6 : 10)}
              min={1}
              max={maxQuestions}
              onChange={(v) => set('questionCount', v)}
              hint={`Up to ${maxQuestions} from this material.`}
            />
          )}
          {(spec.kind === 'test' || spec.kind === 'assignment' || spec.kind === 'lesson_plan') && (
            <NumberField
              label="Duration (minutes)"
              value={options.durationMinutes ?? (spec.kind === 'lesson_plan' ? 40 : 45)}
              min={5}
              max={240}
              step={5}
              onChange={(v) => set('durationMinutes', v)}
            />
          )}
          {spec.kind === 'test' && (
            <NumberField
              label="Total marks"
              value={options.totalMarks ?? 30}
              min={1}
              max={200}
              onChange={(v) => set('totalMarks', v)}
              hint="Distributed by question difficulty."
            />
          )}
        </div>

        {spec.kind === 'test' && (
          <div className="mt-5 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setAdvanced((v) => !v)}
              className="interactive text-[13px] font-medium text-accent hover:underline"
            >
              {advanced ? 'Hide' : 'Show'} exam details
            </button>
            {advanced && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Text
                  label="Board or curriculum"
                  value={options.board ?? ''}
                  onChange={(v) => set('board', v)}
                  placeholder="WAEC · CBSE · IB"
                />
                <Text
                  label="Exam type"
                  value={options.examType ?? ''}
                  onChange={(v) => set('examType', v)}
                  placeholder="Mid-term"
                />
                <Text
                  label="Language"
                  value={options.language ?? ''}
                  onChange={(v) => set('language', v)}
                  placeholder="English"
                />
                <Text
                  label="Version label"
                  value={options.versionLabel ?? ''}
                  onChange={(v) => set('versionLabel', v)}
                  placeholder="Version A"
                />
                <div className="sm:col-span-2">
                  <Text
                    label="Instructions to students"
                    value={options.instructions ?? ''}
                    onChange={(v) => set('instructions', v)}
                    placeholder="Answer all questions. Marks are shown beside each question."
                  />
                </div>
                <div className="sm:col-span-2 flex gap-2.5 rounded-[12px] border border-line bg-raised p-3.5">
                  <Badge tone="neutral" className="mt-px h-fit shrink-0">
                    Left blank
                  </Badge>
                  <p className="text-[12.5px] leading-relaxed text-ink-2">
                    Bloom's level is not guessed for you. Labelling a generated question with a
                    taxonomy level it was not written against would be a made-up number on a
                    document you put in front of a class — set it per question in the editor.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end border-t border-line pt-4">
          <Button
            variant="primary"
            size="lg"
            icon={<Sparkles size={16} />}
            onClick={onGenerate}
          >
            Generate {spec.label.toLowerCase()}
          </Button>
        </div>
      </div>
    </Section>
  )
}

/** Named `NumberField` rather than `Number`: a component called `Number` shadows the
 *  global in this module, and `Number(e.target.value)` then resolves to the component. */
function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  hint,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  hint?: string
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className="interactive h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px] tabular-nums hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
      />
      {hint && <span className="mt-1 block text-[12px] text-ink-4">{hint}</span>}
    </label>
  )
}

function Text({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="interactive h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px] hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
      />
    </label>
  )
}

/* ----------------------------------------------------------------- result step */

function ResultStep({
  busy,
  material,
  onOpen,
  onAgain,
}: {
  busy: boolean
  material: Material | null
  onOpen: () => void
  onAgain: () => void
}) {
  if (busy || !material) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2.5">
          <Sparkles size={17} className="shrink-0 animate-pulse text-accent" />
          <p className="text-[14px] font-medium text-ink">Generating…</p>
        </div>
        <div className="mt-5 space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[52px] w-full rounded-[12px]" />
          ))}
        </div>
      </div>
    )
  }

  const questions =
    material.body.questions?.length ??
    (material.body.sections ?? []).reduce(
      (n, s) => n + (('questions' in s ? s.questions?.length : 0) ?? 0),
      0,
    )

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-good text-white">
          <Check size={13} />
        </span>
        <h2 className="text-[16px] font-semibold text-ink">{material.title}</h2>
      </div>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
        Saved as a draft in your library.{' '}
        {questions > 0
          ? `${questions} question${questions === 1 ? '' : 's'}${
              material.body.totalMarks ? `, ${material.body.totalMarks} marks` : ''
            }. `
          : ''}
        Everything it produced is editable — read it through before it reaches anyone.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button variant="primary" onClick={onOpen} iconRight={<ArrowRight size={15} />}>
          Review and edit
        </Button>
        <Link to="/app/library">
          <Button block>All my material</Button>
        </Link>
        <Button variant="ghost" onClick={onAgain}>
          Create something else
        </Button>
      </div>
    </div>
  )
}
