# evaluate_model_validity.py
# Task 3 / Stage C: validate each GENERATED Concerto model with the official ModelManager.
# Reuses Stage B outputs (results/model_generation_results.json) — no new API calls.

import json, os, subprocess, tempfile

# Where node can find @accordproject/concerto-core (bundled under the global concerto-cli):
NODE_PATH = os.path.expanduser(
    "~/.npm-global/lib/node_modules/@accordproject/concerto-cli/node_modules")
VALIDATOR = "scripts/validate_cto.js"


def clean(raw):
    """Strip markdown fences / language tags the model may have added."""
    if not raw:
        return ""
    t = raw.strip()
    if t.startswith("```"):
        t = t.strip("`")
        nl = t.find("\n")
        if nl != -1 and t[:nl].strip().lower() in ("cto", "concerto"):
            t = t[nl + 1:]
    return t.strip()


def validate(cto_text):
    with tempfile.NamedTemporaryFile("w", suffix=".cto", delete=False) as f:
        f.write(cto_text)
        path = f.name
    try:
        env = dict(os.environ, NODE_PATH=NODE_PATH)
        r = subprocess.run(["node", VALIDATOR, path],
                           capture_output=True, text=True, env=env)
        return r.returncode == 0, r.stdout.strip()
    finally:
        os.unlink(path)


with open("results/model_generation_results.json") as f:
    data = json.load(f)

details = data["details"]
valid_count = 0
out = []
for i, r in enumerate(details, 1):
    ok, msg = validate(clean(r["model_raw"]))
    valid_count += 1 if ok else 0
    out.append({"id": r["id"], "valid": ok, "message": msg})
    print(f"[{i}/{len(details)}] {r['id']}: {'VALID' if ok else 'INVALID'} — {msg[:70]}")

rate = valid_count / len(details) if details else 0
print(f"\nValidity: {valid_count}/{len(details)} generated models compile = {rate:.1%}")

with open("results/model_validity_results.json", "w") as f:
    json.dump({"model": data["model"], "valid": valid_count, "total": len(details),
               "validity_rate": rate, "details": out}, f, indent=2)
print("Saved -> results/model_validity_results.json")
