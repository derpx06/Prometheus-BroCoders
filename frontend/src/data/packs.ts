import type { ActivityEntry, Pack } from '../lib/types'
import { biologyPack } from './biology'

const HOUR = 3600_000
const DAY = 24 * HOUR

const physicsPack: Pack = {
  id: 'pack-waves',
  title: 'Waves & Optics',
  subject: 'physics',
  folder: 'Physics',
  sourceLabel: 'PHY201 — Lecture 7 recording',
  sourceKind: 'recording',
  createdAt: Date.now() - 6 * DAY,
  lastStudied: Date.now() - 1 * DAY,
  progress: 0.41,
  minutes: 28,
  summary:
    'Wave behaviour from first principles: the wave equation, superposition and interference, standing waves, and how refraction follows from a change in wave speed.',
  concepts: [
    {
      id: 0,
      name: 'wave equation',
      mastery: 0.72,
      attempts: 4,
      evidence: [
        'The speed of a wave is the product of its frequency and its wavelength, v = fλ.',
        'Frequency is set by the source; wavelength adjusts when the wave enters a new medium.',
      ],
    },
    {
      id: 1,
      name: 'superposition',
      mastery: 0.55,
      attempts: 3,
      evidence: [
        'When two waves overlap, the resulting displacement at any point is the algebraic sum of the individual displacements.',
      ],
    },
    {
      id: 2,
      name: 'interference',
      mastery: 0.38,
      attempts: 3,
      evidence: [
        'Constructive interference occurs where the path difference is a whole number of wavelengths; destructive interference occurs at odd half-wavelengths.',
      ],
    },
    {
      id: 3,
      name: 'standing wave',
      mastery: 0.3,
      attempts: 2,
      evidence: [
        'A standing wave forms when two waves of equal frequency travel in opposite directions, producing fixed nodes and antinodes.',
      ],
    },
    {
      id: 4,
      name: 'refraction',
      mastery: 0.44,
      attempts: 3,
      evidence: [
        'Refraction is the change in direction of a wave as it crosses a boundary where its speed changes.',
        "Snell's law relates the angles of incidence and refraction to the refractive indices of the two media.",
      ],
    },
    {
      id: 5,
      name: 'total internal reflection',
      mastery: 0.22,
      attempts: 1,
      evidence: [
        'Above the critical angle, a wave travelling into a less dense medium is entirely reflected rather than refracted.',
      ],
    },
  ],
  edges: [
    { source: 0, target: 1, weight: 0.52 },
    { source: 1, target: 2, weight: 0.81 },
    { source: 2, target: 3, weight: 0.68 },
    { source: 0, target: 4, weight: 0.57 },
    { source: 4, target: 5, weight: 0.74 },
  ],
  topics: [
    { id: 'w1', title: 'Describing a wave', summary: 'Wavelength, frequency and speed, and why they are not independent.', conceptIds: [0], estMinutes: 6 },
    { id: 'w2', title: 'Superposition', summary: 'What happens where two waves overlap.', conceptIds: [1, 2], estMinutes: 10 },
    { id: 'w3', title: 'Standing waves', summary: 'Nodes, antinodes, and the special case of two opposed waves.', conceptIds: [3], estMinutes: 8 },
    { id: 'w4', title: 'Refraction', summary: 'Why a change in speed bends a wave, and where it stops bending entirely.', conceptIds: [4, 5], estMinutes: 11 },
  ],
  notes: [
    {
      id: 'basics',
      title: 'Describing a wave',
      blocks: [
        {
          type: 'paragraph',
          text: 'A wave transfers energy without transferring matter. Three quantities describe it completely: wavelength, frequency, and speed — and they are not independent.',
        },
        { type: 'equation', latex: 'v = f λ', caption: 'speed = frequency × wavelength' },
        {
          type: 'callout',
          tone: 'key',
          title: 'What changes at a boundary',
          text: 'Frequency is fixed by the source and never changes. When a wave enters a new medium the speed changes, so the wavelength must change with it.',
        },
      ],
    },
    {
      id: 'superposition',
      title: 'Superposition and interference',
      blocks: [
        {
          type: 'paragraph',
          text: 'Where two waves overlap, the displacement at any point is the algebraic sum of the individual displacements. Everything about interference follows from that single sentence.',
        },
        {
          type: 'bullets',
          items: [
            'Path difference = nλ → in phase → constructive interference.',
            'Path difference = (n + ½)λ → antiphase → destructive interference.',
            'Two sources must be coherent — same frequency, constant phase relationship — for a stable pattern.',
          ],
        },
        {
          type: 'paragraph',
          text: 'A standing wave is the special case of two identical waves travelling in opposite directions. Nodes sit where they always cancel; antinodes where they always reinforce.',
        },
      ],
    },
    {
      id: 'refraction',
      title: 'Refraction and total internal reflection',
      blocks: [
        {
          type: 'paragraph',
          text: 'A wave changes direction at a boundary because its speed changes. The bending is not the cause — it is the consequence.',
        },
        { type: 'equation', latex: 'n₁ sin θ₁ = n₂ sin θ₂', caption: "Snell's law" },
        {
          type: 'callout',
          tone: 'note',
          title: 'Critical angle',
          text: 'Going from dense to less dense, refraction angles grow faster than incidence angles. Past the critical angle there is no valid refracted ray, and all the light reflects internally — the principle behind optical fibre.',
        },
      ],
    },
  ],
  flashcards: [
    { id: 'p1', front: 'State the wave equation.', back: 'v = fλ — speed equals frequency times wavelength.', concept: 'wave equation' },
    { id: 'p2', front: 'Which wave property never changes at a boundary?', back: 'Frequency. It is fixed by the source; speed and wavelength both change.', concept: 'wave equation' },
    { id: 'p3', front: 'State the principle of superposition.', back: 'Where waves overlap, the resultant displacement is the algebraic sum of the individual displacements.', concept: 'superposition' },
    { id: 'p4', front: 'Condition for constructive interference?', back: 'A path difference of a whole number of wavelengths, nλ.', concept: 'interference' },
    { id: 'p5', front: 'Condition for destructive interference?', back: 'A path difference of an odd number of half wavelengths, (n + ½)λ.', concept: 'interference' },
    { id: 'p6', front: 'What makes two sources coherent?', back: 'The same frequency and a constant phase relationship — required for a stable interference pattern.', concept: 'interference' },
    { id: 'p7', front: 'How does a standing wave form?', back: 'Two waves of equal frequency and amplitude travelling in opposite directions superpose, giving fixed nodes and antinodes.', concept: 'standing wave' },
    { id: 'p8', front: 'Node vs antinode?', back: 'A node is a point of permanent zero displacement; an antinode oscillates with maximum amplitude.', concept: 'standing wave' },
    { id: 'p9', front: "State Snell's law.", back: 'n₁ sin θ₁ = n₂ sin θ₂ — relating incidence and refraction angles to the refractive indices.', concept: 'refraction' },
    { id: 'p10', front: 'When does total internal reflection occur?', back: 'When light travels into a less dense medium at an angle beyond the critical angle; no refracted ray exists, so all of it reflects.', concept: 'total internal reflection' },
  ],
  quiz: [
    {
      id: 0, kind: 'mcq', concept: 'wave equation', difficulty: 0.3,
      stem: 'A wave passes from air into glass. Which quantity stays the same?',
      options: ['Frequency', 'Wavelength', 'Speed', 'Direction'],
      answer: 'Frequency',
      explanation: 'Frequency is set by the source. In glass the wave slows, so wavelength shrinks to keep v = fλ consistent.',
    },
    {
      id: 1, kind: 'mcq', concept: 'interference', difficulty: 0.55,
      stem: 'Two coherent sources produce waves that arrive with a path difference of 1.5λ. The result is:',
      options: ['Destructive interference', 'Constructive interference', 'A standing wave', 'Total internal reflection'],
      answer: 'Destructive interference',
      explanation: '1.5λ is an odd number of half wavelengths, so the waves arrive in antiphase and cancel.',
    },
    {
      id: 2, kind: 'mcq', concept: 'standing wave', difficulty: 0.62,
      stem: 'What is a node on a standing wave?',
      options: [
        'A point of permanent zero displacement',
        'A point of maximum amplitude',
        'The point where the wave reflects',
        'The midpoint of one wavelength',
      ],
      answer: 'A point of permanent zero displacement',
      explanation: 'At a node the two travelling waves always cancel. Antinodes are the maximum-amplitude points between them.',
    },
    {
      id: 3, kind: 'mcq', concept: 'refraction', difficulty: 0.44,
      stem: 'Refraction happens because, at a boundary, a wave changes its:',
      options: ['Speed', 'Frequency', 'Amplitude', 'Phase'],
      answer: 'Speed',
      explanation: 'The change in speed is the cause; the change in direction is the visible consequence.',
    },
    {
      id: 4, kind: 'mcq', concept: 'total internal reflection', difficulty: 0.7,
      stem: 'Total internal reflection requires light to travel:',
      options: [
        'Into a less dense medium, beyond the critical angle',
        'Into a denser medium, beyond the critical angle',
        'Along the normal',
        'Through a vacuum',
      ],
      answer: 'Into a less dense medium, beyond the critical angle',
      explanation: 'Only when moving to a lower refractive index can the refraction angle reach 90°, which defines the critical angle.',
    },
    {
      id: 5, kind: 'free', concept: 'superposition', difficulty: 0.6,
      stem: 'In your own words: explain the principle of superposition.',
      options: [],
      answer:
        'When two or more waves overlap at a point, the resultant displacement at that point is the algebraic sum of the displacements each wave would produce on its own.',
      explanation: 'Key ideas: overlapping waves, algebraic sum of displacements, applies point by point.',
    },
  ],
}

