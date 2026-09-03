import type { Concept, Edge, Flashcard, NoteSection, Pack, QuizQuestion, Topic } from '../lib/types'

const HOUR = 3600_000
const DAY = 24 * HOUR

/**
 * The hero pack — the one the demo walks through end to end.
 *
 * Concepts carry the sentences they were drawn from, exactly as the engine returns them,
 * so notes, flashcards, quiz stems and tutor answers are all grounded in the same text.
 */
const c = (
  id: number,
  name: string,
  mastery: number,
  attempts: number,
  evidence: string[],
): Concept => ({ id, name, mastery, attempts, evidence })

const concepts: Concept[] = [
  // — Topic 1: cell basics
  c(0, 'cell theory', 0.94, 5, [
    'Cell theory states that all living organisms are made of cells, that the cell is the basic unit of life, and that all cells arise from pre-existing cells.',
  ]),
  c(1, 'prokaryotic cell', 0.88, 6, [
    'Prokaryotic cells have no nucleus and no membrane-bound organelles, and their DNA sits in a region called the nucleoid.',
    'A prokaryotic cell is typically one to five micrometres across, an order of magnitude smaller than a eukaryotic cell.',
  ]),
  c(2, 'eukaryotic cell', 0.85, 5, [
    'Eukaryotic cells compartmentalise their chemistry into membrane-bound organelles, which allows chemically incompatible reactions to run at the same time.',
    'A eukaryotic cell is ten to a hundred micrometres across and carries multiple linear chromosomes.',
  ]),
  c(3, 'cytoskeleton', 0.79, 3, [
    'The cytoskeleton is a network of protein filaments that gives the cell its shape, anchors organelles and drives intracellular transport.',
  ]),

  // — Topic 2: membrane and transport
  c(4, 'phospholipid bilayer', 0.83, 6, [
    'Each phospholipid has a hydrophilic phosphate head and two hydrophobic fatty acid tails, which drives the spontaneous formation of a bilayer in water.',
    'The fluid mosaic model describes the bilayer as a fluid sheet in which membrane proteins drift laterally rather than sitting in fixed positions.',
  ]),
  c(5, 'plasma membrane', 0.81, 7, [
    'The plasma membrane is a phospholipid bilayer that separates the interior of the cell from the extracellular environment.',
    'Because the bilayer is selectively permeable, small nonpolar molecules diffuse through it freely while ions and large polar molecules require transport proteins.',
  ]),
  c(6, 'membrane protein', 0.68, 3, [
    'Integral membrane proteins span the bilayer and act as channels, carriers or receptors; peripheral proteins sit on one face.',
  ]),
  c(7, 'passive transport', 0.62, 4, [
    'Passive transport moves substances down their concentration gradient and requires no metabolic energy.',
    'Diffusion, facilitated diffusion and osmosis are all forms of passive transport.',
  ]),
  c(8, 'osmosis', 0.58, 3, [
    'Osmosis is the passive diffusion of water across a selectively permeable membrane toward the region of higher solute concentration.',
  ]),
  c(9, 'facilitated diffusion', 0.44, 3, [
    'Facilitated diffusion uses a channel or carrier protein but still moves the substance down its gradient, so it consumes no ATP.',
  ]),
  c(10, 'active transport', 0.36, 5, [
    'Active transport moves substances against their concentration gradient and therefore consumes ATP.',
    'The sodium-potassium pump exports three sodium ions and imports two potassium ions per molecule of ATP hydrolysed.',
  ]),
  c(11, 'endocytosis', 0.41, 2, [
    'In endocytosis the membrane folds inward and pinches off a vesicle, bringing extracellular material into the cell.',
  ]),

  // — Topic 3: organelles
  c(12, 'nucleus', 0.91, 6, [
    'The nucleus houses the cell genome and is bounded by a double membrane called the nuclear envelope.',
    'Nuclear pores regulate the traffic of RNA and proteins between the nucleoplasm and the cytoplasm.',
  ]),
  c(13, 'ribosome', 0.86, 4, [
    'Ribosomes translate messenger RNA into protein, and are found free in the cytoplasm or bound to the rough endoplasmic reticulum.',
  ]),
  c(14, 'endoplasmic reticulum', 0.72, 4, [
    'Rough endoplasmic reticulum is studded with ribosomes and folds and modifies proteins destined for secretion.',
    'Smooth endoplasmic reticulum carries no ribosomes and instead synthesises lipids and detoxifies drugs.',
  ]),
  c(15, 'golgi apparatus', 0.64, 3, [
    'The Golgi apparatus receives proteins from the endoplasmic reticulum, modifies them, and sorts them to their destinations.',
  ]),
  c(16, 'lysosome', 0.7, 3, [
    'Lysosomes contain hydrolytic enzymes held at low pH that break down damaged organelles and material taken in by endocytosis.',
  ]),
  c(17, 'vesicle transport', 0.55, 2, [
    'Transport vesicles bud from one compartment and fuse with the next, carrying cargo along the secretory pathway.',
  ]),

  // — Topic 4: energy
  c(18, 'mitochondria', 0.38, 6, [
    'Mitochondria are the site of aerobic respiration, where the energy in glucose is converted into ATP.',
    'The inner mitochondrial membrane is folded into cristae, which greatly increases the surface area available for the electron transport chain.',
  ]),
  c(19, 'ATP', 0.52, 4, [
    'ATP is the immediate energy currency of the cell: hydrolysing its terminal phosphate bond releases energy that drives cellular work.',
  ]),
  c(20, 'cellular respiration', 0.31, 5, [
    'Cellular respiration proceeds through glycolysis, the citric acid cycle, and oxidative phosphorylation.',
    'Oxidative phosphorylation produces the great majority of the ATP yielded by a molecule of glucose.',
  ]),
  c(21, 'glycolysis', 0.27, 4, [
    'Glycolysis splits glucose into two molecules of pyruvate in the cytoplasm, netting two ATP and two NADH.',
  ]),
  c(22, 'electron transport chain', 0.22, 3, [
    'The electron transport chain passes electrons along the inner membrane, pumping protons to build the gradient that drives ATP synthase.',
  ]),
  c(23, 'endosymbiotic theory', 0.46, 2, [
    'The endosymbiotic theory holds that mitochondria descend from free-living bacteria engulfed by an ancestral host cell, supported by their own circular DNA and bacterial-type ribosomes.',
  ]),
]

