import type { Concept, Flashcard, NoteSection, Pack, Source, SourceKind, Topic } from './types'
import type { DemoSessionState } from './api'
import { inferSubject, SUBJECTS } from '../data/subjects'
import { titleCase } from './format'

/** "Cell Biology — Lecture 04.pdf" -> "Cell Biology — Lecture 04" */
export function titleFromSource(label: string): string {
  const base = label.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ')
  const cleaned = base.replace(/\s+/g, ' ').trim()
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Untitled material'
}

/** Dependency depth per concept. The engine guarantees a DAG, so this settles fast. */
function layerOf(state: { concepts: Concept[]; edges: DemoSessionState['edges'] }): Map<number, number> {
  const depth = new Map<number, number>(state.concepts.map((c) => [c.id, 0]))
  for (let pass = 0; pass < state.concepts.length; pass++) {
    let moved = false
    for (const e of state.edges) {
      const next = (depth.get(e.source) ?? 0) + 1
      if (next > (depth.get(e.target) ?? 0)) {
        depth.set(e.target, next)
        moved = true
      }
    }
    if (!moved) break
  }
  return depth
}

/**
 * Turn the concept graph into an ordered learning path.
 *
 * Topics are dependency layers: everything in step 2 depends on something in step 1, so
 * working top to bottom means never meeting a concept before its prerequisites.
 */
export function buildTopics(concepts: Concept[], edges: DemoSessionState['edges']): Topic[] {
  if (!concepts.length) return []
  const depth = layerOf({ concepts, edges })
  const groups = new Map<number, Concept[]>()
  for (const c of concepts) {
    const d = depth.get(c.id) ?? 0
    groups.set(d, [...(groups.get(d) ?? []), c])
  }

  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([layer, group]) => ({
      id: `layer-${layer}`,
      title: titleCase(group[0].name),
      summary:
        group.length > 1
          ? `${titleCase(group[0].name)}, and ${group.length - 1} concept${group.length > 2 ? 's' : ''} that sit alongside it.`
          : (group[0].evidence[0] ?? titleCase(group[0].name)),
      conceptIds: group.map((c) => c.id),
      estMinutes: Math.max(4, Math.round(group.length * 2.5)),
    }))
}

/**
 * Turn a live engine session into the pack shape the UI reads.
 *
 * Notes and flashcards are assembled from the concept evidence — the actual sentences
 * from the student's own document — rather than invented, so nothing on screen is
 * ungrounded. Quiz questions are not materialised here: an engine-backed pack pulls them
 * one at a time from the adaptive loop, which is the whole point of the engine.
 */
export function buildPackFromSession(
  state: DemoSessionState,
  opts: { sourceLabel: string; sourceKind: SourceKind; text: string },
): Pack {
  const subject = inferSubject(opts.text)
  const title = titleFromSource(opts.sourceLabel)

  const ranked = [...state.concepts].sort((a, b) => b.evidence.length - a.evidence.length)
  const headline = ranked.slice(0, 6).map((c) => c.name)

  const notes: NoteSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      blocks: [
        {
          type: 'paragraph',
          text: `Lattice read ${opts.sourceLabel} and pulled out ${state.concepts.length} distinct concepts, then worked out which ones depend on which. The sections below follow that order — earlier concepts first, so nothing arrives before its prerequisites.`,
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'Where to start',
          text: `The material leans hardest on ${headline.slice(0, 3).map(titleCase).join(', ')}. Those carry the most supporting text, so they are the safest place to begin.`,
        },
        { type: 'bullets', items: headline.map((n) => titleCase(n)) },
      ],
    },
    ...state.concepts
      .filter((c) => c.evidence.length)
      .map<NoteSection>((c) => ({
        id: `c-${c.id}`,
        title: titleCase(c.name),
        blocks: [
          ...c.evidence.map((sentence) => ({ type: 'paragraph' as const, text: sentence })),
          ...(prerequisiteNames(state, c.id).length
            ? [
                {
                  type: 'callout' as const,
                  tone: 'note' as const,
                  title: 'Builds on',
                  text: prerequisiteNames(state, c.id).map(titleCase).join(' · '),
                },
              ]
            : []),
        ],
      })),
  ]

  const flashcards: Flashcard[] = state.concepts
    .filter((c) => c.evidence.length)
    .map<Flashcard>((c) => ({
      id: `f-${c.id}`,
      front: `What is ${c.name}?`,
      back: c.evidence[0],
      concept: c.name,
    }))

  return {
    id: `pack-${state.session_id}`,
    title,
    subject,
    folder: SUBJECTS[subject].label,
    sourceLabel: opts.sourceLabel,
    sourceKind: opts.sourceKind,
    createdAt: Date.now(),
    lastStudied: null,
    progress: 0,
    minutes: 0,
    summary: `${state.concepts.length} concepts, ${state.edges.length} prerequisite links and ${state.questions} generated questions, all drawn from ${opts.sourceLabel}.`,
    concepts: state.concepts,
    edges: state.edges,
    topics: buildTopics(state.concepts, state.edges),
    notes,
    flashcards,
    quiz: [],
    sessionId: state.session_id,
  }
}

