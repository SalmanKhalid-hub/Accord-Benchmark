# compute_correlations.py
# Reproduces the difficulty-correlation analysis in the dissertation (§3.2 and Table 2):
# does template SIZE (number of gold properties) predict any outcome?
#   - within the gold:  size vs non-String COUNT and vs non-String SHARE (+ all-String templates)
#   - vs outcomes (per model): size vs per-template coverage, reached-valid, iterations-to-valid,
#     and logic unit-test pass rate.
# Spearman rho with p-values. Real 51 templates (42 for the logic row). NO API calls.
import json, os, re
from scipy.stats import spearmanr

MODELS = {"gemini": "Gemini 2.5 Flash", "claude": "Claude Haiku 4.5", "gpt": "GPT-5.4-mini"}
KEYS = list(MODELS)
HERE = os.path.dirname(__file__)
R = lambda *p: os.path.join(HERE, "..", *p)
def load(p): return json.load(open(p))
def base(tid): return re.sub(r"-[a-z]+-\d+$", "", tid)   # "acceptance-of-delivery-modelgen-01" -> base

# ---- size (gold property count) per template, from the frozen real-51 gold ----
gold = load(R("data_baseline_51", "model_generation.json"))
size, nonstr_count, nonstr_share = {}, {}, {}
for it in gold:
    types = [v for v in it["expected_output"].values() if isinstance(v, str)]
    n = len(types)
    if n == 0: continue
    b = base(it["id"])
    size[b] = n
    ns = sum(1 for t in types if t != "String")
    nonstr_count[b] = ns; nonstr_share[b] = ns / n

def sp(xs, ys):
    if len(xs) < 3 or len(set(ys)) < 2: return None
    r, p = spearmanr(xs, ys); return (r, p)
def fmt(res, draft):
    if res is None: return f"{'— (constant)':>16}   (draft: {draft})"
    r, p = res; return f"rho={r:+.2f} p={p:.3f}".rjust(16) + f"   (draft: {draft})"

print("=" * 74)
print("DIFFICULTY CORRELATIONS (Spearman rho) — real 51 templates (42 for logic)")
print("=" * 74)

# ---- within-gold correlations (§3.2 headline) ----
b_common = [b for b in size]
print("\n§3.2 within the gold:")
print("  size vs non-String COUNT :", fmt(sp([size[b] for b in b_common], [nonstr_count[b] for b in b_common]), "+0.71, p<0.001"))
print("  size vs non-String SHARE :", fmt(sp([size[b] for b in b_common], [nonstr_share[b] for b in b_common]), "-0.17, p=0.24"))
print(f"  templates typed entirely String: {sum(1 for b in b_common if nonstr_share[b]==0)}   (draft: 3)")

# ---- Table 2 rows, per model ----
DRAFT = {
    "coverage":  {"gemini": "+0.25 (p=0.08)", "claude": "+0.20 (p=0.17)", "gpt": "+0.13 (p=0.37)"},
    "valid":     {"gemini": "-0.14 (p=0.34)", "claude": "— (all valid)", "gpt": "-0.07 (p=0.61)"},
    "iters":     {"gemini": "+0.10 (p=0.56)", "claude": "+0.06 (p=0.67)", "gpt": "+0.47 (p<0.001)"},
    "logicpass": {"gemini": "-0.38 (p=0.013)", "claude": "-0.26 (p=0.10)", "gpt": "-0.32 (p=0.036)"},
}
print("\nTable 2 — size vs outcomes, per model:")
for m in KEYS:
    print(f"\n  {MODELS[m]}")
    # coverage: types_covered / gold_field_count, per template
    gen = load(R("results", m, "model_generation_results.json"))["details"]
    xs = [size[base(d["id"])] for d in gen if base(d["id"]) in size]
    ys = [d["types_covered"] / d["gold_field_count"] for d in gen if base(d["id"]) in size and d["gold_field_count"]]
    print("    size vs per-template coverage :", fmt(sp(xs, ys), DRAFT["coverage"][m]))
    # reached-valid + iterations-to-valid (naive round-trip)
    rt = load(R("results", m, "model_roundtrip_results.json"))["details"]
    xv = [size[base(d["id"])] for d in rt if base(d["id"]) in size]
    print("    size vs reached-valid         :", fmt(sp(xv, [int(d["valid"]) for d in rt if base(d["id"]) in size]), DRAFT["valid"][m]))
    # iterations-to-valid is only defined for templates that DID reach valid (tries is a count)
    it_x = [size[base(d["id"])] for d in rt if base(d["id"]) in size and d.get("valid") and d.get("tries") is not None]
    it_y = [d["tries"] for d in rt if base(d["id"]) in size and d.get("valid") and d.get("tries") is not None]
    print("    size vs iterations-to-valid   :", fmt(sp(it_x, it_y), DRAFT["iters"][m]))
    # logic unit-test pass rate (42-template corpus; join by base template name)
    lg = load(R("results", m, "logic_synthesis_results.json"))["details"]
    xl = [size[base(d["id"])] for d in lg if base(d["id"]) in size and d["total"]]
    yl = [d["passed"] / d["total"] for d in lg if base(d["id"]) in size and d["total"]]
    print("    size vs logic pass rate       :", fmt(sp(xl, yl), DRAFT["logicpass"][m]))