const edges: Edge[] = [
  { source: 0, target: 1, weight: 0.62 },
  { source: 0, target: 2, weight: 0.64 },
  { source: 1, target: 2, weight: 0.71 },
  { source: 2, target: 3, weight: 0.42 },
  { source: 2, target: 12, weight: 0.58 },
  { source: 4, target: 5, weight: 0.86 },
  { source: 5, target: 6, weight: 0.66 },
  { source: 5, target: 7, weight: 0.74 },
  { source: 7, target: 8, weight: 0.69 },
  { source: 7, target: 9, weight: 0.72 },
  { source: 6, target: 9, weight: 0.55 },
  { source: 7, target: 10, weight: 0.68 },
  { source: 10, target: 11, weight: 0.51 },
  { source: 12, target: 13, weight: 0.47 },
  { source: 13, target: 14, weight: 0.73 },
  { source: 14, target: 15, weight: 0.78 },
  { source: 15, target: 17, weight: 0.66 },
  { source: 17, target: 16, weight: 0.53 },
  { source: 11, target: 16, weight: 0.48 },
  { source: 2, target: 18, weight: 0.44 },
  { source: 18, target: 20, weight: 0.87 },
  { source: 19, target: 20, weight: 0.63 },
  { source: 20, target: 21, weight: 0.7 },
  { source: 20, target: 22, weight: 0.75 },
  { source: 18, target: 23, weight: 0.59 },
  { source: 10, target: 19, weight: 0.4 },
]