/**
 * A persisted source, in the shape every existing screen already reads.
 *
 * This is the migration bridge. `StudyPack`, `NotesReader`, `Quiz`, `Flashcards`, `Library`
 * and `Progress` were all written against `Pack`; rather than rewrite six screens to talk to
 * the new API, the new API's `Source` is adapted into `Pack` here. The screens do not change,
 * and what they render stops being `localStorage` and starts being the database.
 */
export function packFromSource(source: Source): Pack {
  const concepts = source.concepts ?? []
  const edges = source.edges ?? []
  const kind: SourceKind =
    source.kind === 'youtube' ? 'youtube' : source.kind === 'file' ? 'pdf' : 'notes'
  const subject = source.subject ?? 'general'

  const ranked = [...concepts].sort((a, b) => b.evidence.length - a.evidence.length)
  const headline = ranked.slice(0, 6).map((c) => c.name)

  const notes: NoteSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      blocks: [
        {
          type: 'paragraph',
          text: `Lattice read ${source.title} and pulled out ${concepts.length} distinct concepts, then worked out which ones depend on which. The sections below follow that order — earlier concepts first, so nothing arrives before its prerequisites.`,
        },
        ...(headline.length
          ? [
              {
                type: 'callout' as const,
                tone: 'key' as const,
                title: 'Where to start',
                text: `The material leans hardest on ${headline.slice(0, 3).map(titleCase).join(', ')}. Those carry the most supporting text, so they are the safest place to begin.`,
              },
              { type: 'bullets' as const, items: headline.map(titleCase) },
            ]
          : []),
      ],
    },
    ...concepts
      .filter((c) => c.evidence.length)
      .map<NoteSection>((c) => {
        const builds = edges
          .filter((e) => e.target === c.id)
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 2)
          .map((e) => concepts.find((x) => x.id === e.source)?.name)
          .filter((n): n is string => Boolean(n))
        return {
          id: `c-${c.id}`,
          title: titleCase(c.name),
          blocks: [
            ...c.evidence.map((sentence) => ({ type: 'paragraph' as const, text: sentence })),
            ...(builds.length
              ? [
                  {
                    type: 'callout' as const,
                    tone: 'note' as const,
                    title: 'Builds on',
                    text: builds.map(titleCase).join(' · '),
                  },
                ]
              : []),
          ],
        }
      }),
  ]

  const flashcards: Flashcard[] = concepts
    .filter((c) => c.evidence.length)
    .map<Flashcard>((c) => ({
      id: `f-${c.id}`,
      front: `What is ${c.name}?`,
      back: c.evidence[0],
      concept: c.name,
    }))

  const touched = concepts.some((c) => c.attempts > 0)

  return {
    id: `src-${source.id}`,
    title: source.title,
    subject,
    folder: SUBJECTS[subject].label,
    sourceLabel: source.origin ?? source.title,
    sourceKind: kind,
    createdAt: source.createdAt * 1000,
    lastStudied: touched ? Date.now() : null,
    progress: 0,
    minutes: 0,
    summary: `${concepts.length} concepts, ${edges.length} prerequisite links and ${source.questionCount ?? 0} generated questions, all drawn from ${source.title}.`,
    concepts,
    edges,
    topics: source.topics ?? buildTopics(concepts, edges),
    notes,
    flashcards,
    quiz: [],
    sourceId: source.id,
  }
}

