/**
 * Client for the Lattice API.
 *
 * Two groups of calls, matching the two surfaces the server exposes:
 *
 *   `api.*`       the platform — authenticated, persistent, school- and class-scoped.
 *   `demo.*`      the original engine routes, anonymous and ephemeral. The landing-page
 *                 demo runs on these so a visitor with no account never hits a dead end.
 *
 * Session cookies are HTTP-only, so every platform call sends `credentials: 'include'` and
 * nothing here ever touches a token.
 */
import type {
  Assignment,
  Attempt,
  ClassAnalytics,
  ClassMember,
  ClassRoom,
  Concept,
  Edge,
  Material,
  MaterialKind,
  MyAnalytics,
  School,
  Seats,
  Source,
  Topic,
  User,
} from './types'

const BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 120_000): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      credentials: 'include',
      headers:
        init?.body instanceof FormData
          ? init?.headers
          : { 'Content-Type': 'application/json', ...init?.headers },
    })
    if (!res.ok) {
      const detail = await res
        .json()
        .then((b) => {
          if (typeof b?.detail === 'string') return b.detail
          // FastAPI validation errors arrive as a list of per-field objects.
          if (Array.isArray(b?.detail)) return b.detail.map((d: any) => d?.msg).filter(Boolean).join('. ')
          return null
        })
        .catch(() => null)
      throw new ApiError(detail ?? `Request failed (${res.status})`, res.status)
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

const get = <T>(path: string, timeout?: number) => request<T>(path, undefined, timeout)
const post = <T>(path: string, body?: unknown, timeout?: number) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }, timeout)
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })

/* ------------------------------------------------------------------ contracts */

export interface Session {
  user: User
  school: School | null
  seats?: Seats
}

export interface StudyState {
  sourceId: string
  concepts: Concept[]
  edges: Edge[]
  topics: Topic[]
  questions: number
}

export interface NextQuestion {
  done: false
  questionId: number
  kind: 'mcq' | 'free'
  stem: string
  options: string[]
  difficulty: number
  concept: { id: number; name: string }
}

export type NextResponse = NextQuestion | { done: true }

export interface StudyResult {
  correct: boolean
  score: number
  idealAnswer: string
  explanation: string
  concept: { id: number; name: string }
  masteryBefore: number
  masteryAfter: number
}

export interface AnswerResult {
  correct: boolean
  score: number
  awarded: number
  marks: number
  idealAnswer: string
  explanation: string
  concept: string | null
}

export interface ClassView {
  class: ClassRoom
  teaching: boolean
  assignments: Assignment[]
  members?: ClassMember[]
}

export interface AssignmentView {
  assignment: Assignment
  teaching: boolean
  results?: { id: string; student_id: string; student_name: string; score: number | null; max_score: number | null; submitted_at: number }[]
  locked?: boolean
  openAttemptId?: string | null
}

export interface BankQuestion {
  id: string
  question: string
  type: string
  options: string[]
  answer: string
  explanation: string | null
  subject: string | null
  grade: string | null
  topic: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  bloom: string | null
  tags: string[]
  created_at: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations: { concept: string; sentence: string }[]
  created_at: number
}

export interface GenerateOptions {
  questionCount?: number
  questionTypes?: ('mcq' | 'free')[]
  totalMarks?: number
  durationMinutes?: number
  mcqShare?: number
  board?: string
  examType?: string
  language?: string
  instructions?: string
  versionLabel?: string
}

/* ----------------------------------------------------------------------- api */

