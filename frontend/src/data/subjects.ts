import type { SubjectKey, SourceKind } from '../lib/types'

export interface SubjectMeta {
  key: SubjectKey
  label: string
  color: string
  tint: string
}

export const SUBJECTS: Record<SubjectKey, SubjectMeta> = {
  biology: { key: 'biology', label: 'Biology', color: '#2f7d5f', tint: '#ecf5f1' },
  physics: { key: 'physics', label: 'Physics', color: '#3a6ea8', tint: '#eef3f9' },
  math: { key: 'math', label: 'Mathematics', color: '#7a4fa8', tint: '#f4eff9' },
  cs: { key: 'cs', label: 'Computer Science', color: '#a8683a', tint: '#f9f1ec' },
  history: { key: 'history', label: 'History', color: '#8a6236', tint: '#f7f2ec' },
  general: { key: 'general', label: 'General', color: '#56565f', tint: '#f2f2f1' },
}

export const SOURCE_LABEL: Record<SourceKind, string> = {
  pdf: 'PDF',
  notes: 'Notes',
  youtube: 'YouTube',
  recording: 'Recording',
  slides: 'Slides',
}

/**
 * Guess a subject from the material's own vocabulary. Crude on purpose — it only
 * decides which colour dot a card gets, and the user can always rename the pack.
 */
export function inferSubject(text: string): SubjectKey {
  const t = text.toLowerCase()
  const score = (words: string[]) => words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0)
  const table: [SubjectKey, number][] = [
    ['biology', score(['cell', 'protein', 'enzyme', 'organism', 'dna', 'membrane', 'species'])],
    ['physics', score(['force', 'energy', 'velocity', 'wave', 'quantum', 'momentum', 'photon'])],
    ['math', score(['theorem', 'matrix', 'vector', 'integral', 'proof', 'eigen', 'function'])],
    ['cs', score(['algorithm', 'complexity', 'compiler', 'pointer', 'runtime', 'data structure'])],
    ['history', score(['century', 'empire', 'revolution', 'treaty', 'war', 'dynasty'])],
  ]
  const [best, n] = table.sort((a, b) => b[1] - a[1])[0]
  return n >= 2 ? best : 'general'
}