function prerequisiteNames(state: DemoSessionState, id: number): string[] {
  return state.edges
    .filter((e) => e.target === id)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((e) => state.concepts.find((c) => c.id === e.source)?.name)
    .filter((n): n is string => Boolean(n))
}

/* ------------------------------------------------------- derived read models */

export function hasStarted(pack: Pack): boolean {
  return pack.lastStudied !== null || pack.concepts.some((c) => c.attempts > 0)
}

/**
 * Overall pack progress = mean mastery across its concepts.
 *
 * An untouched pack still scores the engine's prior (0.2 per concept), which is a belief
 * rather than evidence — so an unstarted pack reports zero.
 */
export function packProgress(pack: Pack): number {
  if (!hasStarted(pack)) return 0
  if (!pack.concepts.length) return pack.progress
  return pack.concepts.reduce((n, c) => n + c.mastery, 0) / pack.concepts.length
}

export function conceptsOf(pack: Pack, topic: Topic): Concept[] {
  return topic.conceptIds
    .map((id) => pack.concepts.find((c) => c.id === id))
    .filter((c): c is Concept => Boolean(c))
}

export function topicMastery(pack: Pack, topic: Topic): number {
  const cs = conceptsOf(pack, topic)
  if (!cs.length) return 0
  if (!cs.some((c) => c.attempts > 0)) return 0
  return cs.reduce((n, c) => n + c.mastery, 0) / cs.length
}

export function weakestConcepts(pack: Pack, n = 3): Concept[] {
  return [...pack.concepts]
    .filter((c) => c.attempts > 0)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, n)
}

export interface Recommendation {
  strongest: Topic | null
  weakest: Topic | null
  minutes: number
  headline: string
  detail: string
}

/**
 * What the student should do next.
 *
 * This is the product's one opinion, so it is stated as one sentence about strength and
 * one about the gap — never a list of five equally-weighted suggestions.
 */
export function recommend(pack: Pack): Recommendation {
  const scored = pack.topics
    .map((topic) => ({ topic, mastery: topicMastery(pack, topic), touched: conceptsOf(pack, topic).some((c) => c.attempts > 0) }))
    .filter((s) => s.topic.conceptIds.length)

  const started = scored.filter((s) => s.touched)
  const untouched = scored.filter((s) => !s.touched)

  if (!started.length) {
    const first = scored[0]?.topic ?? null
    return {
      strongest: null,
      weakest: first,
      minutes: first?.estMinutes ?? 10,
      headline: 'Start at the beginning of the path.',
      detail: first
        ? `Nothing here has been tested yet. ${first.title} has no prerequisites, so it is the right place to start.`
        : 'Upload material to build a learning path.',
    }
  }

  const strongest = [...started].sort((a, b) => b.mastery - a.mastery)[0]
  const weakest = [...started].sort((a, b) => a.mastery - b.mastery)[0]
  const gap = untouched[0]

  return {
    strongest: strongest.topic,
    weakest: weakest.topic,
    minutes: Math.max(5, Math.round(weakest.topic.estMinutes * 0.6)),
    headline: `You're strong on ${strongest.topic.title.toLowerCase()}.`,
    detail: gap
      ? `${weakest.topic.title} is your weakest tested area at ${Math.round(weakest.mastery * 100)}%, and ${gap.topic.title.toLowerCase()} has not been touched yet.`
      : `${weakest.topic.title} is where the gap is, at ${Math.round(weakest.mastery * 100)}%.`,
  }
}
