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
  /** Present when this pack is backed by an anonymous, ephemeral engine session. */
  sessionId?: string
  /** Present when this pack is backed by a persisted source owned by the signed-in user.
   *  Takes precedence over `sessionId`: the study loop is then per-user and survives a reload. */
  sourceId?: string
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


/* ------------------------------------------------------------------ platform */

export type Role = 'student' | 'teacher' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  schoolId: string | null
}

export interface School {
  id: string
  name: string
  plan: 'trial' | 'starter' | 'professional' | 'enterprise'
}

export interface Seats {
  limit: number | null
  used: number
}

export type MaterialKind =
  | 'quiz'
  | 'test'
  | 'notes'
  | 'assignment'
  | 'lesson_plan'
  | 'flashcards'
  | 'summary'

/** A reusable ingested asset. One upload, many materials. */
export interface Source {
  id: string
  kind: 'file' | 'text' | 'youtube'
  title: string
  origin: string | null
  charCount: number
  createdAt: number
  ownerId: string
  /** Present on a single-source read, absent from the list. */
  subject?: SubjectKey
  concepts?: Concept[]
  edges?: Edge[]
  topics?: Topic[]
  questionCount?: number
}

export interface MaterialQuestion {
  ref: string
  kind: 'mcq' | 'free'
  stem: string
  options: string[]
  concept: string
  conceptId: number
  difficulty: number
  marks?: number
  bloom?: string
  /** Withheld by the server when a student reads assigned work. */
  answer?: string
  explanation?: string
}

export interface MaterialSection {
  id: string
  title: string
  instructions?: string
  questions: MaterialQuestion[]
}

export interface MaterialBody {
  questions?: MaterialQuestion[]
  sections?: (MaterialSection | NoteSection)[]
  cards?: Flashcard[]
  totalMarks?: number
  readingMinutes?: number
  instructions?: string
  durationMinutes?: number
  examType?: string
  board?: string
  language?: string
  versionLabel?: string
  scaffold?: boolean
  objectives?: string[]
  materials?: string[]
  activities?: { minutes: number; title: string; detail: string }[]
  assessment?: string
  differentiation?: string
  estimatedMinutes?: number
}

export interface Material {
  id: string
  kind: MaterialKind
  title: string
  subject: SubjectKey | null
  grade: string | null
  status: 'draft' | 'published'
  sourceId: string | null
  ownerId: string
  createdAt: number
  updatedAt: number
  body: MaterialBody
  readOnly?: boolean
}

export interface ClassRoom {
  id: string
  name: string
  subject: string | null
  grade: string | null
  joinCode: string
  teacherId: string
  teacherName?: string
  studentCount?: number
  createdAt: number
}

export interface ClassMember {
  id: string
  name: string
  email: string
  role: 'student' | 'co_teacher'
  joined_at: number
}

export interface Assignment {
  id: string
  classId: string
  className?: string
  materialId: string
  materialKind?: MaterialKind
  title: string
  instructions: string | null
  dueAt: number | null
  publishedAt: number | null
  createdAt: number
  /** Teacher view. */
  submissions?: number
  /** Student view: their own most recent submitted attempt. */
  attemptId?: string | null
  score?: number | null
}

export interface AnswerRow {
  id: string
  question_ref: string
  prompt: string | null
  response: string
  correct: number
  score: number
  concept: string | null
  answered_at: number
  /** Attached by the server only once the attempt has been submitted. */
  ideal_answer?: string | null
  explanation?: string | null
}

export interface Attempt {
  id: string
  kind: string
  assignment_id: string | null
  material_id: string | null
  started_at: number
  submitted_at: number | null
  score: number | null
  max_score: number | null
  answers: AnswerRow[]
}

export interface ConceptStat {
  concept: string
  attempts: number
  accuracy: number
  reliable: boolean
}

export interface MyAnalytics {
  hasData: boolean
  answered: number
  accuracy: number | null
  attempts: number
  weakest: ConceptStat[]
  strongest: ConceptStat[]
  concepts: ConceptStat[]
  sources: { id: string; title: string; kind: string; mastery: number | null; testedConcepts: number }[]
  history: { id: string; title: string; kind: string; score: number | null; maxScore: number | null; submittedAt: number }[]
}

export interface ClassAnalytics {
  hasData: boolean
  roster: number
  assignments: {
    id: string
    title: string
    kind: string | null
    dueAt: number | null
    submissions: number
    roster: number
    completion: number | null
    averageScore: number | null
    accuracy: number | null
  }[]
  weakConcepts: ConceptStat[]
  strongConcepts: ConceptStat[]
  mostMissed: { prompt: string; attempts: number; accuracy: number }[]
  students: { id: string; name: string; completed: number; assigned: number; averageScore: number | null }[]
}
