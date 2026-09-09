import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ActivityEntry, Pack } from '../lib/types'
import { demoActivity, demoPacks } from '../data/packs'
import { api, engineAvailable } from '../lib/api'
import { packFromSource } from '../lib/pack'
import { useAuth } from './auth'

export type EngineStatus = 'checking' | 'online' | 'offline'

export interface Toast {
  id: string
  title: string
  description?: string
  tone: 'default' | 'success' | 'error'
}

interface AppValue {
  packs: Pack[]
  /** True while the signed-in user's own material is still being fetched. */
  loadingPacks: boolean
  activity: ActivityEntry[]
  engine: EngineStatus
  toasts: Toast[]
  getPack: (id: string | undefined) => Pack | undefined
  addPack: (pack: Pack) => void
  patchPack: (id: string, patch: Partial<Pack>) => void
  setConceptMastery: (packId: string, conceptName: string, mastery: number) => void
  logActivity: (entry: Omit<ActivityEntry, 'id' | 'at'> & { at?: number }) => void
  /** Re-probes the engine — it may have been started after the page loaded. */
  refreshEngine: () => Promise<boolean>
  /** Re-reads the signed-in user's sources from the server. */
  reloadPacks: () => Promise<void>
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

const AppContext = createContext<AppValue | null>(null)

// Bump when the Pack shape changes; old state is then dropped rather than half-read.
const STORAGE_KEY = 'lattice.state.v2'

interface Persisted {
  packs: Pack[]
  activity: ActivityEntry[]
}

/** A stored pack is only usable if it still has every collection the UI reads. */
function isUsable(p: unknown): p is Pack {
  const pack = p as Partial<Pack> | null
  return Boolean(
    pack &&
      typeof pack.id === 'string' &&
      Array.isArray(pack.concepts) &&
      Array.isArray(pack.edges) &&
      Array.isArray(pack.topics) &&
      Array.isArray(pack.notes) &&
      Array.isArray(pack.flashcards) &&
      Array.isArray(pack.quiz),
  )
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Persisted
      const packs = (parsed.packs ?? []).filter(isUsable)
      if (packs.length) {
        return { packs, activity: Array.isArray(parsed.activity) ? parsed.activity : demoActivity }
      }
    }
  } catch {
    /* private mode, cleared storage, or a shape we no longer understand */
  }
  return { packs: demoPacks, activity: demoActivity }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const initial = useRef<Persisted>()
  if (!initial.current) initial.current = load()

  const [packs, setPacks] = useState<Pack[]>(initial.current.packs)
  const [activity, setActivity] = useState<ActivityEntry[]>(initial.current.activity)
  const [engine, setEngine] = useState<EngineStatus>('checking')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [loadingPacks, setLoadingPacks] = useState(false)

  useEffect(() => {
    let alive = true
    engineAvailable().then((ok) => alive && setEngine(ok ? 'online' : 'offline'))
    return () => {
      alive = false
    }
  }, [])

  /**
   * A signed-in user's material comes from the server, not from this browser.
   *
   * Each source is fetched individually because the list endpoint deliberately omits the
   * analysis — concepts and evidence are large, and the list only needs titles.
   */
  const loadFromServer = useCallback(async () => {
    setLoadingPacks(true)
    try {
      const { sources } = await api.sources()
      const full = await Promise.all(
        sources.map((s) => api.source(s.id).catch(() => null)),
      )
      setPacks(full.filter((s): s is NonNullable<typeof s> => Boolean(s)).map(packFromSource))
    } catch (e) {
      console.warn('Could not load your material', e)
    } finally {
      setLoadingPacks(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      void loadFromServer()
      // The bundled activity feed is demo data. Showing a real account "Quiz — 8 of 10
      // correct, 6 days ago" for a document they have never opened is exactly the kind of
      // convincing fiction this product must not print, so it is cleared on sign-in and
      // refilled only by things the person actually does.
      setActivity([])
    } else if (status === 'anonymous') {
      // Back to the bundled demo material, so signing out does not leave another account's
      // titles on screen.
      const demo = load()
      setPacks(demo.packs)
      setActivity(demo.activity)
    }
  }, [status, user?.id, loadFromServer])

  useEffect(() => {
    // Only the anonymous demo persists to this browser. A signed-in user's material lives in
    // the database, and mirroring it into localStorage would leak it to the next person to
    // use the machine.
    if (status === 'authenticated') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ packs, activity }))
    } catch {
      /* storage is a convenience here, never a requirement */
    }
  }, [packs, activity, status])

  const getPack = useCallback((id: string | undefined) => packs.find((p) => p.id === id), [packs])

  const addPack = useCallback((pack: Pack) => {
    setPacks((prev) => [pack, ...prev.filter((p) => p.id !== pack.id)])
  }, [])

  const patchPack = useCallback((id: string, patch: Partial<Pack>) => {
    setPacks((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }, [])

  const setConceptMastery = useCallback((packId: string, conceptName: string, mastery: number) => {
    setPacks((prev) =>
      prev.map((p) =>
        p.id !== packId
          ? p
          : {
              ...p,
              concepts: p.concepts.map((c) =>
                c.name === conceptName ? { ...c, mastery, attempts: c.attempts + 1 } : c,
              ),
            },
      ),
    )
  }, [])

  const logActivity = useCallback<AppValue['logActivity']>((entry) => {
    setActivity((prev) =>
      [
        { ...entry, at: entry.at ?? Date.now(), id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
        ...prev,
      ].slice(0, 40),
    )
  }, [])

  const refreshEngine = useCallback(async () => {
    const ok = await engineAvailable()
    setEngine(ok ? 'online' : 'offline')
    return ok
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback<AppValue['toast']>(
    (t) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setToasts((prev) => [...prev.slice(-2), { ...t, id }])
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200)
    },
    [],
  )

  const value = useMemo<AppValue>(
    () => ({
      packs,
      loadingPacks,
      activity,
      engine,
      toasts,
      getPack,
      addPack,
      patchPack,
      setConceptMastery,
      logActivity,
      refreshEngine,
      reloadPacks: loadFromServer,
      toast,
      dismissToast,
    }),
    [
      packs,
      loadingPacks,
      activity,
      engine,
      toasts,
      getPack,
      addPack,
      patchPack,
      setConceptMastery,
      logActivity,
      refreshEngine,
      loadFromServer,
      toast,
      dismissToast,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