const topics: Topic[] = [
  {
    id: 't1',
    title: 'Cell structure',
    summary: 'What a cell is, and the split between prokaryotes and eukaryotes.',
    conceptIds: [0, 1, 2, 3],
    estMinutes: 8,
  },
  {
    id: 't2',
    title: 'Membrane transport',
    summary: 'The bilayer, and the four ways things cross it.',
    conceptIds: [4, 5, 6, 7, 8, 9, 10, 11],
    estMinutes: 14,
  },
  {
    id: 't3',
    title: 'Organelles',
    summary: 'The division of labour, and the secretory pathway in order.',
    conceptIds: [12, 13, 14, 15, 16, 17],
    estMinutes: 12,
  },
  {
    id: 't4',
    title: 'Cellular respiration',
    summary: 'How the energy in glucose becomes ATP the cell can spend.',
    conceptIds: [18, 19, 20, 21, 22],
    estMinutes: 15,
  },
  {
    id: 't5',
    title: 'Origins',
    summary: 'Where mitochondria came from, and the evidence for it.',
    conceptIds: [23],
    estMinutes: 5,
  },
]

const notes: NoteSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    blocks: [
      {
        type: 'paragraph',
        text: 'A cell is the smallest unit that carries out all the processes we call life. Everything in this lecture follows from one problem: a cell must keep its internal chemistry different from its surroundings, and it must pay for the difference with energy.',
      },
      {
        type: 'callout',
        tone: 'key',
        title: 'The through-line',
        text: 'Structure follows function. Every organelle here exists because a particular reaction needed to be separated from the rest of the cell, or given more surface area.',
      },
      {
        type: 'bullets',
        items: [
          'The plasma membrane defines the boundary and controls what crosses it.',
          'Organelles compartmentalise chemistry that would otherwise interfere.',
          'Mitochondria convert stored chemical energy into ATP, the cell’s working currency.',
        ],
      },
    ],
  },
  {
    id: 'structure',
    title: 'Cell structure',
    blocks: [
      {
        type: 'paragraph',
        text: 'Cell theory makes three claims: all living organisms are made of cells, the cell is the basic unit of life, and all cells arise from pre-existing cells. Everything else in the course is detail hung on that frame.',
      },
      {
        type: 'table',
        head: ['', 'Prokaryotic', 'Eukaryotic'],
        rows: [
          ['Nucleus', 'Absent (nucleoid region)', 'Present, double membrane'],
          ['Organelles', 'None membrane-bound', 'Extensive'],
          ['DNA', 'Single circular chromosome', 'Multiple linear chromosomes'],
          ['Typical size', '1–5 µm', '10–100 µm'],
          ['Ribosomes', '70S', '80S (70S in mitochondria)'],
        ],
      },
      {
        type: 'paragraph',
        text: 'Holding it all in shape is the cytoskeleton — a network of protein filaments that anchors organelles and drives transport inside the cell.',
      },
    ],
  },
  {
    id: 'membrane',
    title: 'Membrane transport',
    blocks: [
      {
        type: 'paragraph',
        text: 'The plasma membrane is a phospholipid bilayer. Each phospholipid carries a hydrophilic phosphate head and two hydrophobic fatty-acid tails, so in water the molecules arrange themselves spontaneously — heads out toward the water, tails tucked inward away from it.',
      },
      {
        type: 'paragraph',
        text: 'The fluid mosaic model describes the result: a fluid sheet in which membrane proteins drift laterally rather than sitting in fixed positions. Cholesterol wedged between the tails buffers that fluidity against temperature change.',
      },
      {
        type: 'callout',
        tone: 'key',
        title: 'Selective permeability',
        text: 'Small nonpolar molecules (O₂, CO₂) cross the bilayer freely. Ions and large polar molecules cannot — they need a channel or a carrier protein.',
      },
      { type: 'heading', text: 'Four ways across' },
      {
        type: 'table',
        head: ['Route', 'Gradient', 'Protein', 'ATP'],
        rows: [
          ['Simple diffusion', 'Down', 'No', 'No'],
          ['Facilitated diffusion', 'Down', 'Yes', 'No'],
          ['Osmosis (water)', 'Down (solute)', 'Sometimes', 'No'],
          ['Active transport', 'Against', 'Yes', 'Yes'],
        ],
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'The trap this lecture sets',
        text: 'Facilitated diffusion uses a protein but is still passive. The presence of a protein does not make transport active — the direction relative to the gradient does.',
      },
    ],
  },
  {
    id: 'organelles',
    title: 'Organelles',
    blocks: [
      {
        type: 'paragraph',
        text: 'A eukaryotic cell runs many incompatible reactions at once. It manages this by putting each one behind its own membrane.',
      },
      {
        type: 'bullets',
        items: [
          'Nucleus — houses the genome behind a double membrane; nuclear pores regulate RNA and protein traffic.',
          'Ribosome — translates mRNA into protein, free in the cytoplasm or bound to the rough ER.',
          'Rough ER — ribosome-studded; folds and modifies proteins destined for secretion.',
          'Smooth ER — no ribosomes; synthesises lipids and detoxifies drugs.',
          'Golgi apparatus — receives proteins from the ER, modifies them, and sorts them onward.',
          'Lysosome — hydrolytic enzymes at low pH, digesting damaged organelles and endocytosed material.',
        ],
      },
      {
        type: 'callout',
        tone: 'note',
        title: 'The secretory pathway, in order',
        text: 'Ribosome → rough ER → transport vesicle → Golgi → secretory vesicle → plasma membrane. Exams test the order far more often than the detail.',
      },
    ],
  },
  {
    id: 'respiration',
    title: 'Cellular respiration',
    blocks: [
      {
        type: 'paragraph',
        text: 'Mitochondria are the site of aerobic respiration: the controlled release of the energy stored in glucose, captured as ATP. The inner membrane is folded into cristae, which dramatically increases the surface area available for the electron transport chain — more surface, more ATP per second.',
      },
      { type: 'equation', latex: 'C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O + ~30–32 ATP', caption: 'Aerobic respiration, overall' },
      {
        type: 'table',
        head: ['Stage', 'Location', 'Net ATP'],
        rows: [
          ['Glycolysis', 'Cytoplasm', '2'],
          ['Citric acid cycle', 'Mitochondrial matrix', '2'],
          ['Oxidative phosphorylation', 'Inner membrane (cristae)', '~26–28'],
        ],
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Flagged from your answers',
        text: 'Your last three attempts on this topic put glycolysis in the mitochondrion. It happens in the cytoplasm — which is exactly why anaerobic organisms can still run it.',
      },
    ],
  },
  {
    id: 'origins',
    title: 'Origins',
    blocks: [
      {
        type: 'paragraph',
        text: 'Mitochondria carry their own circular DNA, their own 70S bacterial-type ribosomes, and a double membrane, and they divide independently of the cell. The endosymbiotic theory reads all of that as evidence that they descend from free-living bacteria engulfed by an ancestral host cell.',
      },
      {
        type: 'callout',
        tone: 'key',
        title: 'Worth one sentence in an essay',
        text: 'Name the evidence, not just the theory: circular DNA, 70S ribosomes, double membrane, independent division.',
      },
    ],
  },
]