const mathPack: Pack = {
  id: 'pack-linear-algebra',
  title: 'Vector Spaces & Linear Independence',
  subject: 'math',
  folder: 'Mathematics',
  sourceLabel: 'Linear Algebra — Chapter 4 notes',
  sourceKind: 'notes',
  createdAt: Date.now() - 9 * DAY,
  lastStudied: Date.now() - 4 * DAY,
  progress: 0.55,
  minutes: 36,
  summary:
    'What a vector space is, when a set of vectors is independent, and why a basis is exactly the right amount of information to describe every vector in the space.',
  concepts: [
    { id: 0, name: 'vector space', mastery: 0.68, attempts: 4, evidence: ['A vector space is a set closed under addition and scalar multiplication, satisfying eight axioms.'] },
    { id: 1, name: 'linear combination', mastery: 0.74, attempts: 3, evidence: ['A linear combination of vectors is a sum of those vectors each scaled by a coefficient.'] },
    { id: 2, name: 'span', mastery: 0.61, attempts: 3, evidence: ['The span of a set of vectors is the set of all their linear combinations.'] },
    { id: 3, name: 'linear independence', mastery: 0.47, attempts: 4, evidence: ['A set of vectors is linearly independent when the only linear combination equal to zero is the one with all coefficients zero.'] },
    { id: 4, name: 'basis', mastery: 0.4, attempts: 3, evidence: ['A basis is a linearly independent set that spans the space.'] },
    { id: 5, name: 'dimension', mastery: 0.35, attempts: 2, evidence: ['The dimension of a vector space is the number of vectors in any of its bases.'] },
  ],
  edges: [
    { source: 0, target: 1, weight: 0.6 },
    { source: 1, target: 2, weight: 0.83 },
    { source: 1, target: 3, weight: 0.71 },
    { source: 2, target: 4, weight: 0.66 },
    { source: 3, target: 4, weight: 0.78 },
    { source: 4, target: 5, weight: 0.85 },
  ],
  topics: [
    { id: 'm1', title: 'Combinations and span', summary: 'What a set of vectors can reach.', conceptIds: [0, 1, 2], estMinutes: 9 },
    { id: 'm2', title: 'Linear independence', summary: 'When a vector in the set is redundant.', conceptIds: [3], estMinutes: 10 },
    { id: 'm3', title: 'Basis and dimension', summary: 'The smallest set that still reaches everything.', conceptIds: [4, 5], estMinutes: 12 },
  ],
  notes: [
    {
      id: 'span',
      title: 'Linear combinations and span',
      blocks: [
        { type: 'paragraph', text: 'A linear combination is a sum of vectors, each first scaled by a coefficient. The span of a set is simply every linear combination you can build from it — the whole region of space those vectors can reach.' },
        { type: 'equation', latex: 'span{v₁,…,v_k} = { c₁v₁ + ⋯ + c_kv_k : cᵢ ∈ ℝ }' },
        { type: 'callout', tone: 'note', title: 'Geometric reading', text: 'In ℝ³: one nonzero vector spans a line, two independent vectors span a plane, three span the whole space.' },
      ],
    },
    {
      id: 'independence',
      title: 'Linear independence',
      blocks: [
        { type: 'paragraph', text: 'A set is linearly independent when the only way to combine its vectors into the zero vector is to scale every one of them by zero. Equivalently: no vector in the set is redundant, because none can be written using the others.' },
        { type: 'equation', latex: 'c₁v₁ + ⋯ + c_kv_k = 0 ⟹ c₁ = ⋯ = c_k = 0' },
        { type: 'callout', tone: 'warn', title: 'Fast checks', text: 'Any set containing the zero vector is dependent. Any set of more than n vectors in ℝⁿ is dependent. Both save you a row reduction.' },
      ],
    },
    {
      id: 'basis',
      title: 'Basis and dimension',
      blocks: [
        { type: 'paragraph', text: 'A basis is a set that is both independent and spanning — the smallest set that still reaches everything. That double condition is what makes coordinates unique: every vector has exactly one representation in a given basis.' },
        {
          type: 'table',
          head: ['Property', 'Spanning set', 'Independent set', 'Basis'],
          rows: [
            ['Reaches every vector', 'Yes', 'Not necessarily', 'Yes'],
            ['No redundancy', 'Not necessarily', 'Yes', 'Yes'],
            ['Representation', 'May be many', '—', 'Exactly one'],
          ],
        },
        { type: 'paragraph', text: 'Every basis of a given space has the same number of vectors. That number is the dimension.' },
      ],
    },
  ],
  flashcards: [
    { id: 'm1', front: 'Define a linear combination.', back: 'A sum of vectors, each multiplied by a scalar coefficient: c₁v₁ + ⋯ + c_kv_k.', concept: 'linear combination' },
    { id: 'm2', front: 'What is the span of a set of vectors?', back: 'The set of all linear combinations of those vectors — everything they can reach.', concept: 'span' },
    { id: 'm3', front: 'Define linear independence.', back: 'The only linear combination equal to the zero vector is the one where every coefficient is zero.', concept: 'linear independence' },
    { id: 'm4', front: 'Quick test: is a set containing 0 independent?', back: 'Never. Scale the zero vector by any nonzero coefficient and the rest by zero — a nontrivial combination giving 0.', concept: 'linear independence' },
    { id: 'm5', front: 'Can 4 vectors be independent in ℝ³?', back: 'No. More than n vectors in ℝⁿ are always dependent.', concept: 'linear independence' },
    { id: 'm6', front: 'Define a basis.', back: 'A linearly independent set that spans the space — the minimum set that still reaches everything.', concept: 'basis' },
    { id: 'm7', front: 'Why is a basis useful?', back: 'It makes coordinates unique: every vector has exactly one representation as a combination of basis vectors.', concept: 'basis' },
    { id: 'm8', front: 'Define dimension.', back: 'The number of vectors in any basis of the space. Every basis has the same size.', concept: 'dimension' },
  ],
  quiz: [
    {
      id: 0, kind: 'mcq', concept: 'span', difficulty: 0.36,
      stem: 'The span of two linearly independent vectors in ℝ³ is:',
      options: ['A plane through the origin', 'A line through the origin', 'All of ℝ³', 'A single point'],
      answer: 'A plane through the origin',
      explanation: 'Two independent directions sweep out a two-dimensional subspace — a plane containing the origin.',
    },
    {
      id: 1, kind: 'mcq', concept: 'linear independence', difficulty: 0.58,
      stem: 'A set of vectors is linearly independent when:',
      options: [
        'Only the trivial combination gives the zero vector',
        'They are all mutually perpendicular',
        'They all have unit length',
        'Their span is the whole space',
      ],
      answer: 'Only the trivial combination gives the zero vector',
      explanation: 'Orthogonality implies independence but is not required by it, and spanning is a separate condition entirely.',
    },
    {
      id: 2, kind: 'mcq', concept: 'linear independence', difficulty: 0.48,
      stem: 'Any set of five vectors in ℝ⁴ must be:',
      options: ['Linearly dependent', 'A basis', 'Orthogonal', 'Linearly independent'],
      answer: 'Linearly dependent',
      explanation: 'You cannot have more than n independent vectors in ℝⁿ — the fifth is necessarily a combination of the others.',
    },
    {
      id: 3, kind: 'mcq', concept: 'basis', difficulty: 0.65,
      stem: 'A basis of a vector space must be:',
      options: [
        'Independent and spanning',
        'Spanning but not independent',
        'Orthonormal',
        'Finite and orthogonal',
      ],
      answer: 'Independent and spanning',
      explanation: 'Both conditions together are what force every vector to have exactly one coordinate representation.',
    },
    {
      id: 4, kind: 'free', concept: 'dimension', difficulty: 0.7,
      stem: 'In your own words: what does the dimension of a vector space tell you?',
      options: [],
      answer:
        'The dimension is the number of vectors in any basis of the space — the number of independent directions you need to reach every vector, and the number of coordinates each vector requires.',
      explanation: 'Key ideas: size of a basis, independent directions needed, coordinates per vector.',
    },
  ],
}