export const api = {
  health: () => get<{ ok: boolean; persistent: boolean }>('/api/health', 2500),

  /* auth */
  signup: (body: {
    name: string
    email: string
    password: string
    role?: 'student' | 'teacher'
    school?: { name: string; plan?: string; city?: string; country?: string; type?: string }
  }) => post<Session>('/api/auth/signup', body, 30_000),
  login: (email: string, password: string) =>
    post<Session>('/api/auth/login', { email, password }, 30_000),
  logout: () => post<{ ok: true }>('/api/auth/logout'),
  me: () => get<Session>('/api/auth/me', 8000),

  readInvitation: (token: string) =>
    get<{ email: string; role: string; school: string | null; className: string | null }>(
      `/api/auth/invitations/${encodeURIComponent(token)}`,
      8000,
    ),
  acceptInvitation: (body: { token: string; name: string; password: string }) =>
    post<Session>('/api/auth/invitations/accept', body, 30_000),
  invite: (body: { email: string; role?: 'student' | 'teacher'; class_id?: string }) =>
    post<{ url: string; email: string; role: string; expiresAt: number }>(
      '/api/auth/invitations',
      body,
    ),
  teachers: () =>
    get<{
      teachers: { id: string; name: string; email: string; created_at: number }[]
      pending: { id: string; email: string; role: string; expires_at: number }[]
      plan: string
      seats: Seats
    }>('/api/auth/teachers'),
  removeTeacher: (id: string) => del<{ ok: true }>(`/api/auth/teachers/${id}`),

  /* sources — the reusable assets everything else is generated from */
  sources: () => get<{ sources: Source[] }>('/api/sources'),
  source: (id: string) => get<Source>(`/api/sources/${id}`),
  deleteSource: (id: string) => del<{ ok: true }>(`/api/sources/${id}`),
  uploadSource: (file: File, title = '') => {
    const form = new FormData()
    form.append('file', file)
    form.append('title', title)
    return request<Source>('/api/sources/file', { method: 'POST', body: form })
  },
  pasteSource: (text: string, title: string) => post<Source>('/api/sources/text', { text, title }),
  youtubeSource: (url: string, title = '') =>
    post<Source>('/api/sources/youtube', { url, title }, 60_000),
  chatHistory: (sourceId: string) => get<{ messages: ChatMessage[] }>(`/api/sources/${sourceId}/chat`),
  chat: (sourceId: string, message: string) =>
    post<{ message: ChatMessage }>(`/api/sources/${sourceId}/chat`, { message }, 45_000),

  /* materials */
  generate: (body: {
    sourceId: string
    kind: MaterialKind
    title?: string
    grade?: string
    options?: GenerateOptions
    save?: boolean
  }) => post<{ material: Material }>('/api/materials/generate', body),
  materials: (kind?: MaterialKind) =>
    get<{ materials: Omit<Material, 'body'>[] }>(
      `/api/materials${kind ? `?kind=${kind}` : ''}`,
    ),
  material: (id: string) => get<{ material: Material }>(`/api/materials/${id}`),
  patchMaterial: (id: string, body: Partial<Pick<Material, 'title' | 'grade' | 'status' | 'body'>>) =>
    patch<{ material: Material }>(`/api/materials/${id}`, body),
  deleteMaterial: (id: string) => del<{ ok: true }>(`/api/materials/${id}`),

  /* question bank */
  bank: () => get<{ questions: BankQuestion[] }>('/api/question-bank'),
  addBankItem: (item: Partial<BankQuestion> & { question: string }) =>
    post<{ question: BankQuestion }>('/api/question-bank', item),
  bankFromSource: (sourceId: string, count = 5, difficulty = 'medium') =>
    post<{ questions: BankQuestion[]; added: number }>('/api/question-bank/from-source', {
      sourceId,
      count,
      difficulty,
    }),
  deleteBankItem: (id: string) => del<{ ok: true }>(`/api/question-bank/${id}`),

  /* classes */
  classes: () => get<{ teaching: ClassRoom[]; enrolled: ClassRoom[] }>('/api/classes'),
  createClass: (body: { name: string; subject?: string; grade?: string }) =>
    post<{ class: ClassRoom }>('/api/classes', body),
  joinClass: (code: string) => post<{ class: ClassRoom }>('/api/classes/join', { code }),
  classView: (id: string) => get<ClassView>(`/api/classes/${id}`),
  removeMember: (classId: string, memberId: string) =>
    del<{ ok: true }>(`/api/classes/${classId}/members/${memberId}`),
  archiveClass: (id: string) => del<{ ok: true }>(`/api/classes/${id}`),

  /* assignments */
  assign: (
    classId: string,
    body: { materialId: string; title?: string; instructions?: string; dueAt?: number | null },
  ) => post<{ assignment: Assignment }>(`/api/classes/${classId}/assignments`, body),
  assignments: () => get<{ assignments: Assignment[] }>('/api/assignments'),
  assignment: (id: string) => get<AssignmentView>(`/api/assignments/${id}`),

  /* attempts */
  startAttempt: (assignmentId: string) =>
    post<{ attempt: Attempt; resumed: boolean }>('/api/attempts', { assignmentId }),
  answerAttempt: (attemptId: string, ref: string, response: string) =>
    post<AnswerResult>(`/api/attempts/${attemptId}/answer`, { ref, response }, 30_000),
  submitAttempt: (attemptId: string) =>
    post<{ attempt: Attempt }>(`/api/attempts/${attemptId}/submit`),
  attempt: (id: string) => get<{ attempt: Attempt }>(`/api/attempts/${id}`),
  attempts: () => get<{ attempts: Attempt[] }>('/api/attempts'),

  /* adaptive practice — persistent, per user, per source */
  study: (sourceId: string) => get<StudyState>(`/api/study/${sourceId}`),
  studyNext: (sourceId: string) => get<NextResponse>(`/api/study/${sourceId}/next`, 20_000),
  studyAnswer: (sourceId: string, questionId: number, response: string) =>
    post<StudyResult>(`/api/study/${sourceId}/answer`, { questionId, response }, 20_000),

  /* analytics — computed from recorded answers, never mocked */
  myAnalytics: () => get<MyAnalytics>('/api/analytics/me'),
  classAnalytics: (classId: string) => get<ClassAnalytics>(`/api/analytics/class/${classId}`),
}

/* ------------------------------------------------ the anonymous demo surface */

export interface DemoSessionState {
  session_id: string
  concepts: Concept[]
  edges: Edge[]
  questions: number
}

export const demo = {
  extract: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ text: string; chars: number; filename: string }>('/api/extract', {
      method: 'POST',
      body: form,
    })
  },
  createSession: (text: string, concepts = 18) =>
    post<DemoSessionState>('/api/sessions', { text, concepts, use_llm: false }),
  session: (id: string) => get<DemoSessionState>(`/api/sessions/${id}`),
  next: (id: string) =>
    get<
      | { done: true }
      | {
          done: false
          question_id: number
          kind: 'mcq' | 'free'
          stem: string
          options: string[]
          difficulty: number
          concept: { id: number; name: string }
        }
    >(`/api/sessions/${id}/next`, 20_000),
  answer: (id: string, questionId: number, response: string) =>
    post<{
      correct: boolean
      score: number
      ideal_answer: string
      concept: { id: number; name: string }
      mastery_before: number
      mastery_after: number
    }>(`/api/sessions/${id}/answer`, { question_id: questionId, response }, 20_000),
}

/** Resolves to true when the engine is reachable. Never throws. */
export async function engineAvailable(): Promise<boolean> {
  try {
    return Boolean((await api.health()).ok)
  } catch {
    return false
  }
}
