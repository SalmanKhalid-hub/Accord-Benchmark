# generate_variable_extraction.py
# Phase 2 Task 2: generate variable-extraction questions from all templates.

import os
import json
from urllib.parse import unquote


TEMPLATES_DIRS = ["../cicero-template-library/src", "synthetic-templates/src"]
OUTPUT_FILE = "data/variable_extraction.json"

def dir_of(name):
    for d in TEMPLATES_DIRS:
        if os.path.isdir(os.path.join(d, name)):
            return d
    return TEMPLATES_DIRS[0]

# Same demos/joke templates excluded as in classification.
EXCLUDE = {"empty", "empty-contract", "helloworld", "helloworldstate", "hellomodule", "eat-apples"}

template_names = sorted(set(
    name
    for d in TEMPLATES_DIRS if os.path.isdir(d)
    for name in os.listdir(d)
    if os.path.isdir(os.path.join(d, name)) and name not in EXCLUDE
))

def read_clause_text(template_name):
    """The clause text from sample.md, heading stripped (same as classification)."""
    sample_path = os.path.join(dir_of(template_name), template_name, "text", "sample.md")
    if not os.path.exists(sample_path):
        return None
    with open(sample_path) as f:
        lines = f.readlines()
    body = [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]
    text = " ".join(body)
    return text if text else None

def strip_metadata(obj):
    """Recursively drop Concerto metadata: keys starting with '$', and 'clauseId'."""
    if isinstance(obj, dict):
        return {k: strip_metadata(v) for k, v in obj.items()
                if not k.startswith("$") and k != "clauseId"}
    if isinstance(obj, list):
        return [strip_metadata(item) for item in obj]
    return obj

def clean_values(obj):
    """Turn Concerto resource references into readable names, recursively.
    e.g. 'resource:...#Party%20A' -> 'Party A'."""
    if isinstance(obj, str) and obj.startswith("resource:"):
        return unquote(obj.split("#")[-1]) if "#" in obj else obj
    if isinstance(obj, dict):
        return {k: clean_values(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_values(item) for item in obj]
    return obj


def read_variables(template_name):
    """The filled-in variables from sample.json, cleaned of metadata."""
    sample_path = os.path.join(dir_of(template_name), template_name, "sample.json")
    if not os.path.exists(sample_path):
        return None
    with open(sample_path) as f:
        data = json.load(f)
    variables = clean_values(strip_metadata(data))

    return variables if variables else None

# Build a variable-extraction question per template.
questions = []
skipped = []
for name in template_names:
    text = read_clause_text(name)
    variables = read_variables(name)
    if text is None or variables is None:
        skipped.append(name)
        continue
    questions.append({
        "id": f"{name}-extract-01",
        "task": "variable_extraction",
        "input": text,
        "expected_output": variables,   # a structured object, not a single label
    })

with open(OUTPUT_FILE, "w") as f:
    json.dump(questions, f, indent=2)

print(f"Generated {len(questions)} questions -> {OUTPUT_FILE}")
if skipped:
    print(f"Skipped {len(skipped)} templates (missing text or variables): {skipped}")