const flashcards: Flashcard[] = [
  { id: 'b1', concept: 'cell theory', front: 'State the three claims of cell theory.', back: 'All organisms are made of cells; the cell is the basic unit of life; all cells arise from pre-existing cells.' },
  { id: 'b2', concept: 'prokaryotic cell', front: 'Give three differences between prokaryotic and eukaryotic cells.', back: 'No nucleus vs a nucleus; no membrane-bound organelles vs many; a single circular chromosome vs multiple linear ones.' },
  { id: 'b3', concept: 'eukaryotic cell', front: 'What is the advantage of compartmentalisation?', back: 'It lets chemically incompatible reactions run at the same time in the same cell, each at its own optimal pH and enzyme concentration.' },
  { id: 'b4', concept: 'cytoskeleton', front: 'What does the cytoskeleton do?', back: 'A network of protein filaments giving the cell shape, anchoring organelles and driving intracellular transport.' },
  { id: 'b5', concept: 'phospholipid bilayer', front: 'Why does a bilayer form spontaneously in water?', back: 'The hydrophilic heads are drawn to water and the hydrophobic tails are driven away from it, so the tails tuck inward on both sides.' },
  { id: 'b6', concept: 'phospholipid bilayer', front: 'What does the fluid mosaic model describe?', back: 'A fluid sheet in which membrane proteins drift laterally rather than sitting in fixed positions.' },
  { id: 'b7', concept: 'plasma membrane', front: 'Define selective permeability.', back: 'Small nonpolar molecules cross freely; ions and large polar molecules need a transport protein.' },
  { id: 'b8', concept: 'membrane protein', front: 'Integral vs peripheral membrane proteins?', back: 'Integral proteins span the bilayer and act as channels, carriers or receptors. Peripheral proteins sit on one face only.' },
  { id: 'b9', concept: 'passive transport', front: 'Passive vs active transport — the one distinction that matters?', back: 'Direction relative to the gradient. Passive moves down it and costs nothing; active moves against it and costs ATP.' },
  { id: 'b10', concept: 'osmosis', front: 'What is osmosis?', back: 'The passive diffusion of water across a selectively permeable membrane toward the region of higher solute concentration.' },
  { id: 'b11', concept: 'osmosis', front: 'A cell is placed in pure water. Which way does water move?', back: 'Into the cell — toward the higher solute concentration inside — so the cell swells.' },
  { id: 'b12', concept: 'facilitated diffusion', front: 'Is facilitated diffusion active or passive?', back: 'Passive. It uses a protein, but the substance still moves down its gradient, so no ATP is spent.' },
  { id: 'b13', concept: 'active transport', front: 'What does the sodium–potassium pump move per ATP?', back: 'Three Na⁺ out and two K⁺ in, both against their gradients.' },
  { id: 'b14', concept: 'active transport', front: 'Why does active transport need ATP?', back: 'Moving a substance against its concentration gradient is energetically uphill, so the energy has to come from somewhere.' },
  { id: 'b15', concept: 'endocytosis', front: 'What happens during endocytosis?', back: 'The membrane folds inward and pinches off a vesicle, bringing extracellular material into the cell.' },
  { id: 'b16', concept: 'nucleus', front: 'What is the function of the nucleus?', back: 'It houses the genome behind a double membrane and controls gene expression; nuclear pores regulate RNA and protein traffic.' },
  { id: 'b17', concept: 'ribosome', front: 'What do ribosomes do, and where are they?', back: 'They translate mRNA into protein, free in the cytoplasm or bound to the rough ER.' },
  { id: 'b18', concept: 'endoplasmic reticulum', front: 'Rough ER vs smooth ER?', back: 'Rough ER carries ribosomes and folds proteins for secretion. Smooth ER has none and handles lipid synthesis and detoxification.' },
  { id: 'b19', concept: 'golgi apparatus', front: 'What does the Golgi apparatus do?', back: 'Receives proteins from the ER, modifies them, and sorts them into vesicles bound for their destinations.' },
  { id: 'b20', concept: 'vesicle transport', front: 'Trace the secretory pathway.', back: 'Ribosome → rough ER → transport vesicle → Golgi → secretory vesicle → plasma membrane.' },
  { id: 'b21', concept: 'lysosome', front: 'What do lysosomes contain, and why at low pH?', back: 'Hydrolytic enzymes, which work best in acid — and which would damage the cell if they leaked into the neutral cytoplasm.' },
  { id: 'b22', concept: 'mitochondria', front: 'What is the primary function of mitochondria?', back: 'Aerobic respiration — converting the chemical energy in glucose into ATP.' },
  { id: 'b23', concept: 'mitochondria', front: 'Why are the cristae folded?', back: 'Folding multiplies the surface area of the inner membrane, giving the electron transport chain more room and raising ATP output.' },
  { id: 'b24', concept: 'ATP', front: 'Why is ATP called the energy currency?', back: 'Hydrolysing its terminal phosphate bond releases a usable packet of energy that drives almost every kind of cellular work.' },
  { id: 'b25', concept: 'cellular respiration', front: 'Name the three stages of respiration in order.', back: 'Glycolysis (cytoplasm) → citric acid cycle (matrix) → oxidative phosphorylation (inner membrane).' },
  { id: 'b26', concept: 'glycolysis', front: 'Where does glycolysis happen, and what does it yield?', back: 'In the cytoplasm — not the mitochondrion. It splits glucose into two pyruvate, netting 2 ATP and 2 NADH.' },
  { id: 'b27', concept: 'cellular respiration', front: 'Which stage yields the most ATP?', back: 'Oxidative phosphorylation — roughly 26–28 of the ~30–32 ATP from one glucose.' },
  { id: 'b28', concept: 'electron transport chain', front: 'What does the electron transport chain actually build?', back: 'A proton gradient across the inner membrane. That gradient, not the electrons, is what drives ATP synthase.' },
  { id: 'b29', concept: 'endosymbiotic theory', front: 'What evidence supports the endosymbiotic theory?', back: 'Mitochondria have circular DNA, 70S bacterial-type ribosomes and a double membrane, and they divide independently of the cell.' },
  { id: 'b30', concept: 'eukaryotic cell', front: 'Why is a eukaryotic cell so much larger than a prokaryotic one?', back: 'Compartmentalisation lets it run more chemistry at once without reactions interfering, supporting a bigger volume.' },
]

