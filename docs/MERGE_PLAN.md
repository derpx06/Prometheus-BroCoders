# Lattice × Savitrix — merge architecture

The plan for folding Savitrix's teacher tooling into Lattice so the result reads as one
product rather than two bolted together. Written after a full audit of this repository;
Savitrix is known only through `CLAUDE_HANDOFF.md`, not its source.

---

## 0. What is actually here

The handoff assumes a Next.js 16 / MongoDB / Groq codebase. **This repository is none of
those.** It is Lattice:

| | Lattice (this repo) | Savitrix (per handoff) |
|---|---|---|
| Stack | FastAPI + React 18 / Vite 6 / Tailwind 4 | Next.js 16 App Router, React 19 |
| Data | **none** — in-process dict + `localStorage` | MongoDB / Mongoose |
| Auth | **none** | bcrypt + JWT cookie, school tenancy |
| AI | embeddings (model2vec), optional local Ollama | Groq, LLM-first |
| Tests | 20 pytest | — |

So "merge" means **building Savitrix's capabilities natively in Lattice's stack**, not
copying files. Two consequences that drive everything below:

1. Savitrix's persistence layer cannot be reused. A database has to be chosen and built.
2. Savitrix's security defects (plaintext temporary passwords, orphan-school writes) are
   not inherited — we never write that code in the first place.

### Audited inventory — what works today, and must not regress

