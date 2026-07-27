# run_logic_synthesis.py
# Task 4 (logic synthesis) — automated generate -> swap -> test -> score loop.
#
# For each qualifying template (stateless, has logic.ts + logic.test.ts, not a demo):
#   1. generate a logic.ts from the clause + Concerto model (LLM)
#   2. back up the real logic.ts, swap the generated one in
#   3. run the template's unit tests (npm test)
#   4. record: did it LOAD (run at all)?  how many tests PASSED / total?
#   5. always restore the real logic.ts
#
# Records two levels per template:  loaded  (the convention/compile level, like Task 3 validity)
#                                   passed/total  (the behaviour level)
#
# Run from the Accord-Benchmark folder (so .env is found):
#   BENCH_MODEL=anthropic/claude-haiku-4.5 python3 scripts/run_logic_synthesis.py
#   (set LIMIT=3 to try a few templates first)
import os, re, glob, json, shutil, subprocess, time
from dotenv import load_dotenv
from openai import OpenAI

TASK4 = "/Users/salman/Documents/TAP x Docusign/cicero-template-library-task4"
SRC = os.path.join(TASK4, "src")
MODEL = os.environ.get("BENCH_MODEL", "anthropic/claude-haiku-4.5")
LIMIT = int(os.environ["LIMIT"]) if os.environ.get("LIMIT") else None
DEMOS = {"empty", "empty-contract", "hellomodule", "helloworld", "helloworldstate", "eat-apples"}

MODEL_DIR = {"google/gemini-2.5-flash": "gemini", "anthropic/claude-haiku-4.5": "claude",
             "openai/gpt-5.4-mini": "gpt"}.get(MODEL, MODEL.split("/")[-1])

load_dotenv()
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])

def pin_commit():
    try:
        return subprocess.check_output(["git", "-C", TASK4, "rev-parse", "HEAD"], text=True).strip()
    except Exception:
        return "unknown"

# ---------- discover qualifying templates ----------
def is_stateful(name):
    return bool(re.search(r"async\s+init\s*\(", open(os.path.join(SRC, name, "logic", "logic.ts")).read()))

def qualifying():
    out = []
    for name in sorted(os.listdir(SRC)):
        d = os.path.join(SRC, name)
        logic = os.path.join(d, "logic", "logic.ts")
        test = os.path.join(d, "logic", "logic.test.ts")
        if name in DEMOS or not (os.path.exists(logic) and os.path.exists(test)):
            continue
        if re.search(r"describe\.skip|it\.skip|\.skip\(", open(test).read()):  # tests disabled -> can't score
            continue
        out.append(name)          # stateless AND stateful (the state convention is taught in the prompt)
    return out

# ---------- read a template's clause + main Concerto model ----------
def read_inputs(name):
    d = os.path.join(SRC, name)
    clause = open(os.path.join(d, "text", "sample.md")).read().strip()
    cto = ""
    for path in glob.glob(os.path.join(d, "model", "*.cto")):
        txt = open(path).read()
        if "@template" in txt:
            cto = txt
            break
    return clause, cto

def types_of(cto):
    ns = re.search(r"namespace\s+(\S+)", cto)
    req = re.search(r"transaction\s+(\w+)\s+extends\s+Request", cto)
    resp = re.search(r"transaction\s+(\w+)\s+extends\s+Response", cto)
    return (ns.group(1) if ns else "unknown",
            req.group(1) if req else "Request",
            resp.group(1) if resp else "Response")

