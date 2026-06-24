# generate_type_mapping.py
# Phase 3 bridge between task 2 and 3: generate TYPE-MAPPING questions — for each variable, its Concerto type (from the .cto model).

import os
import json

TEMPLATES_DIR = "../cicero-template-library/src"
OUTPUT_FILE = "data/type_mapping.json"

EXCLUDE = {"empty", "empty-contract", "helloworld", "helloworldstate", "hellomodule", "eat-apples"}

template_names = sorted(
    name for name in os.listdir(TEMPLATES_DIR)
    if os.path.isdir(os.path.join(TEMPLATES_DIR, name)) and name not in EXCLUDE
)

def read_clause_text(template_name):
    sample_path = os.path.join(TEMPLATES_DIR, template_name, "text", "sample.md")
    if not os.path.exists(sample_path):
        return None
    with open(sample_path) as f:
        lines = f.readlines()
    body = [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]
    text = " ".join(body)
    return text if text else None

def find_template_cto(model_dir):
    """Find the main .cto (not an imported @-prefixed one) that holds the @template model."""
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
    """Parse the template's .cto -> {fieldName: ConcertoType}."""
    path = find_template_cto(os.path.join(TEMPLATES_DIR, template_name, "model"))
    if path is None:
        return None
    with open(path) as f:
        text = f.read()
    idx = text.find("@template")
    if idx == -1:
        return None
    block = text[idx:]
    start = block.find("{")
    end = block.find("}", start)
    body = block[start + 1:end]
    types = {}
    for line in body.splitlines():
        line = line.strip()
        if line.startswith("o ") or line.startswith("--> "):  # 'o' = property, '-->' = relationship
            parts = line.split()
            if len(parts) >= 3:
                types[parts[2]] = parts[1]   # fieldName -> Type
    return types or None

# Build a type-mapping question per template.
questions = []
skipped = []
for name in template_names:
    text = read_clause_text(name)
    types = parse_types(name)
    if text is None or types is None:
        skipped.append(name)
        continue
    questions.append({
        "id": f"{name}-typemap-01",
        "task": "type_mapping",
        "input": text,
        "variables": list(types.keys()),    # the variable names to assign types to
        "expected_output": types,           # {fieldName: ConcertoType}  <- the gold, from the .cto
    })

with open(OUTPUT_FILE, "w") as f:
    json.dump(questions, f, indent=2)

print(f"Generated {len(questions)} questions -> {OUTPUT_FILE}")
if skipped:
    print(f"Skipped {len(skipped)} templates (no clause text or no .cto types): {skipped}")