/** Hand-written questions: the ones where the explanation is the point. */
const authored: Omit<QuizQuestion, 'id'>[] = [
  {
    kind: 'mcq', concept: 'mitochondria', difficulty: 0.42,
    stem: 'What is the primary function of mitochondria?',
    options: ['Producing ATP through aerobic respiration', 'Synthesising lipids for the membrane', 'Sorting proteins into secretory vesicles', 'Digesting damaged organelles'],
    answer: 'Producing ATP through aerobic respiration',
    explanation: 'Lipid synthesis is the smooth ER, sorting is the Golgi, and digestion is the lysosome. Each distractor is a real organelle function — which is what makes them tempting.',
  },
  {
    kind: 'mcq', concept: 'glycolysis', difficulty: 0.61,
    stem: 'Where in the cell does glycolysis occur?',
    options: ['The cytoplasm', 'The mitochondrial matrix', 'The inner mitochondrial membrane', 'The rough endoplasmic reticulum'],
    answer: 'The cytoplasm',
    explanation: 'Glycolysis happens in the cytoplasm, which is exactly why organisms without mitochondria — and cells starved of oxygen — can still run it.',
  },
  {
    kind: 'mcq', concept: 'facilitated diffusion', difficulty: 0.66,
    stem: 'A glucose molecule crosses the membrane through a carrier protein, moving from high to low concentration. This is:',
    options: ['Facilitated diffusion', 'Active transport', 'Endocytosis', 'Osmosis'],
    answer: 'Facilitated diffusion',
    explanation: 'The protein is a red herring. What decides passive vs active is the direction relative to the gradient — and this one runs downhill, so no ATP is spent.',
  },
  {
    kind: 'mcq', concept: 'active transport', difficulty: 0.58,
    stem: 'A cell pumps calcium ions out against a steep concentration gradient. This requires:',
    options: ['ATP hydrolysis', 'A larger concentration gradient', 'A lower membrane temperature', 'More cholesterol in the bilayer'],
    answer: 'ATP hydrolysis',
    explanation: 'Anything moving against its gradient is active transport, and active transport is paid for with ATP.',
  },
  {
    kind: 'mcq', concept: 'osmosis', difficulty: 0.35,
    stem: 'A red blood cell is placed in pure water. What happens?',
    options: ['Water enters and the cell swells', 'Water leaves and the cell shrinks', 'Nothing — water cannot cross the membrane', 'Salt is actively pumped in'],
    answer: 'Water enters and the cell swells',
    explanation: 'Water moves toward the higher solute concentration, which is inside the cell. No energy is involved.',
  },
  {
    kind: 'mcq', concept: 'plasma membrane', difficulty: 0.29,
    stem: 'The hydrophobic tails of a phospholipid bilayer point:',
    options: ['Inward, away from water on both sides', 'Outward, toward the extracellular fluid', 'Toward the nucleus', 'In alternating directions along the sheet'],
    answer: 'Inward, away from water on both sides',
    explanation: 'The heads are hydrophilic and face the water; the tails are hydrophobic and are driven inward. That is the whole reason a bilayer assembles on its own.',
  },
  {
    kind: 'mcq', concept: 'endoplasmic reticulum', difficulty: 0.47,
    stem: 'Which organelle is studded with ribosomes?',
    options: ['Rough endoplasmic reticulum', 'Smooth endoplasmic reticulum', 'Golgi apparatus', 'Lysosome'],
    answer: 'Rough endoplasmic reticulum',
    explanation: 'The ribosomes are what make it "rough". They feed newly translated proteins straight into the ER lumen for folding.',
  },
  {
    kind: 'mcq', concept: 'golgi apparatus', difficulty: 0.5,
    stem: 'A protein has just been folded in the rough ER. Where does it go next?',
    options: ['The Golgi apparatus', 'Straight to the plasma membrane', 'The nucleus', 'The mitochondrial matrix'],
    answer: 'The Golgi apparatus',
    explanation: 'The secretory pathway runs ribosome → rough ER → transport vesicle → Golgi → secretory vesicle → plasma membrane.',
  },
  {
    kind: 'mcq', concept: 'prokaryotic cell', difficulty: 0.33,
    stem: 'Which feature is absent from a prokaryotic cell?',
    options: ['A membrane-bound nucleus', 'A plasma membrane', 'Ribosomes', 'DNA'],
    answer: 'A membrane-bound nucleus',
    explanation: 'Prokaryotes have DNA, ribosomes and a plasma membrane — they simply keep the DNA in an unbounded nucleoid region.',
  },
  {
    kind: 'mcq', concept: 'cellular respiration', difficulty: 0.72,
    stem: 'Which stage of respiration produces the majority of the ATP?',
    options: ['Oxidative phosphorylation', 'Glycolysis', 'The citric acid cycle', 'Fermentation'],
    answer: 'Oxidative phosphorylation',
    explanation: 'Glycolysis and the citric acid cycle net two ATP each. Oxidative phosphorylation on the cristae contributes roughly 26–28.',
  },
  {
    kind: 'mcq', concept: 'electron transport chain', difficulty: 0.78,
    stem: 'What does the electron transport chain directly build?',
    options: ['A proton gradient across the inner membrane', 'ATP, directly from electrons', 'Glucose from carbon dioxide', 'Pyruvate from glucose'],
    answer: 'A proton gradient across the inner membrane',
    explanation: 'The chain pumps protons; the gradient it creates is what drives ATP synthase. Electrons never make ATP directly.',
  },
  {
    kind: 'mcq', concept: 'lysosome', difficulty: 0.44,
    stem: 'Why do lysosomes keep their interior acidic?',
    options: [
      'Their hydrolytic enzymes only work at low pH',
      'To dissolve the plasma membrane',
      'To store ATP more efficiently',
      'To keep ribosomes attached',
    ],
    answer: 'Their hydrolytic enzymes only work at low pH',
    explanation: 'It is also a safety mechanism: if the enzymes leak into the neutral cytoplasm, they largely stop working.',
  },
  {
    kind: 'mcq', concept: 'endosymbiotic theory', difficulty: 0.63,
    stem: 'Which observation best supports the endosymbiotic theory?',
    options: [
      'Mitochondria have their own circular DNA and 70S ribosomes',
      'Mitochondria are found in all eukaryotes',
      'Mitochondria produce ATP',
      'Mitochondria have folded inner membranes',
    ],
    answer: 'Mitochondria have their own circular DNA and 70S ribosomes',
    explanation: 'Both are bacterial features. Producing ATP and having folds are functional facts that any organelle could have evolved.',
  },
  {
    kind: 'mcq', concept: 'nucleus', difficulty: 0.38,
    stem: 'What passes through nuclear pores?',
    options: ['RNA and proteins', 'Only water', 'Whole ribosomes only', 'Nothing — the envelope is sealed'],
    answer: 'RNA and proteins',
    explanation: 'The pores are the regulated traffic between nucleoplasm and cytoplasm; without them transcription would be useless.',
  },
  {
    kind: 'mcq', concept: 'eukaryotic cell', difficulty: 0.55,
    stem: 'Compartmentalisation allows a eukaryotic cell to:',
    options: [
      'Run incompatible reactions at the same time',
      'Avoid needing ATP',
      'Dispense with a plasma membrane',
      'Replicate without DNA',
    ],
    answer: 'Run incompatible reactions at the same time',
    explanation: 'Each compartment holds its own pH and enzyme mix, so reactions that would poison each other can proceed in parallel.',
  },
  {
    kind: 'free', concept: 'cellular respiration', difficulty: 0.7,
    stem: 'In your own words: why does folding the inner mitochondrial membrane into cristae increase ATP output?',
    options: [],
    answer:
      'The folds greatly increase the surface area of the inner membrane, so many more electron transport chains and ATP synthase complexes can be packed in, and more ATP can be produced per second.',
    explanation: 'Key ideas: more surface area, more electron transport chains packed in, higher ATP output per unit time.',
  },
  {
    kind: 'free', concept: 'passive transport', difficulty: 0.6,
    stem: 'In your own words: what distinguishes passive from active transport?',
    options: [],
    answer:
      'Passive transport moves a substance down its concentration gradient and requires no energy, while active transport moves a substance against its gradient and must consume ATP to do it.',
    explanation: 'Key ideas: direction relative to the gradient, and whether ATP is spent. The presence of a protein is not the distinction.',
  },
  {
    kind: 'free', concept: 'eukaryotic cell', difficulty: 0.68,
    stem: 'In your own words: why is compartmentalisation an advantage for a eukaryotic cell?',
    options: [],
    answer:
      'Membrane-bound organelles let chemically incompatible reactions run at the same time in the same cell, each at its own optimal pH and enzyme concentration, and they concentrate reactants so reactions run faster.',
    explanation: 'Key ideas: incompatible reactions kept apart, local conditions optimised, reactants concentrated.',
  },
]