# ---------- the generation prompt (conventions provided; money + state handled) ----------
def prompt_for(name, clause, cto):
    ns, req, resp = types_of(cto)
    stateful = is_stateful(name)
    if stateful:
        shape = f"""- This template is STATEFUL — it has a lifecycle whose state changes across triggers.
- `extends TemplateLogic<ITemplateModel, I<StateType>>` (the state type is the concept/asset in the
  model that extends `State`). `EngineResponse` and `InitResponse` are GLOBAL runtime types — do NOT import them.
- Implement `async init(data: ITemplateModel): Promise<InitResponse<I<StateType>>>` returning
  `{{ state: {{ $class: '<state fqn>', $identifier: data.$identifier, status: <the initial status> }} }}`.
- Implement `async trigger(data, request, state)` returning `{{ result: {{...}}, state: {{...NEW state...}}, events: [ ... ] }}`.
- The request may be one of SEVERAL transaction types — branch on `request.$class`.
- Enforce the state machine: read `state.status`, THROW an Error on an illegal transition, set the correct
  new `status` on success, and emit the right events. INFER the states, transitions and events from the clause."""
    else:
        shape = f"""- `extends TemplateLogic<ITemplateModel>` and `default export` it.
- Implement `async trigger(data: ITemplateModel, request: I{req}): Promise<{{ result: I{resp} }}>`.
- Return `{{ result: {{ $class: '{ns}.{resp}', $timestamp: <a Date>, ...responseFields }} }}`."""
    return f"""You are an expert in the Accord Project's smart legal contract framework.
Write the TypeScript logic file (`logic.ts`) that implements the executable logic for the
clause below, following the Accord Project convention EXACTLY.

CONVENTION you MUST follow:
- Import the needed TYPES from `./generated/{ns}` (type names are the Concerto declarations
  prefixed with `I`, e.g. `ITemplateModel`, `I{req}`, `I{resp}`).
- `TemplateLogic` is a GLOBAL base class injected by the runtime — do NOT import it, and do NOT name
  your own class `TemplateLogic`. Give your class a distinct descriptive name (e.g. `<Something>Logic`),
  put `// @ts-ignore` on the class line, and `default export` it.
{shape}
- Concerto DateTime values are JavaScript `Date` objects, never strings. Use `new Date()` for
  `$timestamp` — do NOT call `.toISOString()`.
- Monetary amounts are objects: read via `.doubleValue` and `.currencyCode`; build one as
  `{{ $class: 'org.accordproject.money@0.3.0.MonetaryAmount', doubleValue: <num>, currencyCode: <code> }}`.
  Import `CurrencyCode` from `./generated/org.accordproject.money@0.3.0` if you need a currency literal.
- Any other Accord object type follows the same `{{ $class: '<fqn>', ...fields }}` shape.
- Output ONLY the TypeScript code. No markdown fences, no explanation.

The data model (Concerto):
{cto}

The clause:
{clause}
"""

def ask(prompt, retries=4):
    for i in range(retries):
        try:
            r = client.chat.completions.create(model=MODEL, temperature=0,
                                               messages=[{"role": "user", "content": prompt}])
            return r.choices[0].message.content.strip()
        except Exception:
            if i < retries - 1:
                time.sleep(5 * (i + 1))
    return None

def clean_code(code):
    if not code:
        return ""
    if code.startswith("```"):
        code = re.sub(r"^```[a-zA-Z]*\n", "", code)
        code = re.sub(r"\n```\s*$", "", code)
    return code.strip()

# ---------- run a template's unit tests, parse the result ----------
def run_tests(name, timeout=180):
    try:
        env = dict(os.environ, NO_COLOR="1", FORCE_COLOR="0")   # disable colour so parsing is clean
        r = subprocess.run(["npm", "test"], cwd=os.path.join(SRC, name),
                           capture_output=True, text=True, timeout=timeout, env=env)
        return r.stdout + "\n" + r.stderr
    except subprocess.TimeoutExpired:
        return "TIMEOUT"

