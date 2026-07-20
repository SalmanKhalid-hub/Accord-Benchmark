# backfill_provenance.py
# Stamp the pinned template-library commit into existing results files that were
# written before the provenance line was added. No re-run, no API calls: these
# results were generated against the same pinned commit (the clone was on that
# main HEAD), so the stamp is accurate.
import json, os
from provenance import template_library_commit

SHA = template_library_commit()
HERE = os.path.dirname(__file__)
count = 0
for model in ("gemini", "claude", "gpt"):
    d = os.path.join(HERE, "..", "results", model)
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".json"):
            continue
        path = os.path.join(d, fn)
        with open(path) as f:
            obj = json.load(f)
        if isinstance(obj, dict) and "template_library_commit" not in obj:
            obj["template_library_commit"] = SHA
            with open(path, "w") as f:
                json.dump(obj, f, indent=2)
            count += 1
print(f"Stamped {count} result files with commit {SHA[:10]}")
