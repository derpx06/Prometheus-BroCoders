/**
 * The study assistant.
 *
 * It is a retriever, not a generator: every sentence it shows comes from the student's
 * own material, selected by term overlap against the concept index the engine built.
 * That is a deliberate product decision — a tutor that invents a plausible-sounding
 * explanation is worse than useless when the student is revising for an exam.
 */
import type { Concept, Pack } from './types'
import { titleCase } from './format'

const STOP = new Set(
  'a an and are as at be but by can could do does explain for from give have how i in is it its like me my of on or should simply so tell that the their them then there these this to us was what when where which who why will with you your about into more most some such than'.split(
    ' ',
  ),
)

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t))
}

export function rankConcepts(pack: Pack, query: string): Concept[] {
  const q = tokens(query)
  if (!q.length) return []
  return pack.concepts
    .map((c) => {
      const hay = `${c.name} ${c.evidence.join(' ')}`.toLowerCase()
      const nameTokens = tokens(c.name)
      let score = 0
      for (const t of q) {
        if (nameTokens.includes(t)) score += 3
        else if (hay.includes(t)) score += 1
      }
      return { c, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c)
}

export interface TutorReply {
  /** Paragraphs to render, in order. */
  paragraphs: string[]
  /** Source sentences quoted verbatim from the material. */
  citations: { concept: string; sentence: string }[]
  /** Follow-up chips offered under the answer. */
  suggestions: string[]
  /** Set when the reply should offer a jump into the quiz. */
  quizPrompt?: { stem: string }
}

type Intent = 'simplify' | 'example' | 'memorise' | 'quiz' | 'compare' | 'explain'

function intentOf(q: string): Intent {
  const s = q.toLowerCase()
  if (/\bquiz|test me|ask me\b/.test(s)) return 'quiz'
  if (/\bmemoris|memoriz|remember|revise|learn by heart\b/.test(s)) return 'memorise'
  if (/\bexample|instance|real.?world\b/.test(s)) return 'example'
  if (/\bsimpl|like i'?m|eli5|plain english|in short\b/.test(s)) return 'simplify'
  if (/\bdifference|versus| vs |compare\b/.test(s)) return 'compare'
  return 'explain'
}

function prereqsOf(pack: Pack, id: number): string[] {
  return pack.edges
    .filter((e) => e.target === id)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((e) => pack.concepts.find((c) => c.id === e.source)?.name)
    .filter((n): n is string => Boolean(n))
}

export function answer(pack: Pack, query: string): TutorReply {
  const intent = intentOf(query)
  const ranked = rankConcepts(pack, query)

  if (intent === 'quiz') {
    const target = ranked[0] ?? [...pack.concepts].sort((a, b) => a.mastery - b.mastery)[0]
    const q =
      pack.quiz.find((x) => x.concept === target?.name) ??
      pack.quiz[Math.floor(Math.random() * pack.quiz.length)]
    return {
      paragraphs: [
        target
          ? `Let's test ${target.name} — it's one of the areas with the least evidence of mastery so far.`
          : 'Here is a question from your material.',
        q?.stem ?? 'Open the quiz and I will pick questions at the edge of what you already know.',
      ],
      citations: [],
      suggestions: ['Explain it simply', 'What should I memorise?'],
      quizPrompt: q ? { stem: q.stem } : undefined,
    }
  }

  if (intent === 'memorise') {
    const weak = [...pack.concepts].sort((a, b) => a.mastery - b.mastery).slice(0, 3)
    return {
      paragraphs: [
        'Based on how you have answered so far, these three are worth committing to memory first — everything else in this pack leans on them.',
      ],
      citations: weak
        .filter((c) => c.evidence.length)
        .map((c) => ({ concept: c.name, sentence: c.evidence[0] })),
      suggestions: ['Quiz me on these', 'Explain the first one simply'],
    }
  }

  if (!ranked.length) {
    const headline = pack.concepts.slice(0, 4).map((c) => titleCase(c.name))
    return {
      paragraphs: [
        `I could not find that in ${pack.sourceLabel}. I only answer from the material you uploaded, so if it is not in the document I will say so rather than guess.`,
        `This pack covers ${headline.join(', ')} and ${pack.concepts.length - headline.length} more.`,
      ],
      citations: [],
      suggestions: [`Explain ${headline[0]?.toLowerCase()}`, 'What should I memorise?'],
    }
  }

  const primary = ranked[0]
  const prereqs = prereqsOf(pack, primary.id)
  const paragraphs: string[] = []

  if (intent === 'simplify') {
    paragraphs.push(
      `Here is ${primary.name} at its simplest, straight from your material — the first sentence is the definition, the rest is detail you can add once it sticks.`,
    )
  } else if (intent === 'example') {
    paragraphs.push(
      `Your material illustrates ${primary.name} in these lines. The concrete detail in them is what an examiner is looking for.`,
    )
  } else if (intent === 'compare') {
    paragraphs.push(
      ranked.length > 1
        ? `${titleCase(primary.name)} and ${ranked[1].name} come up together in your material. Here is what each one says.`
        : `Your material discusses ${primary.name} here.`,
    )
  } else {
    paragraphs.push(`${titleCase(primary.name)} — here is what your material says.`)
  }

  if (prereqs.length) {
    paragraphs.push(
      `Worth knowing: this builds on ${prereqs.join(' and ')}. If it is not landing, that is usually where the gap is.`,
    )
  }

  const citations = [primary, ...(intent === 'compare' ? ranked.slice(1, 2) : [])]
    .flatMap((c) =>
      c.evidence.slice(0, intent === 'example' ? 2 : 2).map((sentence) => ({
        concept: c.name,
        sentence,
      })),
    )
    .slice(0, 3)

  return {
    paragraphs,
    citations,
    suggestions:
      intent === 'simplify'
        ? ['Give me an example', 'Quiz me on this']
        : ['Explain this simply', 'What should I memorise?', 'Quiz me on this'],
  }
}

export const STARTER_PROMPTS = [
  'Explain this simply',
  'Give me an example',
  'What should I memorise?',
  'Quiz me on this',
]