| # | Capability | State | Where |
|---|---|---|---|
| 1 | File → text extraction (PDF / DOCX / TXT, 20 MB cap) | **real** | `backend/main.py:106` |
| 2 | Concept extraction — CountVectorizer + embeddings + MMR | **real** | `backend/ingest.py:78` |
| 3 | Prerequisite DAG from first-mention order + similarity | **real** | `backend/ingest.py:136` |
| 4 | Question bank generation — cloze MCQ with nearest-neighbour distractors, free response | **real, no LLM** | `backend/generate.py:69` |
| 5 | Reasoning-question tier | **real, opt-in** local Ollama | `backend/generate.py:88` |
| 6 | Grading — exact match + embedding cosine | **real** | `backend/grade.py` |
| 7 | Bayesian Knowledge Tracing per concept | **real** | `backend/learner.py:31` |
| 8 | SM-2 review scheduling | **real** | `backend/learner.py:43` |
| 9 | ZPD question selection (weakest unlocked concept, difficulty just above mastery) | **real** | `backend/learner.py:74` |
| 10 | Adaptive loop API (`/next`, `/answer`) | **real, ephemeral** | `backend/main.py:168` |
| 11 | Notes / flashcards / learning path derived from concept evidence | **real** | `frontend/src/lib/pack.ts` |
| 12 | Quiz player with per-question feedback and mastery readout | **real** | `frontend/src/pages/Quiz.tsx` |
| 13 | Flashcards, notes reader, knowledge graph, concept map | **real** | `frontend/src/pages/`, `components/app/` |
| 14 | Retrieval-only study assistant (cites the student's own sentences) | **real** | `frontend/src/lib/tutor.ts` |
| 15 | Design system — tokens, motion system, 20+ primitives | **real, strong** | `frontend/src/styles.css`, `lib/motion.ts`, `components/ui/` |
| 16 | Command palette, drop-anywhere upload, toasts, responsive + mobile nav | **real** | `components/app/` |
| 17 | Demo-mode fallback with engine-status badge | **real** | `store/app.tsx` |
| 18 | YouTube link input | **UI placeholder**, says "Not wired up" | `components/app/UploadModal.tsx:160` |
| 19 | Sessions survive a restart | **no** — process memory | `backend/main.py:47` |
| 20 | Accounts, roles, classes, assignments, teachers | **no** | — |

Baseline verified this session: `npm run build` clean (519 kB / 157 kB gzip). Python deps
are not installed on this machine (`uv` absent), so pytest was not run — that is an
environment gap, not a code one.

---

## 1. Product analysis — where the two overlap

| Capability | Lattice | Savitrix | Merge verdict |
|---|---|---|---|
| Source ingestion | real, the entry point | absent — every generator starts from a form | **Lattice wins.** Becomes the platform's foundation. |
| YouTube | placeholder | absent | **Net-new.** Build it for real. |
| Content understanding (concepts, prerequisites, difficulty) | real and unusual | absent | **Lattice's moat.** It *is* Savitrix's "Step 2 — Understand content". |
| Question generation | grounded in the source text, instant, free | LLM, rich exam parameters (board, Bloom's, marks) | **Complementary, not duplicate.** Two tiers behind one interface. |
| Adaptive practice (BKT / SM-2 / ZPD) | real | absent | **Lattice wins.** Becomes student Practice *and* the source of teacher analytics. |
| Notes / flashcards | evidence-grounded, ephemeral | LLM-written, ephemeral | **Unify** under one persisted Material model. |
| Test paper + editor + PDF export | absent | flagship, deep | **Savitrix wins.** Highest-effort thing to build here. |
| Question bank | absent | real, school-scoped | **Savitrix wins.** |
| Classes / assignments / submissions | absent | mock UI only | **Net-new. This is the actual merge.** |
| Analytics | has the real data (per-concept mastery) and no UI for teachers | has the UI and fake data | **The unlock.** Wire one to the other. |
| Auth / roles / tenancy | absent | real | **Savitrix's model, rebuilt** without its defects. |
| Persistence | localStorage | MongoDB | **Neither.** See §5. |
| Design system | cool zinc + restrained indigo, one accent, disciplined motion | warm coral / cream, Poppins + Nunito | **Lattice wins.** Savitrix's flows get re-skinned into it. |

**The one-sentence finding.** Lattice has a real student model and nobody to teach;
Savitrix has teachers and no real student data. The merge is not feature addition — it is
closing a loop: *Savitrix's creation layer produces the material, Lattice's engine measures
what students actually learn from it, and those measurements become the analytics Savitrix
could only mock.*

### Duplicates to collapse, not ship twice

- Savitrix's five separate generator pages (quiz / notes / lesson plan / assignment / test)
  and Lattice's upload modal are **one flow**: source → understanding → output → customise →
  review → save. One route, not six.
- Savitrix's Quiz Generator and Lattice's adaptive quiz are **one Material kind** with two
  delivery modes (fixed set for assigned work, adaptive for practice).
- Savitrix's question bank and Lattice's generated bank are **one store**; the engine's
  output is simply bank rows the teacher may promote, edit, or ignore.
- Savitrix's AI Assistant and Lattice's retrieval tutor are **one assistant** with a
  context object and role-dependent capabilities.
- Savitrix's dashboard stat cards, Lattice's `Progress` page, and Savitrix's analytics page
  are **one analytics surface**, role-filtered.

---

## 2. Product vision

> **An AI learning workspace built around material, not forms.**
> You bring a PDF, a video, or your notes. The platform reads it, and from that one source
> a teacher builds quizzes, exams, assignments, notes and lesson plans for a class — while
> students practise against the same material and the platform tracks, concept by concept,
> what each of them actually knows.

Three commitments that follow:

1. **A source is an asset, not an upload event.** You upload once. Everything else is
   generated from it, repeatedly, by anyone entitled to it.
2. **One engine, two workflows.** Teachers and students hit the same generation and
   measurement services. Roles change permissions and surfaces, never the intelligence.
3. **No invented numbers.** Every percentage on screen traces to a recorded answer. Where
   data does not exist yet, the UI says so.

---

## 3. Recommended navigation

Shared shell, role-aware items. One codebase, one layout, three surfaces.

```
STUDENT                     TEACHER                     SCHOOL ADMIN
Home                        Home                        Home
My classes                  Classes                     Teachers
Assignments                 Create          ← primary   Classes
Practice                    Library                     School library
Library                     Question bank               Analytics
Progress                    Analytics                   Plan & seats
Assistant                   Assistant                   Settings
Settings                    Settings
```

- **Create** is the teacher's primary action and lives in the top bar as `+ Create with AI`
  for every role — for students it is scoped to *myself* outputs (practice quiz, notes,
  flashcards, summary), for teachers it additionally offers class-bound outputs (exam,
  assignment, lesson plan) and publishing.
- Students never see Question bank, Analytics, or Create's class-bound outputs.
- Admin is a *superset* of teacher, plus teacher-seat management. It is not a third product.
- Mobile: 5-slot bottom bar, role-aware, with Create as the centre action — the existing
  `MobileNav` pattern, unchanged in shape.

---

## 4. User journeys

**A. Student uploads a PDF**
Drop file anywhere → `POST /api/sources` (extract → concepts → prerequisite DAG → bank,
persisted) → processing view shows the real stages → lands on the **Source** page: learning
path, knowledge graph, weakest-area opinion, and a row of "what can I do with this" actions
(Practice · Notes · Flashcards · Quiz · Ask). Nothing is generated until asked for; the
analysis is cached so the second ask is instant.

**B. Student uses a YouTube link**
Paste URL → transcript fetched server-side and stored as the source text → *identical path
from there on*. The source card records the origin so it is traceable. If the video has no
transcript, the error says exactly that and offers Paste text.

**C. Teacher creates a quiz**
`+ Create with AI` → **What?** Quiz → **Source?** pick an existing source, or upload/paste/
link → **Customise** (grade, count, types, difficulty) progressively revealed → generate →
review/edit each question → save to Library, or push the good ones to Question bank, or
assign straight to a class.

**D. Teacher creates a test**
Same entry, output = Test. The customise step opens the full exam form (board, exam type,
chapters, marks, duration, language, Bloom's levels, outcomes, instructions, 1–3 versions)
because *here* the depth is the point. Generation is sectioned; the result opens in the test
editor: edit stem/answer/explanation/marks/options/Bloom's, add/delete/duplicate questions
and sections, shuffle options, drag-reorder, regenerate one question with the rest passed as
exclusions. Autosave after first save, undo/redo, print, PDF + answer-key PDF, assign.

**E. Teacher assigns work**
From any saved material: Assign → pick class → due date + instructions → publish. Students
in that class see it immediately; the assignment references the material by id, so editing
the material before the due date updates what students get (and is blocked after the first
submission).

**F. Student completes an assignment**
Assignments → open → `POST /api/attempts` → answer question by question (graded by the same
grader the practice loop uses) → submit → score, per-question review with the ideal answer
and *why*, and the concepts to revisit — with a one-tap link into practice on exactly those
concepts. Every answer is persisted as a row.

**G. Teacher reviews results**
Class → assignment → completion, score distribution, per-question accuracy, most-missed
questions, and weak concepts aggregated across the class. All of it computed from `answers`
rows. An assignment nobody has submitted says "no submissions yet" — it does not render an
empty chart as if it were data.

---

## 5. Database architecture

**Choice: SQLite via stdlib `sqlite3`.** The repo's discipline is "no API key and no
network"; adding a database server contradicts that, and MongoDB buys nothing here since
every relationship in this product is relational. All SQL lives behind a repository module,
so Postgres later is a connection swap, not a rewrite. JSON columns hold engine payloads
that are read whole and never queried by field.

```
schools            id, name, type, city, country, plan, created_at
users              id, name, email UNIQUE, password_hash, role(student|teacher|admin),
                   school_id→schools NULL, created_at
invitations        id, token_hash, email, role, school_id NULL, class_id NULL,
                   expires_at, accepted_at, created_by→users
                                    ← replaces Savitrix's plaintext temporary passwords

sources            id, owner_id→users, school_id NULL, kind(file|text|youtube),
                   title, origin, char_count, text, created_at
source_analyses    source_id PK→sources, subject, concepts JSON, edges JSON, bank JSON
                                    ← the engine's understanding, computed once, reused

materials          id, owner_id, school_id NULL, source_id→sources NULL,
                   kind(quiz|test|notes|assignment|lesson_plan|flashcards|summary),
                   title, subject, grade, status(draft|published), body JSON, timestamps
                                    ← ONE table for every generated artefact
question_bank      id, owner_id, school_id NULL, source_id NULL, question, type,
                   options JSON, answer, explanation, subject, grade, topic,
                   difficulty, bloom, tags JSON, created_at

classes            id, teacher_id→users, school_id NULL, name, subject, grade,
                   join_code UNIQUE, archived, created_at
class_members      class_id, user_id, role(student|co_teacher), joined_at  PK(class,user)
assignments        id, class_id, material_id, assigned_by, title, instructions,
                   due_at, published_at, created_at

attempts           id, user_id, assignment_id NULL, material_id NULL, source_id NULL,
                   kind, started_at, submitted_at, score, max_score, state JSON
answers            id, attempt_id, question_ref, response, correct, score, concept
                                    ← the only source of truth for every analytic

study_states       id, user_id, source_id, day, timestamps   UNIQUE(user_id, source_id)
concept_mastery    study_state_id, concept_idx, p_known, attempts, ease, interval,
                   reps, due, seen JSON        PK(study_state_id, concept_idx)
                                    ← makes BKT/SM-2 survive a restart
```

### Tenancy rule

Savitrix forces everyone into a school. The existing product serves individuals. Both are
satisfied by making `school_id` **nullable** and scoping on two axes:

```
visible(row) ⟺ row.owner_id = me
             ∨ (row.school_id IS NOT NULL ∧ row.school_id = my.school_id)
             ∨ row reached through a class I am a member of
```

`school_id` is always taken from the authenticated user's record, never from the request
body. The third clause is what lets an independent teacher teach students who have no
school — **classes, not schools, are the sharing primitive.** Schools are a billing and
administration boundary layered on top.

### Auth

- Passwords: `hashlib.scrypt` (stdlib, memory-hard) with a per-user salt. No new dependency,
  no bcrypt needed.
- Sessions: HMAC-SHA256-signed token (stdlib `hmac`/`secrets`) in an HTTP-only, SameSite=Lax
  cookie, 7-day expiry, secret from `LATTICE_SECRET`.
- Teacher onboarding: single-use invitation token, hashed at rest, expiring. The admin gets
  a link to share. **No password ever exists in plaintext anywhere**, which is the specific
  defect the handoff flags as high priority.
- School registration is one transaction — school and admin commit together or not at all,
  which closes the orphan-school risk in the handoff.

---

## 6. Route architecture

```
Public
  /                        landing (existing, kept)
  /login  /signup          role chosen at signup: student · teacher · school
  /join/:code              class invite link → signup/login → joined
  /invite/:token           teacher invitation → set your own password

App — one shell, role-aware
  /app                     home (role-aware composition)
  /app/create              ⭐ the unified AI Create flow, all roles
  /app/source/:id          a source and everything it can become
  /app/library             sources + materials, role-filtered
  /app/material/:id        viewer (student) / editor (teacher)
  /app/test/:id            the test editor — teacher only
  /app/bank                question bank — teacher only
  /app/classes             teacher: my classes · student: my classes
  /app/classes/:id         teacher: roster + assignments + results · student: assigned work
  /app/assignments         student
  /app/attempt/:id         taking a quiz / test
  /app/practice            adaptive loop (existing, now persistent)
  /app/progress            student analytics — real
  /app/analytics           teacher analytics — real
  /app/teachers            admin: seats and invitations
  /app/settings  /app/profile

Preserved redirects (no dead links from earlier sessions)
  /app/pack/:id → /app/source/:id      /app/learn → /app
  /app/notes/:id · /app/quiz/:id · /app/flashcards/:id   kept as-is
```

API surface: `/api/auth/*`, `/api/sources`, `/api/materials`, `/api/question-bank`,
`/api/classes`, `/api/assignments`, `/api/attempts`, `/api/study/*`, `/api/analytics/*`.
The four existing engine routes (`/api/extract`, `/api/sessions…`) stay as thin
back-compatible adapters so the current client never breaks mid-migration.

---

## 7. Component architecture

Keep `components/ui/` exactly as it is — it is the strongest asset in the repo and Savitrix's
flows re-skin into it. New work is composition, not primitives.

**Reused unchanged:** `Button` `IconButton` `Modal` `Badge` `Card` `ProgressBar`
`MasteryDots` `Skeleton` `EmptyState` `Input` `SearchInput` `Tabs` `Segmented` `Dropdown`
`Avatar` `Tooltip` `Reveal` `Toaster` `ErrorBoundary`, plus `lib/motion.ts` tokens.

**Generalised:**
- `UploadZone` / `DropCatcher` → a `SourcePicker` that also accepts a URL and existing
  sources, used by both Create and the standalone upload.
- `ProcessingView` → driven by real backend stage events rather than a timer floor.
- `PackCard` → `SourceCard` + `MaterialCard`, same visual language.
- `Sidebar` / `MobileNav` → take a role and render from one `NAV_BY_ROLE` table.
- `AIChat` → `Assistant` with a `context` prop (`{sourceId, conceptId, materialId, role}`).
- `KnowledgeGraph` / `ConceptMap` → reused for both a student's own mastery and, with an
  aggregate prop, a teacher's class-wide weak-concept view.

**New:**
- `CreateFlow/` — `StepSource`, `StepOutput`, `StepCustomise`, `StepReview` + a reducer.
- `TestEditor/` — `SectionList`, `QuestionRow`, `InlineFields`, `RegenerateButton`, and the
  `useUndoRedo` + `useAutosave` hooks. Drag-reorder: HTML5 DnD, no `@dnd-kit` dependency.
- `ClassRoster`, `AssignmentCard`, `ResultsTable`, `QuestionBankTable`.
- `RoleGate` — a declarative wrapper; the server still authorises independently.

---

## 8. AI architecture

Modular services, one pipeline, structured and validated at every boundary.

```
                        ┌──────────── ingest ────────────┐
file / text / URL  ──▶  extract  ──▶  source.text (stored, reusable)
                                          │
                                          ▼
                        understanding:  concepts · prerequisite DAG · difficulty · subject
                        (embeddings only — no LLM, cached in source_analyses)
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
      grounded tier              exam tier (LLM)              derivation tier
   cloze MCQ, free response     sectioned test papers,      notes, flashcards,
   nearest-neighbour            Bloom's-tagged items,       summary, learning path
   distractors, instant,        lesson plans — structured   from concept evidence
   no network                   JSON, schema-validated,
                                retried, model-fallback
            └─────────────────────────────┼─────────────────────────────┘
                                          ▼
                                    material (persisted, editable)
                                          │
                         ┌────────────────┴────────────────┐
                         ▼                                 ▼
                 adaptive delivery                  fixed delivery
                 (BKT · SM-2 · ZPD)                 (assignment / exam)
                         └────────────────┬────────────────┘
                                          ▼
                              grade ──▶ answers rows ──▶ mastery ──▶ analytics
```

Rules carried over from both products:
- The LLM runs **only at ingest and generation**, never in the answer loop. Answering stays
  instant — that is Lattice's architectural commitment and it survives the merge.
- Every LLM output is parsed defensively (fenced JSON stripped), schema-validated with
  Pydantic, retried up to 3×, and falls back across configured models — Savitrix's pattern,
  which is the right one.
- Raw model output never becomes production data unvalidated, and is never logged in
  production (Savitrix's Groq client does log it; we will not).
- Provider-agnostic: the exam tier goes behind one `complete_json()` interface, so local
  Ollama, Groq, or Gemini are configuration.

---

## 9. Migration plan

Incremental, each step shippable, nothing deleted until its replacement carries traffic.

| Phase | Work | Regression guard |
|---|---|---|
| **1 Foundation** | SQLite + repositories; auth (scrypt + signed cookie); roles; invitations; persist the study loop; sources as first-class assets; **real YouTube transcripts**; role-aware shell | Legacy `/api/extract` + `/api/sessions*` kept as adapters; anonymous demo mode still works with no account; existing pages untouched |
| **2 Core AI** | `materials` table + generate/patch; unify quiz / notes / flashcards / summary under it; the Create flow; Library over real data; Assistant with context | Existing Quiz / Notes / Flashcards pages read materials instead of `localStorage` packs — same components |
| **3 Teacher** | Test generator + editor + PDF export; question bank; classes; assign | Student surfaces unaffected |
| **4 Student** | Join class; assigned work; attempts; results with explanations; progress | Practice loop unchanged |
| **5 Intelligence** | Teacher + student analytics from `answers`; weak-topic detection; recommended practice | Every number traceable to a row; empty states where there is no data |
| **6 Production** | Rate limits on auth + generation; central error handling; id validation; a11y pass; code-splitting (the 519 kB bundle wants it); deployment | Full pytest + build green |

**Non-negotiables while migrating**
1. The 20 existing pytest cases stay green; the engine modules (`embed` `ingest` `generate`
   `grade` `learner`) are not touched except to make their state persistable.
2. The design system is not re-skinned to Savitrix's coral/cream.
3. Nothing ships as mock data dressed as real. Placeholder surfaces are labelled.
4. `school_id` and ownership come from the session, never the request body.
5. No plaintext password is stored or returned, ever.

---

## 10. What is built, and what is not

Written after the first implementation pass, so nobody has to read the code to find out.

### Built and working end to end

- **Accounts and roles** — student, teacher, and school admin. scrypt passwords, HMAC-signed
  seven-day HTTP-only session cookies, stdlib only. Every protected route re-checks the
  session and the role server-side; the client guards are navigation, not authorisation.
- **Invitations** — single-use, expiring, stored only as a SHA-256 hash. The invitee sets
  their own password. **No password for another person exists in this system in readable
  form**, which is the specific defect the handoff flags as highest priority.
- **School registration** in one transaction, so a failed admin write cannot orphan a school.
- **Seat limits** that count outstanding invitations, so a seat cannot be double-booked.
- **Sources as reusable assets** — file (PDF, DOCX, PPTX, TXT), pasted text, and **real
  YouTube transcripts** read from the video's own caption track. Analysed once and cached, so
  the second thing generated from a document is instant.
- **Seven material kinds** from one flow: quiz, test paper, assignment, notes, flashcards,
  summary, lesson-plan scaffold. All grounded in the source, all persisted, all editable.
- **The Create flow** — one surface replacing what would have been six generator pages.
- **The test editor** — inline editing of stems, options, answers, explanations, marks and
  Bloom's; reorder, duplicate, delete; debounced autosave; print.
- **Question bank**, school-scoped, with questions promoted from a source with provenance.
- **Classes** with join codes, rosters, and email invitations.
- **Assignments and attempts** — resumable, graded per answer by the same grader the practice
  loop uses, with the answer key withheld until submission and attached for the review.
- **The adaptive loop, now persistent** — BKT, SM-2 and ZPD selection moved out of a dict on
  the worker into `study_states`/`concept_mastery`, per user. Progress now survives a restart,
  which is what makes it mean anything.
- **Real analytics**, teacher and student, computed only from recorded answers.
- **Role-aware shell** — sidebar, mobile nav, top bar and primary action all follow the role.
- **The anonymous demo is untouched.** No account, bundled material, original engine routes.

Verified: **52 pytest cases green** (the original 20 plus 32 new, most of them negative
authorisation tests), a clean production build, and the whole teacher → assign → student →
analytics loop walked in a browser.

### Deliberately not built yet — do not present these as working

- **PDF export.** Printing works; `@react-pdf/renderer` exam and answer-key documents do not
  exist. Savitrix's version of this is real and is the obvious next piece.
- **Undo/redo and drag-reorder** in the test editor. Reordering is arrow buttons today.
- **Multiple test versions** (1–3 non-duplicative papers with prior questions as exclusions).
- **Per-question regeneration.**
- **The LLM tier.** Everything generates from embeddings, so it needs no key and no network —
  which also means no Bloom's-tagged reasoning items and no written prose in a lesson plan.
  `build_lesson_plan` returns `scaffold: true` and the UI says so on the page.
- **The AI assistant** is still the retrieval tutor over a single pack; it has no context
  object and no role-dependent behaviour.
- **Password reset**, **email delivery** (invitation links are copied by hand), **billing**,
  **rate limiting**, **code-splitting** (the bundle is 627 kB).
- **`/app/learn` and the Settings screen** are pre-existing surfaces that were not part of
  this pass; Settings still does not persist.
