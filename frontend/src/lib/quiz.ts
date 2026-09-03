/** Local grading for bundled packs. Engine-backed packs are graded server-side. */

const STOP = new Set(
  'a an the of to in on at is are was were be been it its and or for with that this these those as by from into than then so such'.split(
    ' ',
  ),
)

function bag(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  )
}

/** Token overlap (F1) between a free-text response and the model answer. */
export function similarity(response: string, ideal: string): number {
  const a = bag(response)
  const b = bag(ideal)
  if (!a.size || !b.size) return 0
  let hit = 0
  for (const t of a) if (b.has(t)) hit++
  const precision = hit / a.size
  const recall = hit / b.size
  return precision + recall ? (2 * precision * recall) / (precision + recall) : 0
}

export const FREE_THRESHOLD = 0.34

/**
 * Deterministic option order, seeded by question id.
 *
 * The engine shuffles server-side for the same reason: without it the answer sits in
 * whatever position the generator emitted it — first, in our case — and the quiz stops
 * testing anything. Seeding by id keeps the order stable if a question is re-rendered.
 */
export function shuffleOptions(options: string[], seed: number): string[] {
  const out = [...options]
  // Math.imul keeps the multiply in 32-bit integer space; plain `*` overflows into
  // floats and loses the low bits, which visibly biases where the answer lands.
  let state = (Math.imul(seed, 2654435761) + 1) >>> 0
  const next = () => {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