def parse(output, expected_total):
    if output == "TIMEOUT":
        return dict(loaded=False, passed=0, total=expected_total, note="timeout")
    output = re.sub(r"\x1b\[[0-9;]*m", "", output)      # strip any ANSI colour codes
    m = re.search(r"^\s*Tests\s+(.+)$", output, re.M)   # the 'Tests' summary line
    if not m or "no tests" in m.group(1):
        return dict(loaded=False, passed=0, total=expected_total, note="did not load")
    line = m.group(1)
    pm = re.search(r"(\d+)\s+passed", line)
    tm = re.search(r"\((\d+)\)", line)
    return dict(loaded=True, passed=int(pm.group(1)) if pm else 0,
                total=int(tm.group(1)) if tm else expected_total, note="ran")

# ---------- main loop ----------
templates = qualifying()
if os.environ.get("STATEFUL_ONLY"):
    templates = [t for t in templates if is_stateful(t)]        # run just the stateful ones
if os.environ.get("STATELESS_ONLY"):
    templates = [t for t in templates if not is_stateful(t)]
if LIMIT:
    templates = templates[:LIMIT]

gen_dir = os.path.join("results", MODEL_DIR, "logic_gen")
os.makedirs(gen_dir, exist_ok=True)
commit = pin_commit()
results = []
print(f"=== Task 4 logic synthesis | model={MODEL} | {len(templates)} templates | commit {commit[:10]} ===\n")

for i, name in enumerate(templates, 1):
    d = os.path.join(SRC, name)
    logic_path = os.path.join(d, "logic", "logic.ts")
    backup = logic_path + ".oracle"
    expected_total = len(re.findall(r"\bit\(", open(os.path.join(d, "logic", "logic.test.ts")).read()))

    clause, cto = read_inputs(name)
    code = clean_code(ask(prompt_for(name, clause, cto)))
    with open(os.path.join(gen_dir, f"{name}.ts"), "w") as f:   # archive the generated logic
        f.write(code + "\n")

    res = dict(id=name, stateful=is_stateful(name), expected_total=expected_total)
    if not code:
        res.update(loaded=False, passed=0, total=expected_total, note="generation failed")
    else:
        shutil.copy(logic_path, backup)                          # back up the real logic
        try:
            with open(logic_path, "w") as f:
                f.write(code + "\n")
            res.update(parse(run_tests(name), expected_total))
        finally:
            shutil.move(backup, logic_path)                      # always restore
    results.append(res)
    p, t, ld = res["passed"], res["total"], res["loaded"]
    print(f"[{i}/{len(templates)}] {name:<42} {'LOADED ' if ld else 'NOLOAD '} {p}/{t}")

# ---------- MERGE into existing results (so a subset run appends, not overwrites) + save ----------
os.makedirs(os.path.join("results", MODEL_DIR), exist_ok=True)
path = os.path.join("results", MODEL_DIR, "logic_synthesis_results.json")
merged = {}
if os.path.exists(path):
    for d in json.load(open(path)).get("details", []):
        d.setdefault("stateful", is_stateful(d["id"]))          # backfill flag on older entries
        merged[d["id"]] = d
for d in results:
    merged[d["id"]] = d                                         # new results overwrite same-id old ones
details = sorted(merged.values(), key=lambda d: d["id"])

n = len(details)
loaded = sum(1 for r in details if r["loaded"])
tot_pass = sum(r["passed"] for r in details)
tot_tests = sum(r["total"] for r in details)
print(f"\n=== {MODEL} (merged corpus) ===")
print(f"Loaded (ran at all): {loaded}/{n} = {loaded/n:.1%}")
print(f"Unit-test pass rate:  {tot_pass}/{tot_tests} = {tot_pass/tot_tests:.1%}")

with open(path, "w") as f:
    json.dump({"model": MODEL, "template_library_commit": commit,
               "n_templates": n, "loaded": loaded,
               "total_passed": tot_pass, "total_tests": tot_tests,
               "details": details}, f, indent=2)
print(f"Saved -> results/{MODEL_DIR}/logic_synthesis_results.json  ({n} templates)")
print(f"Generated logic archived -> results/{MODEL_DIR}/logic_gen/")
