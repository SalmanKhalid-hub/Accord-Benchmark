# compute_logic_stats.py
# Task 4 (logic synthesis) statistics across the three models, SPLIT stateless vs stateful.
# Reads results/{gemini,claude,gpt}/logic_synthesis_results.json (NO API calls).
# Reports, with 95% Wilson CIs and paired significance on the same templates:
#   - Loadability  (did the generated logic RUN at all — the convention/compile level)
#   - Unit-test pass rate  (of the tests, how many the logic passes — the behaviour level)
# ...for ALL templates, for STATELESS only, and for STATEFUL only.
import json, math, os
from scipy.stats import binomtest, wilcoxon

MODELS = {"gemini": "Gemini 2.5 Flash", "claude": "Claude Haiku 4.5", "gpt": "GPT-5.4-mini"}
KEYS = list(MODELS)
PAIRS = [("gemini", "claude"), ("gemini", "gpt"), ("claude", "gpt")]
HERE = os.path.dirname(__file__)

def load(m):
    with open(os.path.join(HERE, "..", "results", m, "logic_synthesis_results.json")) as f:
        return json.load(f)

def wilson(k, n, z=1.96):
    if n == 0: return (0.0, 0.0)
    p = k/n; d = 1 + z*z/n
    c = (p + z*z/(2*n))/d
    h = (z*math.sqrt(p*(1-p)/n + z*z/(4*n*n)))/d
    return (max(0, c-h), min(1, c+h))

def pct(x): return f"{x*100:5.1f}%"
def verdict(p): return "SIGNIFICANT (p<0.05)" if p is not None and p < 0.05 else "not significant"

data = {m: load(m) for m in KEYS}
commit = data[KEYS[0]].get("template_library_commit", "unknown")

def subset(m, kind):   # kind: 'all' | 'stateless' | 'stateful'
    ds = data[m]["details"]
    if kind == "stateless": ds = [d for d in ds if not d.get("stateful")]
    if kind == "stateful":  ds = [d for d in ds if d.get("stateful")]
    return ds

def rates(kind):
    print(f"\n### {kind.upper()} ({len(subset(KEYS[0], kind))} templates) ###")
    print("  Loadability (ran at all):")
    for m in KEYS:
        ds = subset(m, kind); k = sum(1 for d in ds if d["loaded"]); n = len(ds)
        lo, hi = wilson(k, n); print(f"    {MODELS[m]:<18} {pct(k/n)} [{pct(lo)},{pct(hi)}]  ({k}/{n})")
    print("  Unit-test pass rate:")
    for m in KEYS:
        ds = subset(m, kind); k = sum(d["passed"] for d in ds); n = sum(d["total"] for d in ds)
        lo, hi = wilson(k, n); print(f"    {MODELS[m]:<18} {pct(k/n)} [{pct(lo)},{pct(hi)}]  ({k}/{n})")

def mcnemar(a, b):
    ids = set(a) & set(b)
    nb = sum(1 for i in ids if a[i] and not b[i]); nc = sum(1 for i in ids if b[i] and not a[i])
    if nb + nc == 0: return 1.0
    return binomtest(min(nb, nc), nb+nc, 0.5).pvalue

def wilcoxon_pair(pa, pb):
    ids = sorted(set(pa) & set(pb))
    if all(pa[i] == pb[i] for i in ids): return None
    try: return wilcoxon([pa[i] for i in ids], [pb[i] for i in ids]).pvalue
    except ValueError: return None

def sig(kind):
    loaded = {m: {d["id"]: int(d["loaded"]) for d in subset(m, kind)} for m in KEYS}
    pp = {m: {d["id"]: (d["passed"]/d["total"] if d["total"] else 0.0) for d in subset(m, kind)} for m in KEYS}
    print(f"\n  Loadability significance (McNemar), {kind}:")
    for a, b in PAIRS:
        p = mcnemar(loaded[a], loaded[b]); print(f"    {a} vs {b}: p={p:.4f}  ({verdict(p)})")
    print(f"  Pass-rate significance (Wilcoxon), {kind}:")
    for a, b in PAIRS:
        p = wilcoxon_pair(pp[a], pp[b])
        print(f"    {a} vs {b}: {'all tied' if p is None else f'p={p:.4f}  ({verdict(p)})'}")

print("=" * 70)
print("TASK 4 — LOGIC SYNTHESIS — STATISTICS (stateless vs stateful)")
print(f"Models: {', '.join(MODELS.values())} | commit {commit[:10]}")
print("=" * 70)

for kind in ["all", "stateless", "stateful"]:
    rates(kind)

print("\n" + "=" * 70)
print("SIGNIFICANCE")
print("=" * 70)
sig("stateless")
sig("stateful")

print("\n" + "=" * 70)
print("Headline: report STATELESS (the clean set) and STATEFUL separately.")
print("Two levels: loadability (runnable code) + pass rate (correct behaviour).")
print("=" * 70)
