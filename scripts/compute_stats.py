# compute_stats.py
# Statistical rigour for the multi-model benchmark (Niall's ask).
# Reads results/{gemini,claude,gpt}/*.json (already collected — NO API calls).
# Produces:
#   1. Wilson 95% confidence intervals for every headline proportion, per model.
#   2. Pairwise model comparisons:
#        - McNemar exact test for the binary per-item tasks (classification, validity, round-trip).
#        - Wilcoxon signed-rank test for the per-template field tasks (extraction, typing, coverage).
#   3. Bootstrap 95% CIs for the mean iterations-to-valid (round-trip), with a fixed seed for reproducibility.
import json, math
import numpy as np
from scipy.stats import binomtest, wilcoxon

MODELS = {"gemini": "Gemini 2.5 Flash", "claude": "Claude Haiku 4.5", "gpt": "GPT-5.4-mini"}
KEYS = list(MODELS.keys())
RNG = np.random.default_rng(0)          # fixed seed -> reproducible bootstrap
PAIRS = [("gemini", "claude"), ("gemini", "gpt"), ("claude", "gpt")]

def load(model, name):
    with open(f"results/{model}/{name}_results.json") as f:
        return json.load(f)

def wilson(k, n, z=1.96):
    """Wilson score 95% CI for a proportion k/n."""
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    denom = 1 + z*z/n
    center = (p + z*z/(2*n)) / denom
    half = (z * math.sqrt(p*(1-p)/n + z*z/(4*n*n))) / denom
    return (max(0.0, center-half), min(1.0, center+half))

def pct(x): return f"{x*100:5.1f}%"

def ci_line(name, k, n):
    lo, hi = wilson(k, n)
    print(f"  {name:<18}: {pct(k/n)}  [{pct(lo)}, {pct(hi)}]   ({k}/{n})")

def mcnemar(a_correct, b_correct):
    """Exact McNemar on paired binary dicts {id: bool}. Returns (p, b, c)."""
    ids = set(a_correct) & set(b_correct)
    b = sum(1 for i in ids if a_correct[i] and not b_correct[i])   # A right, B wrong
    c = sum(1 for i in ids if b_correct[i] and not a_correct[i])   # B right, A wrong
    if b + c == 0:
        return (1.0, b, c)
    p = binomtest(min(b, c), b+c, 0.5, alternative="two-sided").pvalue
    return (p, b, c)

def verdict(p):
    return "SIGNIFICANT (p<0.05)" if p < 0.05 else "not significant"

def paired_props(model, name, num_key, den_key):
    """Per-template proportion, keyed by id (skips den==0)."""
    out = {}
    for d in load(model, name)["details"]:
        den = d[den_key] if isinstance(d[den_key], int) else len(d[den_key])
        if den > 0:
            out[d["id"]] = d[num_key] / den
    return out

def wilcoxon_pair(pa, pb):
    ids = sorted(set(pa) & set(pb))
    diffs = [pa[i] - pb[i] for i in ids]
    if all(d == 0 for d in diffs):
        return None
    try:
        return wilcoxon([pa[i] for i in ids], [pb[i] for i in ids]).pvalue
    except ValueError:
        return None

print("=" * 68)
print("ACCORD BENCHMARK — STATISTICAL ANALYSIS")
print("Models:", ", ".join(MODELS.values()), "| n = 51 templates")
print("=" * 68)

# ---------- 1. HEADLINE METRICS + Wilson 95% CIs ----------
print("\n--- 1. HEADLINE METRICS (95% Wilson confidence intervals) ---")

print("\nClassification accuracy (per-item, n=51):")
for m in KEYS:
    d = load(m, "classification"); ci_line(MODELS[m], d["correct"], d["total"])

print("\nVariable extraction (field-level accuracy):")
for m in KEYS:
    d = load(m, "variable_extraction"); ci_line(MODELS[m], d["correct_fields"], d["total_fields"])

print("\nType-mapping accuracy (field-level):")
for m in KEYS:
    d = load(m, "type_mapping"); ci_line(MODELS[m], d["correct_fields"], d["total_fields"])

print("\nModel-generation coverage (type-multiset recall):")
for m in KEYS:
    d = load(m, "model_generation"); ci_line(MODELS[m], d["types_covered"], d["total_gold_types"])

print("\nRaw validity (compiles first time, no help):")
for m in KEYS:
    d = load(m, "model_validity"); ci_line(MODELS[m], d["valid"], d["total"])

print("\nRound-trip NAIVE — reached valid (with feedback):")
for m in KEYS:
    d = load(m, "model_roundtrip"); ci_line(MODELS[m], d["reached_valid"], d["total"])

print("\nRound-trip RULES-UPFRONT — valid on first pass:")
for m in KEYS:
    d = load(m, "model_rules"); ci_line(MODELS[m], d["first_pass"], d["total"])

# ---------- 2. PAIRWISE COMPARISONS ----------
print("\n--- 2. PAIRWISE MODEL COMPARISONS ---")

print("\nClassification (McNemar exact, paired per-item):")
cls = {m: {d["id"]: d["correct"] for d in load(m, "classification")["details"]} for m in KEYS}
for a, b in PAIRS:
    p, nb, nc = mcnemar(cls[a], cls[b])
    print(f"  {MODELS[a]:<18} vs {MODELS[b]:<18}: p = {p:.3f}  ({verdict(p)})")

for label, name, num, den in [
    ("Variable extraction", "variable_extraction", "correct_fields", "total_fields"),
    ("Type-mapping",        "type_mapping",        "correct_fields", "total_fields"),
    ("Model-gen coverage",  "model_generation",    "types_covered",  "gold_types"),
]:
    print(f"\n{label} (Wilcoxon signed-rank, paired per-template):")
    props = {m: paired_props(m, name, num, den) for m in KEYS}
    for a, b in PAIRS:
        p = wilcoxon_pair(props[a], props[b])
        txt = "all templates tied" if p is None else f"p = {p:.3f}  ({verdict(p)})"
        print(f"  {MODELS[a]:<18} vs {MODELS[b]:<18}: {txt}")

print("\nRound-trip NAIVE reached-valid (McNemar exact, paired per-item):")
rv = {m: {d["id"]: d["valid"] for d in load(m, "model_roundtrip")["details"]} for m in KEYS}
for a, b in PAIRS:
    p, nb, nc = mcnemar(rv[a], rv[b])
    print(f"  {MODELS[a]:<18} vs {MODELS[b]:<18}: p = {p:.3f}  ({verdict(p)})")

# ---------- 3. ITERATIONS-TO-VALID (bootstrap CI) ----------
def boot_mean_ci(vals, iters=10000):
    vals = np.array(vals, dtype=float)
    means = [RNG.choice(vals, size=len(vals), replace=True).mean() for _ in range(iters)]
    return (float(np.mean(vals)), float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5)))

print("\n--- 3. ITERATIONS-TO-VALID (mean, 95% bootstrap CI) ---")
for cond, fname in [("NAIVE feedback", "model_roundtrip"), ("RULES upfront", "model_rules")]:
    print(f"\n{cond}:")
    for m in KEYS:
        tries = [d["tries"] for d in load(m, fname)["details"] if d["valid"]]
        mean, lo, hi = boot_mean_ci(tries)
        print(f"  {MODELS[m]:<18}: mean {mean:.2f} tries  [{lo:.2f}, {hi:.2f}]   (n={len(tries)} valid)")

print("\n" + "=" * 68)
print("Done. p<0.05 = the difference is unlikely to be chance on these 51 items.")
print("=" * 68)
