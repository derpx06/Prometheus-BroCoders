export type SubjectKey = 'biology' | 'physics' | 'math' | 'cs' | 'history' | 'general'

export type SourceKind = 'pdf' | 'notes' | 'youtube' | 'recording' | 'slides'

export interface Concept {
  id: number
  name: string
  mastery: number
  attempts: number
  evidence: string[]
}

export interface Edge {
  source: number
  target: number
  weight: number
}

export type NoteBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'callout'; tone: 'key' | 'note' | 'warn'; title: string; text: string }
  | { type: 'equation'; latex: string; caption?: string }
  | { type: 'table'; head: string[]; rows: string[][] }

export interface NoteSection {
  id: string
  title: string
  blocks: NoteBlock[]
}

export interface Flashcard {
  id: string
  front: string
  back: string
  concept: string
}

export interface QuizQuestion {
  id: number
  kind: 'mcq' | 'free'
  stem: string
  options: string[]
  answer: string
  explanation: string
  concept: string
  /** 0..1, from the engine's confusability × rarity score. */
  difficulty: number
}

/**
 * A step on the learning path. Topics group concepts into the order a student should
 * actually work through them, which is coarser than the concept graph and easier to act on.
 */
export interface Topic {
  id: string
  title: string
  summary: string
  conceptIds: number[]
  estMinutes: number
}

export interface Pack {
  id: string
  title: string
  subject: SubjectKey
  folder: string
  sourceLabel: string
  sourceKind: SourceKind
  createdAt: number
  lastStudied: number | null
  /** 0..1 overall progress through the pack. */
  progress: number
  summary: string
  minutes: number
  concepts: Concept[]
  edges: Edge[]
  topics: Topic[]
  notes: NoteSection[]
  flashcards: Flashcard[]
  quiz: QuizQuestion[]
  /** Present when this pack is backed by a live engine session. */
  sessionId?: string
}

export interface ActivityEntry {
  id: string
  kind: 'quiz' | 'flashcards' | 'notes' | 'upload'
  packId: string
  label: string
  detail: string
  at: number
  score?: number
}
