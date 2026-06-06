# validate_variable_extraction.py
# Phase 2: sanity-check the generated variable-extraction questions.

import json

with open("data/variable_extraction.json") as f:
    questions = json.load(f)

print(f"Total questions: {len(questions)}")

problems = []
ids_seen = set()
for q in questions:
    qid = q.get("id", "<no id>")
    # 1. required fields present
    for field in ("id", "task", "input", "expected_output"):
        if field not in q:
            problems.append(f"{qid}: missing field '{field}'")
    # 2. unique ids
    if qid in ids_seen:
        problems.append(f"{qid}: duplicate id")
    ids_seen.add(qid)
    # 3. input not empty
    if not q.get("input", "").strip():
        problems.append(f"{qid}: empty input")
    # 4. expected_output must be a non-empty object (at least one variable)
    eo = q.get("expected_output")
    if not isinstance(eo, dict) or len(eo) == 0:
        problems.append(f"{qid}: expected_output is not a non-empty object")

if problems:
    print(f"\n⚠️  Found {len(problems)} issue(s):")
    for p in problems:
        print("  -", p)
else:
    print("✅ All questions passed the structural checks.")

# Eyeball one example
print("\n--- Example question (read this) ---")
print(json.dumps(questions[0], indent=2))