const csPack: Pack = {
  id: 'pack-data-structures',
  title: 'Hash Tables & Complexity',
  subject: 'cs',
  folder: 'Computer Science',
  sourceLabel: 'CS210 — Data Structures wk4.pdf',
  sourceKind: 'pdf',
  createdAt: Date.now() - 12 * DAY,
  lastStudied: Date.now() - 7 * DAY,
  progress: 0.83,
  minutes: 51,
  summary:
    'Asymptotic notation as a tool for comparing algorithms, then hash tables: hashing, collision resolution, load factor, and why average-case O(1) is not a guarantee.',
  concepts: [
    { id: 0, name: 'asymptotic complexity', mastery: 0.88, attempts: 6, evidence: ['Big-O notation describes an upper bound on how an algorithm’s cost grows as the input size grows.'] },
    { id: 1, name: 'amortised analysis', mastery: 0.71, attempts: 3, evidence: ['Amortised analysis averages the cost of an operation over a sequence, so an occasional expensive resize is spread across many cheap insertions.'] },
    { id: 2, name: 'hash function', mastery: 0.86, attempts: 4, evidence: ['A hash function maps a key to an index in the underlying array, ideally distributing keys uniformly.'] },
    { id: 3, name: 'collision resolution', mastery: 0.79, attempts: 5, evidence: ['Separate chaining stores colliding entries in a list at the bucket; open addressing probes for the next free slot.'] },
    { id: 4, name: 'load factor', mastery: 0.82, attempts: 3, evidence: ['The load factor is the ratio of stored entries to buckets; performance degrades as it approaches one.'] },
  ],
  edges: [
    { source: 0, target: 1, weight: 0.64 },
    { source: 2, target: 3, weight: 0.79 },
    { source: 3, target: 4, weight: 0.7 },
    { source: 0, target: 4, weight: 0.42 },
  ],
  topics: [
    { id: 'c1', title: 'Asymptotic complexity', summary: 'Comparing algorithms by how they scale.', conceptIds: [0, 1], estMinutes: 9 },
    { id: 'c2', title: 'Hashing', summary: 'Turning a key into an index, and what to do about collisions.', conceptIds: [2, 3], estMinutes: 11 },
    { id: 'c3', title: 'Load factor and resizing', summary: 'Why O(1) is average-case, not a guarantee.', conceptIds: [4], estMinutes: 7 },
  ],
  notes: [
    {
      id: 'complexity',
      title: 'Asymptotic complexity',
      blocks: [
        { type: 'paragraph', text: 'Big-O describes how cost grows with input size, ignoring constants and lower-order terms. It answers "how does this scale", not "how fast is this on my laptop".' },
        {
          type: 'table',
          head: ['Structure', 'Lookup', 'Insert', 'Ordered iteration'],
          rows: [
            ['Array (unsorted)', 'O(n)', 'O(1)', 'O(n log n)'],
            ['Sorted array', 'O(log n)', 'O(n)', 'O(n)'],
            ['Balanced BST', 'O(log n)', 'O(log n)', 'O(n)'],
            ['Hash table', 'O(1) avg, O(n) worst', 'O(1) amortised', 'Not supported'],
          ],
        },
      ],
    },
    {
      id: 'hashing',
      title: 'Hash tables',
      blocks: [
        { type: 'paragraph', text: 'A hash table trades ordering for speed. A hash function turns a key into an array index, so lookup becomes one arithmetic operation plus one array access — provided the keys spread out evenly.' },
        {
          type: 'bullets',
          items: [
            'Separate chaining — each bucket holds a list of colliding entries. Simple, degrades gracefully.',
            'Open addressing — on collision, probe forward for a free slot. Cache-friendly, but suffers clustering.',
            'Load factor α = entries / buckets. Most implementations resize once α passes ~0.75.',
          ],
        },
        { type: 'callout', tone: 'key', title: 'Why O(1) is only average-case', text: 'With adversarial or badly distributed keys every entry can land in one bucket, and lookup degenerates to O(n). Randomised hashing is what makes the average case trustworthy.' },
        { type: 'callout', tone: 'note', title: 'Where amortisation comes in', text: 'Resizing is O(n), but it happens rarely enough that the cost spread over all insertions is O(1) each — that is amortised, not average.' },
      ],
    },
  ],
  flashcards: [
    { id: 'c1', front: 'What does Big-O describe?', back: 'An upper bound on how an algorithm’s cost grows with input size, ignoring constants and lower-order terms.', concept: 'asymptotic complexity' },
    { id: 'c2', front: 'Average vs amortised — what is the difference?', back: 'Average is over a distribution of inputs; amortised is over a sequence of operations, guaranteeing the total even in the worst sequence.', concept: 'amortised analysis' },
    { id: 'c3', front: 'What makes a good hash function?', back: 'It distributes keys uniformly across buckets and is fast to compute.', concept: 'hash function' },
    { id: 'c4', front: 'Separate chaining vs open addressing?', back: 'Chaining stores collisions in a per-bucket list; open addressing probes for the next free slot in the array itself.', concept: 'collision resolution' },
    { id: 'c5', front: 'Define load factor.', back: 'α = number of entries / number of buckets. Performance degrades as α approaches 1.', concept: 'load factor' },
    { id: 'c6', front: 'Why is hash table lookup O(n) in the worst case?', back: 'If every key hashes to the same bucket, lookup walks the whole collection — the average-case O(1) assumes good distribution.', concept: 'collision resolution' },
    { id: 'c7', front: 'What operation do hash tables not support well?', back: 'Ordered iteration and range queries — hashing deliberately destroys key order.', concept: 'hash function' },
    { id: 'c8', front: 'Why is insertion O(1) amortised rather than O(1)?', back: 'An occasional resize costs O(n), but it is rare enough that the cost spread across all insertions is constant.', concept: 'amortised analysis' },
  ],
  quiz: [
    {
      id: 0, kind: 'mcq', concept: 'asymptotic complexity', difficulty: 0.28,
      stem: 'What is the average-case lookup complexity of a well-distributed hash table?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      answer: 'O(1)',
      explanation: 'One hash computation plus one array access — independent of how many entries the table holds.',
    },
    {
      id: 1, kind: 'mcq', concept: 'collision resolution', difficulty: 0.52,
      stem: 'Two keys hash to the same bucket. Under separate chaining, what happens?',
      options: [
        'Both are stored in a list at that bucket',
        'The second key is rejected',
        'The table is immediately resized',
        'The second key probes for the next free slot',
      ],
      answer: 'Both are stored in a list at that bucket',
      explanation: 'Probing for the next free slot is open addressing — the other strategy.',
    },
    {
      id: 2, kind: 'mcq', concept: 'load factor', difficulty: 0.47,
      stem: 'A hash table with 8 buckets holds 6 entries. Its load factor is:',
      options: ['0.75', '1.33', '6', '0.25'],
      answer: '0.75',
      explanation: 'α = entries / buckets = 6/8 = 0.75 — right at the point most implementations resize.',
    },
    {
      id: 3, kind: 'mcq', concept: 'asymptotic complexity', difficulty: 0.66,
      stem: 'Which operation is a hash table the wrong choice for?',
      options: [
        'Finding all keys between two values',
        'Testing membership',
        'Counting occurrences',
        'Deduplicating a list',
      ],
      answer: 'Finding all keys between two values',
      explanation: 'Hashing destroys ordering, so range queries need a tree or a sorted structure instead.',
    },
    {
      id: 4, kind: 'free', concept: 'amortised analysis', difficulty: 0.72,
      stem: 'In your own words: why is hash table insertion described as O(1) amortised rather than simply O(1)?',
      options: [],
      answer:
        'Most insertions are constant time, but when the load factor gets too high the table must be resized, which costs O(n) to rehash everything. Because resizes double the capacity they happen rarely, so the total cost across a sequence of n insertions is O(n), or O(1) each on average.',
      explanation: 'Key ideas: occasional O(n) resize, doubling makes it rare, total cost spread across the sequence.',
    },
  ],
}

