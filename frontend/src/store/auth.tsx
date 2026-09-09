import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, ApiError } from '../lib/api'
import type { Role, School, Seats, User } from '../lib/types'

/**
 * Who is signed in.
 *
 * `status` has three states rather than two because "we have not asked the server yet" and
 * "nobody is signed in" need to look different on screen — conflating them flashes the
 * landing page at a signed-in user on every reload.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthValue {
  status: AuthStatus
  user: User | null
  school: School | null
  seats: Seats | null
  role: Role | null
  /** True for teacher *and* admin — admin is a superset, not a third product. */
  isTeacher: boolean
  isAdmin: boolean
  isStudent: boolean
  signup: (body: Parameters<typeof api.signup>[0]) => Promise<User>
  login: (email: string, password: string) => Promise<User>
  acceptInvitation: (body: { token: string; name: string; password: string }) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [seats, setSeats] = useState<Seats | null>(null)

  const adopt = useCallback((s: { user: User; school: School | null; seats?: Seats }) => {
    setUser(s.user)
    setSchool(s.school)
    setSeats(s.seats ?? null)
    setStatus('authenticated')
    return s.user
  }, [])

  const clear = useCallback(() => {
    setUser(null)
    setSchool(null)
    setSeats(null)
    setStatus('anonymous')
  }, [])

  const refresh = useCallback(async () => {
    try {
      adopt(await api.me())
    } catch (e) {
      // A 401 is the ordinary "not signed in" answer. Anything else means the API is down,
      // which is also anonymous as far as the UI is concerned — the demo surface still works.
      if (!(e instanceof ApiError) || e.status !== 401) {
        console.warn('Could not reach the session endpoint', e)
      }
      clear()
    }
  }, [adopt, clear])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      school,
      seats,
      role: user?.role ?? null,
      isTeacher: user?.role === 'teacher' || user?.role === 'admin',
      isAdmin: user?.role === 'admin',
      isStudent: user?.role === 'student',
      signup: async (body) => adopt(await api.signup(body)),
      login: async (email, password) => adopt(await api.login(email, password)),
      acceptInvitation: async (body) => adopt(await api.acceptInvitation(body)),
      logout: async () => {
        try {
          await api.logout()
        } finally {
          clear()
        }
      },
      refresh,
    }),
    [status, user, school, seats, adopt, clear, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
