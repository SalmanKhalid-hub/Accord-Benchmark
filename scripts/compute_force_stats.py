# compute_force_stats.py
# Force-mode sub-study statistics: generate-and-run (gen) vs execute-directly (force),
# scored by oracle-agreement on the SAME canonical scenarios.
#
# AUTHORITATIVE SCORER: rescored here from the raw outputs stored in each scenario
# (o = oracle, g = gen, f = force) so the comparison policy lives in ONE place and can
# be changed without re-spending on the LLM. A scenario is scored only if it has a
# ground-truth oracle result (skipped/invalid-request/oracle_error scenarios are excluded).
#
# Two lenses, per model, with 95% Wilson CIs and a PAIRED McNemar test on the same scenarios:
#   - RESULT-ONLY : does the returned result object match the oracle?
#   - FULL        : result AND emitted events (the complete execution outcome)
# Comparison drops runtime/cosmetic fields ($timestamp, $identifier, description), rounds
# numbers (float noise), and is key-order independent.
import json, math, os
from scipy.stats import binomtest

MODELS = {"gemini": "Gemini 2.5 Flash", "claude": "Claude Haiku 4.5", "gpt": "GPT-5.4-mini"}
KEYS = list(MODELS)
HERE = os.path.dirname(__file__)
DROP = {"$timestamp", "$identifier", "description"}

def load(m):
    p = os.path.join(HERE, "..", "results", m, "force_compare_results.json")
    return json.load(open(p)) if os.path.exists(p) else None

def cmp_norm(o):
    if isinstance(o, list): return [cmp_norm(x) for x in o]
    if isinstance(o, dict): return {k: cmp_norm(v) for k, v in o.items() if k not in DROP}
    if isinstance(o, float): return round(o, 6)
    if isinstance(o, int): return round(float(o), 6)
    return o

def canon(o): return json.dumps(cmp_norm(o), sort_keys=True)

def match(oracle, arm, lens):
    if arm is None: return False                 # NOLOAD (gen) or executor error (force)
    if lens == "result":
        return canon(oracle.get("result")) == canon(arm.get("result"))
    return canon(oracle) == canon(arm)           # full: result + events

def wilson(k, n, z=1.96):
    if n == 0: return (0.0, 0.0)
    p = k/n; d = 1 + z*z/n
    c = (p + z*z/(2*n))/d
    h = (z*math.sqrt(p*(1-p)/n + z*z/(4*n*n)))/d
    return (max(0, c-h), min(1, c+h))

def pct(x): return f"{x*100:5.1f}%"
def verdict(p): return "SIGNIFICANT (p<0.05)" if p is not None and p < 0.05 else "not significant"

# scored scenarios only: those carrying an oracle outcome 'o'
def scored(data, kind):
    out = []
    for d in data["details"]:
        if kind == "stateless" and d["stateful"]: continue
        if kind == "stateful" and not d["stateful"]: continue
        for s in d.get("scen", []):
            if "o" not in s or s.get("o") is None: continue
            out.append(s)
    return out

def report(m, data):
    print(f"\n{'='*68}\n{MODELS[m]}  |  commit {data.get('template_library_commit','?')[:10]}\n{'='*68}")
    for lens in ["result", "full"]:
        title = "RESULT-ONLY (returned result matches)" if lens == "result" else "FULL OUTCOME (result + emitted events)"
        print(f"\n  ### {title} ###")
        for kind in ["all", "stateless", "stateful"]:
            ss = scored(data, kind)
            n = len(ss)
            if n == 0: continue
            pairs = [(match(s["o"], s.get("g"), lens), match(s["o"], s.get("f"), lens)) for s in ss]
            gk = sum(1 for g, f in pairs if g); fk = sum(1 for g, f in pairs if f)
            glo, ghi = wilson(gk, n); flo, fhi = wilson(fk, n)
            b = sum(1 for g, f in pairs if g and not f)   # gen right, force wrong
            c = sum(1 for g, f in pairs if f and not g)   # force right, gen wrong
            p = binomtest(min(b, c), b+c, 0.5).pvalue if (b+c) else 1.0
            print(f"    {kind.upper():<10} ({n} scen)  "
                  f"gen {pct(gk/n)} [{pct(glo)},{pct(ghi)}]  |  force {pct(fk/n)} [{pct(flo)},{pct(fhi)}]  "
                  f"|  McNemar b={b} c={c} p={p:.4f} ({verdict(p)})")

def pooled(all_data):
    print(f"\n{'='*68}\nPOOLED across models ({', '.join(MODELS[m] for m in all_data)})\n{'='*68}")
    for lens in ["result", "full"]:
        title = "RESULT-ONLY (returned result matches)" if lens == "result" else "FULL OUTCOME (result + emitted events)"
        print(f"\n  ### {title} ###")
        for kind in ["all", "stateless", "stateful"]:
            pairs = []
            for m, data in all_data.items():
                for s in scored(data, kind):
                    pairs.append((match(s["o"], s.get("g"), lens), match(s["o"], s.get("f"), lens)))
            n = len(pairs)
            if n == 0: continue
            gk = sum(1 for g, f in pairs if g); fk = sum(1 for g, f in pairs if f)
            glo, ghi = wilson(gk, n); flo, fhi = wilson(fk, n)
            b = sum(1 for g, f in pairs if g and not f)
            c = sum(1 for g, f in pairs if f and not g)
            p = binomtest(min(b, c), b+c, 0.5).pvalue if (b+c) else 1.0
            print(f"    {kind.upper():<10} ({n} scen)  "
                  f"gen {pct(gk/n)} [{pct(glo)},{pct(ghi)}]  |  force {pct(fk/n)} [{pct(flo)},{pct(fhi)}]  "
                  f"|  McNemar b={b} c={c} p={p:.4f} ({verdict(p)})")

print("="*68)
print("FORCE-MODE SUB-STUDY — generate-and-run (gen) vs execute-directly (force)")
print("Metric: oracle-agreement on canonical (sample.json, request*.json) scenarios")
print("="*68)
any_data = False
all_data = {}
for m in KEYS:
    data = load(m)
    if data is None:
        print(f"\n[{MODELS[m]}] no results yet (results/{m}/force_compare_results.json missing)")
        continue
    any_data = True
    all_data[m] = data
    report(m, data)
if len(all_data) > 1:
    pooled(all_data)
if any_data:
    print("\n" + "="*68)
    print("gen = LLM writes logic.ts, run deterministically | force = LLM computes each result")
    print("Paired McNemar (same scenarios) is the key test; b>c means gen beats force.")
    print("="*68)