const historyPack: Pack = {
  id: 'pack-industrial-revolution',
  title: 'The Industrial Revolution',
  subject: 'history',
  folder: 'History',
  sourceLabel: 'youtube.com/watch?v=…',
  sourceKind: 'youtube',
  createdAt: Date.now() - 16 * DAY,
  lastStudied: null,
  progress: 0,
  minutes: 0,
  summary:
    'Why industrialisation began in Britain, the technologies that compounded on each other, and the social consequences that followed the factory system.',
  concepts: [
    { id: 0, name: 'agricultural revolution', mastery: 0.2, attempts: 0, evidence: ['Improved crop rotation and enclosure raised yields, freeing labour from the land for the factories.'] },
    { id: 1, name: 'steam engine', mastery: 0.2, attempts: 0, evidence: ['Watt’s separate condenser made the steam engine efficient enough to power factories located away from rivers.'] },
    { id: 2, name: 'factory system', mastery: 0.2, attempts: 0, evidence: ['The factory system concentrated production and labour under one roof and one schedule.'] },
    { id: 3, name: 'urbanisation', mastery: 0.2, attempts: 0, evidence: ['Rapid migration to industrial cities outpaced sanitation and housing, producing overcrowding and disease.'] },
    { id: 4, name: 'labour reform', mastery: 0.2, attempts: 0, evidence: ['The Factory Acts progressively limited working hours and child labour in response to public pressure.'] },
  ],
  edges: [
    { source: 0, target: 2, weight: 0.61 },
    { source: 1, target: 2, weight: 0.77 },
    { source: 2, target: 3, weight: 0.72 },
    { source: 3, target: 4, weight: 0.58 },
  ],
  topics: [
    { id: 'h1', title: 'Preconditions', summary: 'Why industrialisation began in Britain and not elsewhere.', conceptIds: [0, 1], estMinutes: 9 },
    { id: 'h2', title: 'The factory system', summary: 'Production and labour reorganised around machinery.', conceptIds: [2], estMinutes: 7 },
    { id: 'h3', title: 'Consequences and reform', summary: 'Urbanisation, and the legislation that answered it.', conceptIds: [3, 4], estMinutes: 10 },
  ],
  notes: [
    {
      id: 'causes',
      title: 'Why Britain, why then',
      blocks: [
        { type: 'paragraph', text: 'Industrialisation was not one invention but several conditions arriving together. No single one of them is a sufficient answer in an essay.' },
        {
          type: 'bullets',
          items: [
            'Agricultural improvement raised yields and released labour from the land.',
            'Accessible coal and iron sat close to each other and to navigable water.',
            'Capital and credit institutions were already developed by overseas trade.',
            'Patent law gave inventors a reason to invest in refinement, not just invention.',
          ],
        },
        { type: 'callout', tone: 'key', title: 'The compounding effect', text: 'Steam power made deeper mines viable, deeper mines produced more coal, cheaper coal made steam power more attractive. The technologies fed each other rather than arriving in sequence.' },
      ],
    },
    {
      id: 'consequences',
      title: 'Social consequences',
      blocks: [
        { type: 'paragraph', text: 'The factory system concentrated labour under one roof and one clock. Migration to the industrial cities outpaced housing and sanitation, and the resulting mortality became the political argument for reform.' },
        {
          type: 'table',
          head: ['Act', 'Year', 'Provision'],
          rows: [
            ['Factory Act', '1833', 'Under-9s barred from textile mills; inspectors appointed'],
            ['Mines Act', '1842', 'Women and boys under 10 barred from underground work'],
            ['Ten Hours Act', '1847', 'Working day capped for women and young persons'],
          ],
        },
      ],
    },
  ],
  flashcards: [
    { id: 'h1', front: 'Name three preconditions for industrialisation in Britain.', back: 'Agricultural surplus freeing labour, accessible coal and iron near water transport, and developed capital markets from overseas trade.', concept: 'agricultural revolution' },
    { id: 'h2', front: 'What did Watt’s separate condenser change?', back: 'It made steam engines efficient enough to run factories anywhere, not just beside fast-flowing rivers.', concept: 'steam engine' },
    { id: 'h3', front: 'Define the factory system.', back: 'Production concentrated under one roof, with labour organised around machinery and a fixed schedule rather than the household.', concept: 'factory system' },
    { id: 'h4', front: 'Why did industrial cities become unhealthy so quickly?', back: 'Migration outpaced housing and sanitation, producing overcrowding, contaminated water and epidemic disease.', concept: 'urbanisation' },
    { id: 'h5', front: 'What did the 1833 Factory Act introduce?', back: 'A ban on under-9s in textile mills, and — decisively — paid inspectors to enforce it.', concept: 'labour reform' },
    { id: 'h6', front: 'Why is the 1833 Act considered a turning point?', back: 'Earlier acts had no enforcement. Appointing inspectors made regulation real rather than declaratory.', concept: 'labour reform' },
  ],
  quiz: [
    {
      id: 0, kind: 'mcq', concept: 'steam engine', difficulty: 0.4,
      stem: 'What was the significance of Watt’s separate condenser?',
      options: [
        'It made steam engines efficient enough to site factories away from rivers',
        'It was the first use of steam for any purpose',
        'It eliminated the need for coal',
        'It allowed factories to run without workers',
      ],
      answer: 'It made steam engines efficient enough to site factories away from rivers',
      explanation: 'Earlier engines wasted fuel reheating the cylinder. Efficiency, not novelty, is what freed factories from water power.',
    },
    {
      id: 1, kind: 'mcq', concept: 'labour reform', difficulty: 0.55,
      stem: 'Why is the Factory Act of 1833 treated as a turning point?',
      options: [
        'It appointed inspectors, making enforcement real',
        'It abolished child labour entirely',
        'It introduced the eight-hour day',
        'It legalised trade unions',
      ],
      answer: 'It appointed inspectors, making enforcement real',
      explanation: 'Previous acts had set limits with no mechanism to enforce them, so they were widely ignored.',
    },
    {
      id: 2, kind: 'mcq', concept: 'urbanisation', difficulty: 0.45,
      stem: 'The main cause of poor health in early industrial cities was:',
      options: [
        'Housing and sanitation lagging behind migration',
        'A colder climate',
        'A shortage of food nationally',
        'The absence of any medical profession',
      ],
      answer: 'Housing and sanitation lagging behind migration',
      explanation: 'Cities grew faster than the infrastructure serving them, which is what produced overcrowding and waterborne epidemics.',
    },
  ],
}

