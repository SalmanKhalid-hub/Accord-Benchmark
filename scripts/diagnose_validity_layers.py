# diagnose_validity_layers.py
# Reproduces the §4.2 layered failure analysis for a model's generated Concerto models.
# It takes the SAVED Stage-B outputs (no API calls) and, in memory, strips one error layer
# at a time and re-validates with the same ModelManager, resolving the "0% valid" headline
# into a hierarchy of surface errors:
#   layer 0  raw                       -> valid?
#   layer 1  strip trailing semicolons -> valid?   (Java/TS habit)
#   layer 2  + auto-version namespace  -> valid?   (Concerto needs name@1.0.0)
#   residual failures are bucketed by the validator's message (typically richer types used
#   without an import).
#   MODEL=gemini python3.13 scripts/diagnose_validity_layers.py
import json, os, re, subprocess, tempfile

MODEL = os.environ.get("MODEL", "gemini")
NODE_PATH = os.path.expanduser("~/.npm-global/lib/node_modules/@accordproject/concerto-cli/node_modules")
VALIDATOR = os.path.join(os.path.dirname(__file__), "validate_cto.js")

def clean(raw):
    if not raw: return ""
    t = raw.strip()
    if t.startswith("```"):
        t = t.strip("`"); nl = t.find("\n")
        if nl != -1 and t[:nl].strip().lower() in ("cto", "concerto"): t = t[nl+1:]
    return t.strip()

def validate(cto):
    with tempfile.NamedTemporaryFile("w", suffix=".cto", delete=False) as f:
        f.write(cto); path = f.name
    try:
        r = subprocess.run(["node", VALIDATOR, path], capture_output=True, text=True,
                           env=dict(os.environ, NODE_PATH=NODE_PATH))
        return r.returncode == 0, (r.stdout + r.stderr).strip()
    finally:
        os.unlink(path)

def strip_semicolons(t):                                  # `o String x;` -> `o String x`
    return "\n".join(re.sub(r";\s*$", "", ln) for ln in t.split("\n"))
def has_semicolons(t):
    return any(re.search(r";\s*$", ln) for ln in t.split("\n"))
def version_namespace(t):                                 # `namespace foo` -> `namespace foo@1.0.0`
    return re.sub(r"^(namespace\s+[\w.]+)\s*$", r"\1@1.0.0", t, flags=re.M)

def bucket(msg):
    if "unversioned namespace" in msg: return "unversioned namespace"
    if "Undeclared type" in msg: return "type used without import"
    if "Expected" in msg or "found" in msg: return "syntax"
    return "other"

HERE = os.path.dirname(__file__)
details = json.load(open(os.path.join(HERE, "..", "results", MODEL, "model_generation_results.json")))["details"]
# §4.2 is about the REAL 51 only — filter to the frozen-baseline ids (results also hold the 89 synthetic)
real_ids = {it["id"] for it in json.load(open(os.path.join(HERE, "..", "data_baseline_51", "model_generation.json")))}
details = [d for d in details if d["id"] in real_ids]
n = len(details)
raw_valid = semi = nosemi_valid = ns_fail_L1 = ver_valid = 0
residual = {}
for r in details:
    t = clean(r["model_raw"])
    if has_semicolons(t): semi += 1
    if validate(t)[0]: raw_valid += 1
    t1 = strip_semicolons(t)
    ok1, msg1 = validate(t1)
    if ok1: nosemi_valid += 1
    elif "unversioned namespace" in msg1: ns_fail_L1 += 1     # blocked specifically on the namespace
    t2 = version_namespace(t1)
    ok2, msg2 = validate(t2)
    if ok2: ver_valid += 1
    else: residual[bucket(msg2)] = residual.get(bucket(msg2), 0) + 1

print(f"=== §4.2 validity-layer diagnostic | model={MODEL} | {n} templates ===")
print(f"outputs with trailing semicolons          : {semi}/{n}")
print(f"layer 0  raw                       valid  : {raw_valid}/{n}")
print(f"layer 1  strip semicolons          valid  : {nosemi_valid}/{n}   (of the failures, {ns_fail_L1}/{n} blocked on the unversioned namespace)")
print(f"layer 2  + auto-version namespace   valid  : {ver_valid}/{n} = {ver_valid/n:.1%}")
print(f"residual failures by cause: {residual}")
