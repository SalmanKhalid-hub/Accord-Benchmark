# validate_type_mapping.py — sanity-check the generated type-mapping questions.

import json

with open("data/type_mapping.json") as f:
    questions = json.load(f)

print(f"Total questions: {len(questions)}")

problems = []
ids_seen = set()
for q in questions:
    qid = q.get("id", "<no id>")
    for field in ("id", "task", "input", "variables", "expected_output"):
        if field not in q:
            problems.append(f"{qid}: missing field '{field}'")
    if qid in ids_seen:
        problems.append(f"{qid}: duplicate id")
    ids_seen.add(qid)
    if not q.get("input", "").strip():
        problems.append(f"{qid}: empty input")
    eo = q.get("expected_output")
    if not isinstance(eo, dict) or len(eo) == 0:
        problems.append(f"{qid}: expected_output is not a non-empty object")
    # the variable list should match the keys of the type map
    if set(q.get("variables", [])) != set(q.get("expected_output", {}).keys()):
        problems.append(f"{qid}: variables don't match expected_output keys")

if problems:
    print(f"\n⚠️  Found {len(problems)} issue(s):")
    for p in problems:
        print("  -", p)
else:
    print("✅ All questions passed the structural checks.")

print("\n--- Example question ---")
print(json.dumps(questions[0], indent=2))