export const demoPacks: Pack[] = [biologyPack, physicsPack, mathPack, csPack, historyPack]

export const demoActivity: ActivityEntry[] = [
  { id: 'a1', kind: 'quiz', packId: 'pack-cell-biology', label: 'Cell Biology — Lecture 04', detail: 'Quiz — 8 of 10 correct', at: Date.now() - 2 * HOUR, score: 0.8 },
  { id: 'a2', kind: 'flashcards', packId: 'pack-cell-biology', label: 'Cell Biology — Lecture 04', detail: 'Reviewed 30 cards', at: Date.now() - 5 * HOUR },
  { id: 'a3', kind: 'notes', packId: 'pack-waves', label: 'Waves & Optics', detail: 'Read notes for 18 min', at: Date.now() - 1 * DAY },
  { id: 'a4', kind: 'quiz', packId: 'pack-waves', label: 'Waves & Optics', detail: 'Quiz — 4 of 6 correct', at: Date.now() - 1 * DAY - 2 * HOUR, score: 0.67 },
  { id: 'a5', kind: 'quiz', packId: 'pack-linear-algebra', label: 'Vector Spaces', detail: 'Quiz — 3 of 5 correct', at: Date.now() - 4 * DAY, score: 0.6 },
  { id: 'a6', kind: 'upload', packId: 'pack-industrial-revolution', label: 'The Industrial Revolution', detail: 'Study pack created from a YouTube lecture', at: Date.now() - 16 * DAY },
]

