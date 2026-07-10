# generate_classification.py
# Phase 2: automatically generate clause-classification questions from ALL templates.

import os
import json

TEMPLATES_DIRS = ["../cicero-template-library/src", "synthetic-templates/src"]
OUTPUT_FILE = "data/clause_classification.json"

def dir_of(name):
    for d in TEMPLATES_DIRS:
        if os.path.isdir(os.path.join(d, name)):
            return d
    return TEMPLATES_DIRS[0]

# Framework demos / joke templates — not real legal clauses, so exclude them.
EXCLUDE = {"empty", "empty-contract", "helloworld", "helloworldstate", "hellomodule", "eat-apples"}
template_names = sorted(set(
    name
    for d in TEMPLATES_DIRS if os.path.isdir(d)
    for name in os.listdir(d)
    if os.path.isdir(os.path.join(d, name)) and name not in EXCLUDE
))


def read_clause_text(template_name):
    """Read the filled-in clause from a template's sample.md, with the heading stripped."""
    sample_path = os.path.join(dir_of(template_name), template_name, "text", "sample.md")
    if not os.path.exists(sample_path):
        return None  # no sample text -> can't make a question
    with open(sample_path) as f:
        lines = f.readlines()
    # Drop heading lines (start with "#") to avoid leaking the answer, and blank lines.
    body = [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]
    text = " ".join(body)
    return text if text else None

# 2. Build a classification question for each template.
questions = []
skipped = []
for name in template_names:
    text = read_clause_text(name)
    if text is None:
        skipped.append(name)
        continue
    questions.append({
        "id": f"{name}-classify-01",
        "task": "clause_classification",
        "input": text,
        "labels": template_names,      # the full list of categories to choose from
        "expected_output": name,       # the correct label = the folder name
    })

# 3. Save all questions to one JSON file.
with open(OUTPUT_FILE, "w") as f:
    json.dump(questions, f, indent=2)

print(f"Generated {len(questions)} questions -> {OUTPUT_FILE}")
if skipped:
    print(f"Skipped {len(skipped)} templates (no sample text): {skipped}")

