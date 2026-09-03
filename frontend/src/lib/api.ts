/**
 * Client for the Lattice engine API.
 *
 * Every call is optional to the experience: when the engine is not running the app
 * falls back to its bundled demo material, so a demo never dead-ends on a network error.
 */
import type { Concept, Edge } from './types'

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
      headers:
        init?.body instanceof FormData
          ? init?.headers
          : { 'Content-Type': 'application/json', ...init?.headers },
    })
    if (!res.ok) {
      const detail = await res
        .json()
        .then((b) => (typeof b?.detail === 'string' ? b.detail : null))
        .catch(() => null)
      throw new ApiError(detail ?? `Request failed (${res.status})`, res.status)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

export interface SessionState {
  session_id: string
  concepts: Concept[]
  edges: Edge[]
  questions: number
}

export interface NextQuestion {
  done: false
  question_id: number
  kind: 'mcq' | 'free'
  stem: string
  options: string[]
  difficulty: number
  concept: { id: number; name: string }
}

export type NextResponse = NextQuestion | { done: true }

export interface AnswerResult {
  correct: boolean
  score: number
  ideal_answer: string
  concept: { id: number; name: string }
  mastery_before: number
  mastery_after: number
}

export const api = {
  health: () => request<{ ok: boolean; sessions: number }>('/api/health', undefined, 2500),

  createSession: (text: string, concepts = 18) =>
    request<SessionState>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ text, concepts, use_llm: false }),
    }),

  getSession: (id: string) => request<SessionState>(`/api/sessions/${id}`),

  next: (id: string) => request<NextResponse>(`/api/sessions/${id}/next`, undefined, 20_000),

  answer: (id: string, questionId: number, response: string) =>
    request<AnswerResult>(
      `/api/sessions/${id}/answer`,
      { method: 'POST', body: JSON.stringify({ question_id: questionId, response }) },
      20_000,
    ),

  /** Server-side text extraction for PDF / DOCX / TXT uploads. */
  extract: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ text: string; chars: number; filename: string }>('/api/extract', {
      method: 'POST',
      body: form,
    })
  },
}

/** Resolves to true when the engine is reachable. Never throws. */
export async function engineAvailable(): Promise<boolean> {
  try {
    const r = await api.health()
    return Boolean(r.ok)
  } catch {
    return false
  }
}