/** Minutes studied per day, most recent last. Drives the sparkline on Progress. */
export const studyMinutes: number[] = [25, 0, 40, 35, 15, 55, 30, 0, 45, 60, 20, 35, 50, 42]

/**
 * The bundled material behind the demo upload. Real prose, so the engine has something
 * genuine to extract concepts from when it is running.
 */
export const SAMPLE_MATERIAL = `Introduction to Cell Biology

The cell is the basic structural and functional unit of every living organism. All cells share a small set of features: a plasma membrane that separates the interior of the cell from the extracellular environment, cytoplasm in which the chemistry of life takes place, ribosomes that translate messenger RNA into protein, and genetic material carried as DNA.

The plasma membrane is a phospholipid bilayer. Each phospholipid molecule has a hydrophilic phosphate head and two hydrophobic fatty acid tails, and this arrangement drives the spontaneous formation of a bilayer in water. The fluid mosaic model describes the plasma membrane as a fluid sheet in which membrane proteins drift laterally rather than sitting in fixed positions. Cholesterol molecules wedged between the fatty acid tails buffer the fluidity of the membrane against changes in temperature.

Because the phospholipid bilayer is selectively permeable, small nonpolar molecules such as oxygen and carbon dioxide diffuse across it freely, while ions and large polar molecules require transport proteins. Passive transport moves a substance down its concentration gradient and requires no metabolic energy. Diffusion, facilitated diffusion and osmosis are all forms of passive transport. Osmosis is the passive diffusion of water across a selectively permeable membrane toward the region of higher solute concentration.

Active transport moves a substance against its concentration gradient and therefore consumes ATP. The sodium potassium pump is the classic example: it exports three sodium ions and imports two potassium ions for every molecule of ATP that it hydrolyses. The presence of a protein does not by itself make transport active, since facilitated diffusion also uses a protein; what makes transport active is movement against the gradient.

Eukaryotic cells compartmentalise their chemistry into membrane bound organelles, which allows chemically incompatible reactions to run at the same time in the same cell. The nucleus houses the genome of the cell and is bounded by a double membrane called the nuclear envelope. Nuclear pores regulate the traffic of RNA and proteins between the nucleoplasm and the cytoplasm.

Rough endoplasmic reticulum is studded with ribosomes and folds and modifies proteins that are destined for secretion. Smooth endoplasmic reticulum carries no ribosomes and instead synthesises lipids and detoxifies drugs. The Golgi apparatus receives proteins from the endoplasmic reticulum, modifies them, and sorts them to their destinations. Lysosomes contain hydrolytic enzymes that break down damaged organelles and material taken into the cell by endocytosis.

Mitochondria are the site of aerobic respiration, in which the energy stored in glucose is converted into ATP. The inner mitochondrial membrane is folded into structures called cristae, and this folding greatly increases the surface area available for the electron transport chain. Cellular respiration proceeds through glycolysis, the citric acid cycle and oxidative phosphorylation. Glycolysis takes place in the cytoplasm rather than in the mitochondrion, which is why organisms without mitochondria can still perform it. Oxidative phosphorylation produces the great majority of the ATP yielded by a molecule of glucose.

Prokaryotic cells have no nucleus and no membrane bound organelles, and their DNA sits in a region called the nucleoid. A prokaryotic cell is typically one to five micrometres across, while a eukaryotic cell is ten to a hundred micrometres across. Prokaryotic ribosomes are smaller than eukaryotic ribosomes. Mitochondria carry their own circular DNA and their own small ribosomes, and this is the central evidence for the endosymbiotic theory, which holds that mitochondria descend from free living bacteria engulfed by an ancestral host cell.`
