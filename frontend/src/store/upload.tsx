import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { Pack, SourceKind } from '../lib/types'
import { api } from '../lib/api'
import { buildPackFromSession } from '../lib/pack'
import { SAMPLE_MATERIAL } from '../data/packs'
import { biologyPack } from '../data/biology'
import { useApp } from './app'
import { UploadModal } from '../components/app/UploadModal'
import { STAGES } from '../components/app/ProcessingView'

export type UploadPhase = 'choose' | 'processing' | 'done' | 'error'

interface UploadValue {
  open: boolean
  phase: UploadPhase
  stage: number
  fileName: string
  doneTitle: string
  error: string | null
  initialTab: 'file' | 'text' | 'link'
  openUpload: (tab?: 'file' | 'text' | 'link') => void
  closeUpload: () => void
  submitFile: (file: File) => void
  submitText: (text: string, label: string) => void
  submitSample: () => void
  reset: () => void
}

const UploadContext = createContext<UploadValue | null>(null)

const MIN_STAGE_MS = 620
const COMPLETE_BEAT_MS = 950

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function kindFromName(name: string): SourceKind {
  const n = name.toLowerCase()
  if (n.endsWith('.pdf')) return 'pdf'
  if (n.endsWith('.ppt') || n.endsWith('.pptx')) return 'slides'
  return 'notes'
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { addPack, logActivity, toast, engine, refreshEngine } = useApp()

  const [open, setOpen] = useState(false)
  const [initialTab, setInitialTab] = useState<'file' | 'text' | 'link'>('file')
  const [phase, setPhase] = useState<UploadPhase>('choose')
  const [stage, setStage] = useState(0)
  const [fileName, setFileName] = useState('')
  const [doneTitle, setDoneTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const running = useRef(false)

  const openUpload = useCallback((tab: 'file' | 'text' | 'link' = 'file') => {
    setInitialTab(tab)
    setPhase('choose')
    setError(null)
    setStage(0)
    setOpen(true)
  }, [])

  const closeUpload = useCallback(() => {
    if (running.current) return
    setOpen(false)
  }, [])

  const reset = useCallback(() => {
    setPhase('choose')
    setError(null)
    setStage(0)
  }, [])

  /**
   * Drives the staged display while the real work happens.
   *
   * Stages advance on a floor timer but hold at the last one until the work resolves, so
   * the indicator can never claim to be finished before the pack exists. Then a short
   * "ready" beat before the app transitions — the moment the whole demo turns on.
   */
  const run = useCallback(
    async (label: string, work: () => Promise<Pack>) => {
      running.current = true
      setFileName(label)
      setPhase('processing')
      setStage(0)
      setError(null)

      let settled = false
      const task = work().finally(() => {
        settled = true
      })

      const ticker = (async () => {
        for (let i = 0; i < STAGES.length - 1; i++) {
          await sleep(MIN_STAGE_MS)
          if (!running.current) return
          setStage(i + 1)
        }
        while (!settled && running.current) await sleep(120)
      })()

      try {
        const [pack] = await Promise.all([task, ticker])
        setDoneTitle(pack.title)
        setPhase('done')
        await sleep(COMPLETE_BEAT_MS)

        setOpen(false)
        navigate(`/app/pack/${pack.id}`)
        toast({
          tone: 'success',
          title: 'Your learning path is ready',
          description: `${pack.concepts.length} concepts · ${pack.topics.length} topics`,
        })
      } finally {
        running.current = false
      }
    },
    [navigate, toast],
  )

  const fail = useCallback((message: string) => {
    setPhase('error')
    setError(message)
  }, [])

  const ingest = useCallback(
    async (text: string, label: string, kind: SourceKind): Promise<Pack> => {
      const state = await api.createSession(text)
      const pack = buildPackFromSession(state, { sourceLabel: label, sourceKind: kind, text })
      addPack(pack)
      logActivity({
        kind: 'upload',
        packId: pack.id,
        label: pack.title,
        detail: `Learning path built from ${label}`,
      })
      return pack
    },
    [addPack, logActivity],
  )

  const OFFLINE_MSG =
    'We could not reach the Lattice engine, so there is nothing to read your file with. Start it with `uv run uvicorn backend.main:app --reload` and try again — or open the sample pack in the meantime.'

  /** The engine may have been started after this page loaded, so re-probe before giving up. */
  const requireEngine = useCallback(async () => {
    if (engine === 'online') return
    if (!(await refreshEngine())) throw new Error(OFFLINE_MSG)
  }, [engine, refreshEngine])

  const submitFile = useCallback(
    async (file: File) => {
      const kind = kindFromName(file.name)
      try {
        await run(file.name, async () => {
          await requireEngine()
          const { text } = await api.extract(file)
          return ingest(text, file.name, kind)
        })
      } catch (e) {
        fail(e instanceof Error ? e.message : 'We could not read that file. Try uploading it again.')
      }
    },
    [requireEngine, ingest, run, fail],
  )

  const submitText = useCallback(
    async (text: string, label: string) => {
      try {
        await run(label, async () => {
          await requireEngine()
          if (text.trim().length < 400)
            throw new Error(
              'That is a little short to work with. Paste at least a few paragraphs so there are enough concepts to connect.',
            )
          return ingest(text, label, 'notes')
        })
      } catch (e) {
        fail(e instanceof Error ? e.message : 'We could not make sense of that text.')
      }
    },
    [requireEngine, ingest, run, fail],
  )

  /** The sample runs through the real engine when it is up, and falls back to the
   *  bundled pack built from the same document when it is not. */
  const submitSample = useCallback(async () => {
    const label = 'Cell Biology — Lecture 04.pdf'
    try {
      await run(label, async () => {
        if (engine === 'online' || (await refreshEngine())) {
          return ingest(SAMPLE_MATERIAL, label, 'pdf')
        }
        addPack({ ...biologyPack, lastStudied: biologyPack.lastStudied ?? Date.now() })
        return biologyPack
      })
    } catch {
      // engine hiccuped mid-ingest: the bundled pack covers the same document
      addPack(biologyPack)
      setOpen(false)
      navigate(`/app/pack/${biologyPack.id}`)
    }
  }, [engine, refreshEngine, ingest, run, addPack, navigate])

  const value = useMemo<UploadValue>(
    () => ({
      open,
      phase,
      stage,
      fileName,
      doneTitle,
      error,
      initialTab,
      openUpload,
      closeUpload,
      submitFile,
      submitText,
      submitSample,
      reset,
    }),
    [
      open,
      phase,
      stage,
      fileName,
      doneTitle,
      error,
      initialTab,
      openUpload,
      closeUpload,
      submitFile,
      submitText,
      submitSample,
      reset,
    ],
  )

  return (
    <UploadContext.Provider value={value}>
      {children}
      <UploadModal />
    </UploadContext.Provider>
  )
}

export function useUpload(): UploadValue {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUpload must be used inside <UploadProvider>')
  return ctx
}