/**
 * Cloze questions, generated the way the engine generates them: the stem is a source
 * sentence with the concept blanked out, and the distractors are its neighbours in the
 * graph — the concepts it is actually confusable with, rather than random ones.
 */
function generateCloze(source: Concept[], graph: Edge[]): Omit<QuizQuestion, 'id'>[] {
  const neighbours = (id: number) =>
    graph
      .filter((e) => e.source === id || e.target === id)
      .sort((a, b) => b.weight - a.weight)
      .map((e) => (e.source === id ? e.target : e.source))

  const out: Omit<QuizQuestion, 'id'>[] = []
  for (const concept of source) {
    const sentence = concept.evidence[0]
    if (!sentence) continue
    const pattern = new RegExp(concept.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    if (!pattern.test(sentence)) continue

    const near = neighbours(concept.id)
      .map((id) => source.find((s) => s.id === id)?.name)
      .filter((n): n is string => Boolean(n) && n !== concept.name)
    const filler = source.filter((s) => s.id !== concept.id).map((s) => s.name)
    const distractors = [...new Set([...near, ...filler])].slice(0, 3)
    if (distractors.length < 3) continue

    out.push({
      kind: 'mcq',
      concept: concept.name,
      difficulty: 0.3 + 0.4 * (1 - concept.mastery),
      stem: sentence.replace(pattern, '—————'),
      options: [concept.name, ...distractors],
      answer: concept.name,
      explanation: `The sentence comes from your own material, with “${concept.name}” removed. The other options are its nearest neighbours in the concept graph, which is what makes them plausible.`,
    })
  }
  return out
}

const quiz: QuizQuestion[] = [...authored, ...generateCloze(concepts, edges)]
  .slice(0, 35)
  .map((q, id) => ({ ...q, id }))

export const biologyPack: Pack = {
  id: 'pack-cell-biology',
  title: 'Cell Biology — Lecture 04',
  subject: 'biology',
  folder: 'Biology',
  sourceLabel: 'Cell Biology — Lecture 04.pdf',
  sourceKind: 'pdf',
  createdAt: Date.now() - 3 * DAY,
  lastStudied: Date.now() - 2 * HOUR,
  progress: 0.61,
  minutes: 42,
  summary:
    'The cell as the basic unit of life: membrane structure and transport, the organelles that divide labour inside a eukaryotic cell, and how the energy in glucose becomes ATP.',
  concepts,
  edges,
  topics,
  notes,
  flashcards,
  quiz,
}
