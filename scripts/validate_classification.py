# validate_classification.py
# Phase 2: sanity-check the generated clause-classification questions.

import json

with open("data/clause_classification.json") as f:
    questions = json.load(f)

print(f"Total questions: {len(questions)}")

problems = []
ids_seen = set()
for q in questions:
    qid = q.get("id", "<no id>")
    # 1. all five fields present
    for field in ("id", "task", "input", "labels", "expected_output"):
        if field not in q:
            problems.append(f"{qid}: missing field '{field}'")
    # 2. ids are unique
    if qid in ids_seen:
        problems.append(f"{qid}: duplicate id")
    ids_seen.add(qid)
    # 3. the correct answer is actually one of the choices
    if q.get("expected_output") not in q.get("labels", []):
        problems.append(f"{qid}: correct answer not in the label list")
    # 4. input isn't empty
    if not q.get("input", "").strip():
        problems.append(f"{qid}: empty input")

if problems:
    print(f"\n⚠️  Found {len(problems)} issue(s):")
    for p in problems:
        print("  -", p)
else:
    print("✅ All questions passed the structural checks.")

# Eyeball one full example — check the clause text and label look right.
print("\n--- Example question (read this) ---")
print(json.dumps(questions[0], indent=2))
