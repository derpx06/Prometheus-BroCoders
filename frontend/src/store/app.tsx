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
import { engineAvailable } from '../lib/api'

export type EngineStatus = 'checking' | 'online' | 'offline'

export interface Toast {
  id: string
  title: string
  description?: string
  tone: 'default' | 'success' | 'error'
}

interface AppValue {
  packs: Pack[]
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
  const initial = useRef<Persisted>()
  if (!initial.current) initial.current = load()

  const [packs, setPacks] = useState<Pack[]>(initial.current.packs)
  const [activity, setActivity] = useState<ActivityEntry[]>(initial.current.activity)
  const [engine, setEngine] = useState<EngineStatus>('checking')
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    let alive = true
    engineAvailable().then((ok) => alive && setEngine(ok ? 'online' : 'offline'))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ packs, activity }))
    } catch {
      /* storage is a convenience here, never a requirement */
    }
  }, [packs, activity])

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
      activity,
      engine,
      toasts,
      getPack,
      addPack,
      patchPack,
      setConceptMastery,
      logActivity,
      refreshEngine,
      toast,
      dismissToast,
    }),
    [
      packs,
      activity,
      engine,
      toasts,
      getPack,
      addPack,
      patchPack,
      setConceptMastery,
      logActivity,
      refreshEngine,
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
