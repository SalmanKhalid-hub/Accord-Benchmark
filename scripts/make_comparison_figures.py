# make_comparison_figures.py
# 3-model comparison charts for the presentation + dissertation.
# Reads results/{gemini,claude,gpt}/*.json (NO API calls).
# Grouped bars with 95% Wilson CI error bars. Colourblind-safe palette (Okabe-Ito subset,
# validated: CVD separation dE 51.6). Value labels on every bar (readability relief + report norm).
import json, math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

MODELS = {"gemini": "Gemini 2.5 Flash", "claude": "Claude Haiku 4.5", "gpt": "GPT-5.4-mini"}
KEYS = list(MODELS.keys())
COLORS = {"gemini": "#0072B2", "claude": "#E69F00", "gpt": "#009E73"}  # fixed order, never cycled
RNG = np.random.default_rng(0)

def load(m, name):
    with open(f"results/{m}/{name}_results.json") as f:
        return json.load(f)

def wilson(k, n, z=1.96):
    if n == 0: return (0.0, 0.0)
    p = k/n; d = 1 + z*z/n
    c = (p + z*z/(2*n))/d
    h = (z*math.sqrt(p*(1-p)/n + z*z/(4*n*n)))/d
    return (max(0, c-h), min(1, c+h))

def style(ax):
    ax.spines[["top", "right"]].set_visible(False)
    ax.yaxis.grid(True, color="#e6e6e6", linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    ax.tick_params(length=0)

def grouped_bars(ax, tasks, data, ylabel, title, as_pct=True, ymax=None):
    """data[model] = list of (value, lo, hi) per task."""
    x = np.arange(len(tasks)); w = 0.26
    scale = 100 if as_pct else 1
    offset = 2.0 if as_pct else 0.12
    fmt = (lambda v: f"{v:.0f}%") if as_pct else (lambda v: f"{v:.2f}")
    for i, m in enumerate(KEYS):
        vals = np.array([d[0] for d in data[m]]) * scale
        los  = np.array([d[1] for d in data[m]]) * scale
        his  = np.array([d[2] for d in data[m]]) * scale
        yerr = np.clip(np.vstack([vals-los, his-vals]), 0, None)  # guard float rounding at 0%/100%
        bars = ax.bar(x + (i-1)*w, vals, w*0.9, label=MODELS[m],
                      color=COLORS[m], zorder=3,
                      yerr=yerr, ecolor="#333333", capsize=3,
                      error_kw={"linewidth": 1, "zorder": 4})
        for j, b in enumerate(bars):
            ax.text(b.get_x()+b.get_width()/2, his[j]+offset, fmt(vals[j]),
                    ha="center", va="bottom", fontsize=7.5, color="#333333")
    ax.set_xticks(x); ax.set_xticklabels(tasks, fontsize=9)
    ax.set_ylabel(ylabel, fontsize=9)
    ax.set_title(title, fontsize=12, fontweight="bold", pad=12)
    if ymax: ax.set_ylim(0, ymax)
    style(ax)
    ax.legend(frameon=False, fontsize=8.5, ncol=3, loc="upper center",
              bbox_to_anchor=(0.5, -0.12))

# ---------- FIGURE 1: capability across tasks ----------
tasks = ["Classification", "Extraction", "Type-mapping", "Model-gen\ncoverage"]
specs = [("classification", "correct", "total"),
         ("variable_extraction", "correct_fields", "total_fields"),
         ("type_mapping", "correct_fields", "total_fields"),
         ("model_generation", "types_covered", "total_gold_types")]
data = {}
for m in KEYS:
    row = []
    for name, kk, nk in specs:
        d = load(m, name); k, n = d[kk], d[nk]
        lo, hi = wilson(k, n); row.append((k/n, lo, hi))
    data[m] = row
fig, ax = plt.subplots(figsize=(8, 5))
grouped_bars(ax, tasks, data, "Score (%)",
             "Model capability across benchmark tasks (95% Wilson CI)", ymax=100)
fig.tight_layout(); fig.savefig("figures/comp1_task_scores.png", dpi=150, bbox_inches="tight")
print("saved figures/comp1_task_scores.png")

# ---------- FIGURE 2: the validity / self-correction story ----------
conds = ["Raw validity\n(no help)", "Self-correct\n(naive feedback)", "Rules upfront\n(first pass)"]
data2 = {}
for m in KEYS:
    v = load(m, "model_validity"); rt = load(m, "model_roundtrip"); ru = load(m, "model_rules")
    row = []
    for k, n in [(v["valid"], v["total"]), (rt["reached_valid"], rt["total"]), (ru["first_pass"], ru["total"])]:
        lo, hi = wilson(k, n); row.append((k/n, lo, hi))
    data2[m] = row
fig, ax = plt.subplots(figsize=(8, 5))
grouped_bars(ax, conds, data2, "Valid Concerto (%)",
             "Compiler validity: raw vs. self-correction (95% Wilson CI)", ymax=112)
fig.tight_layout(); fig.savefig("figures/comp2_validity_story.png", dpi=150, bbox_inches="tight")
print("saved figures/comp2_validity_story.png")

# ---------- FIGURE 3: iterations-to-valid (bootstrap CI) ----------
def boot(vals, iters=10000):
    a = np.array(vals, float)
    ms = [RNG.choice(a, size=len(a), replace=True).mean() for _ in range(iters)]
    return a.mean(), np.percentile(ms, 2.5), np.percentile(ms, 97.5)
conds3 = ["Naive feedback", "Rules upfront"]
data3 = {}
for m in KEYS:
    row = []
    for fname in ["model_roundtrip", "model_rules"]:
        tries = [d["tries"] for d in load(m, fname)["details"] if d["valid"]]
        mean, lo, hi = boot(tries); row.append((mean, lo, hi))
    data3[m] = row
fig, ax = plt.subplots(figsize=(7, 5))
grouped_bars(ax, conds3, data3, "Mean tries to valid",
             "Iterations-to-valid (mean, 95% bootstrap CI)", as_pct=False, ymax=5)
fig.tight_layout(); fig.savefig("figures/comp3_iterations.png", dpi=150, bbox_inches="tight")
print("saved figures/comp3_iterations.png")

print("\nDone — 3 comparison figures in figures/")
