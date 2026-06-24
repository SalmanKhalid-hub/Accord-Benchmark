# generate_model_generation.py
# Task 3: build the model-generation dataset.
# Each question = a clause, with the template's gold Concerto model ({field: type}) as the answer.

import os
import json

TEMPLATES_DIR = "../cicero-template-library/src"
OUTPUT_FILE = "data/model_generation.json"

EXCLUDE = {"empty", "empty-contract", "helloworld", "helloworldstate", "hellomodule", "eat-apples"}
template_names = sorted(
    name for name in os.listdir(TEMPLATES_DIR)
    if os.path.isdir(os.path.join(TEMPLATES_DIR, name)) and name not in EXCLUDE
)


def read_clause_text(template_name):
    """Read the filled-in clause from sample.md, heading stripped (no answer leakage)."""
    sample_path = os.path.join(TEMPLATES_DIR, template_name, "text", "sample.md")
    if not os.path.exists(sample_path):
        return None
    with open(sample_path) as f:
        lines = f.readlines()
    body = [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]
    text = " ".join(body)
    return text if text else None


def find_template_cto(model_dir):
    """Find the .cto holding the @template model (skip imported @... models)."""
    if not os.path.isdir(model_dir):
        return None
    for fname in os.listdir(model_dir):
        if fname.endswith(".cto") and not fname.startswith("@"):
            path = os.path.join(model_dir, fname)
            with open(path) as f:
                if "@template" in f.read():
                    return path
    return None


def parse_types(template_name):
    """Extract {field: ConcertoType} from the @template block of a template's .cto."""
    path = find_template_cto(os.path.join(TEMPLATES_DIR, template_name, "model"))
    if path is None:
        return None
    with open(path) as f:
        text = f.read()
    idx = text.find("@template")
    block = text[idx:]
    start = block.find("{")
    end = block.find("}", start)
    body = block[start + 1:end]
    types = {}
    for line in body.splitlines():
        line = line.strip()
        if line.startswith("o ") or line.startswith("--> "):
            parts = line.split()
            if len(parts) >= 3:
                types[parts[2]] = parts[1]
    return types or None


# Build a model-generation question for each template that has BOTH a clause and a gold model.
questions = []
skipped = []
for name in template_names:
    text = read_clause_text(name)
    gold = parse_types(name)
    if text is None or gold is None:
        skipped.append(name)
        continue
    questions.append({
        "id": f"{name}-modelgen-01",
        "task": "model_generation",
        "input": text,
        "expected_output": gold,   # gold model: {field: ConcertoType}
    })

with open(OUTPUT_FILE, "w") as f:
    json.dump(questions, f, indent=2)

print(f"Generated {len(questions)} questions -> {OUTPUT_FILE}")
if skipped:
    print(f"Skipped {len(skipped)} templates (no clause text or no gold model): {skipped}")
