"""Prove the whole loop from the terminal, no UI required.

    uv run python scripts/demo.py data/linear_algebra.txt            # simulated student
    uv run python scripts/demo.py data/linear_algebra.txt --play     # answer it yourself
    uv run python scripts/demo.py data/linear_algebra.txt --llm      # + qwen3 reasoning tier
"""
from __future__ import annotations

import argparse
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from backend.generate import generate_bank, ollama  # noqa: E402
from backend.grade import grade  # noqa: E402
from backend.ingest import build_dag, extract_concepts  # noqa: E402
from backend.learner import Mastery, record, select_question  # noqa: E402


def bar(p: float, width: int = 20) -> str:
    filled = round(p * width)
    return "#" * filled + "." * (width - filled)


def show_map(concepts, mastery, header):
    print(f"\n=== {header} ===")
    for i, c in sorted(enumerate(concepts), key=lambda kv: -mastery[kv[0]].p_known):
        print(f"  {bar(mastery[i].p_known)} {mastery[i].p_known:.2f}  {c.name}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", type=pathlib.Path)
    ap.add_argument("--concepts", type=int, default=16)
    ap.add_argument("--turns", type=int, default=40)
    ap.add_argument("--play", action="store_true")
    ap.add_argument("--llm", action="store_true")
    args = ap.parse_args()

    text = args.path.read_text()
    print("extracting concepts...")
    concepts = extract_concepts(text, k=args.concepts)
    edges = build_dag(concepts)
    print(f"  {len(concepts)} concepts, {len(edges)} prerequisite edges")
    for a, b, sim in edges[:12]:
        print(f"    {concepts[a].name}  ->  {concepts[b].name}   ({sim:.2f})")

    print("generating questions..." + (" (qwen3, this takes a minute)" if args.llm else ""))
    bank = generate_bank(concepts, llm=ollama if args.llm else None)
    kinds = {k: sum(q.kind == k for q in bank) for k in ("mcq", "free", "reasoning")}
    print(f"  {len(bank)} questions {kinds}")
    if not bank:
        print("no questions generated -- material too short?")
        return 1

    mastery = {i: Mastery() for i in range(len(concepts))}
    show_map(concepts, mastery, "mastery before")

    # A simulated student who genuinely knows some concepts and not others.
    rng = random.Random(7)
    truth = {i: rng.choice([0.9, 0.85, 0.2, 0.15]) for i in range(len(concepts))}

    # One session happens on one day. SM-2 intervals are in days, so passing the turn
    # counter here would mark every concept due again on the next question and starve out
    # all new material -- reviews are for the *next* session, not this one.
    today = 0
    for turn in range(args.turns):
        q = select_question(concepts, edges, mastery, bank, today=today)
        if q is None:
            print(f"\nall concepts mastered after {turn} questions")
            break
        if args.play:
            print(f"\n[{q.kind}] {q.stem}")
            if q.options:
                shuffled = sorted(q.options, key=lambda o: rng.random())
                for n, opt in enumerate(shuffled):
                    print(f"   {n + 1}. {opt}")
                raw = input("   answer #> ").strip()
                response = shuffled[int(raw) - 1] if raw.isdigit() and 0 < int(raw) <= len(shuffled) else ""
            else:
                response = input("   > ").strip()
            correct, score, ideal = grade(q, response)
            print(f"   {'correct' if correct else 'not quite'} ({score:.2f}).  {ideal[:110]}")
        else:
            correct = rng.random() < truth[q.concept]
        record(mastery[q.concept], q.id, correct, today=today)

    show_map(concepts, mastery, "mastery after")
    if not args.play:
        # Only concepts the student was actually asked about -- untouched ones sit at the
        # prior by definition and say nothing about whether the model works.
        practiced = [i for i in mastery if mastery[i].seen]
        hits = [i for i in practiced if (mastery[i].p_known > 0.5) == (truth[i] > 0.5)]
        print(
            f"\nBKT recovered the simulated student on {len(hits)}/{len(practiced)} "
            f"concepts it actually practiced ({len(mastery) - len(practiced)} never reached)"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
