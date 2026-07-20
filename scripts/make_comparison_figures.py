# make_comparison_figures.py
# Comparison charts for the presentation + dissertation, split REAL-51 vs SYNTHETIC-89
# (supervisor feedback). Headline figures use the REAL 51 only; a separate contamination
# figure shows how the synthetic data distorts the ranking.
# Reads results/{gemini,claude,gpt}/*.json (NO API calls). Colourblind-safe Okabe-Ito subset.
import json, math, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

MODELS = {"gemini": "Gemini 2.5 Flash", "claude": "Claude Haiku 4.5", "gpt": "GPT-5.4-mini"}
KEYS = list(MODELS.keys())
COLORS = {"gemini": "#0072B2", "claude": "#E69F00", "gpt": "#009E73"}  # fixed order, never cycled
RNG = np.random.default_rng(0)

HERE = os.path.dirname(__file__)
SYN = set(os.listdir(os.path.join(HERE, "..", "synthetic-templates", "src")))
def subset_of(i): return "synthetic" if i.rsplit("-", 2)[0] in SYN else "real"

def load(m, name):
    with open(os.path.join(HERE, "..", "results", m, f"{name}_results.json")) as f:
        return json.load(f)

def wilson(k, n, z=1.96):
    if n == 0: return (0.0, 0.0)
    p = k/n; d = 1 + z*z/n
    c = (p + z*z/(2*n))/d
    h = (z*math.sqrt(p*(1-p)/n + z*z/(4*n*n)))/d
    return (max(0, c-h), min(1, c+h))

def agg(m, name, num, den, want="real"):
    """(k, n) over the requested subset. den=None -> per-item boolean count."""
    k = n = 0
    for d in load(m, name)["details"]:
        if subset_of(d["id"]) != want:
            continue
        if den is None:
            k += int(d[num]); n += 1
        else:
            dv = d[den] if isinstance(d[den], int) else len(d[den])
            k += d[num]; n += dv
    return k, n

def rate(m, name, num, den, want="real"):
    k, n = agg(m, name, num, den, want)
    lo, hi = wilson(k, n)
    return (k/n if n else 0, lo, hi)

def style(ax):
    ax.spines[["top", "right"]].set_visible(False)
    ax.yaxis.grid(True, color="#e6e6e6", linewidth=0.8, zorder=0)
    ax.set_axisbelow(True); ax.tick_params(length=0)

def grouped_bars(ax, tasks, data, ylabel, title, as_pct=True, ymax=None):
    x = np.arange(len(tasks)); w = 0.26
    scale = 100 if as_pct else 1
    offset = 2.0 if as_pct else 0.12
    fmt = (lambda v: f"{v:.0f}%") if as_pct else (lambda v: f"{v:.2f}")
    for i, m in enumerate(KEYS):
        vals = np.array([d[0] for d in data[m]]) * scale
        los = np.array([d[1] for d in data[m]]) * scale
        his = np.array([d[2] for d in data[m]]) * scale
        yerr = np.clip(np.vstack([vals-los, his-vals]), 0, None)
        bars = ax.bar(x + (i-1)*w, vals, w*0.9, label=MODELS[m], color=COLORS[m], zorder=3,
                      yerr=yerr, ecolor="#333333", capsize=3, error_kw={"linewidth": 1, "zorder": 4})
        for j, b in enumerate(bars):
            ax.text(b.get_x()+b.get_width()/2, his[j]+offset, fmt(vals[j]),
                    ha="center", va="bottom", fontsize=7.5, color="#333333")
    ax.set_xticks(x); ax.set_xticklabels(tasks, fontsize=9)
    ax.set_ylabel(ylabel, fontsize=9)
    ax.set_title(title, fontsize=12, fontweight="bold", pad=12)
    if ymax: ax.set_ylim(0, ymax)
    style(ax)
    ax.legend(frameon=False, fontsize=8.5, ncol=3, loc="upper center", bbox_to_anchor=(0.5, -0.12))

# ---------- FIGURE 1: capability across tasks (REAL 51) ----------
tasks = ["Classification", "Extraction", "Type-mapping", "Model-gen\ncoverage"]
specs = [("classification", "correct", None),
         ("variable_extraction", "correct_fields", "total_fields"),
         ("type_mapping", "correct_fields", "total_fields"),
         ("model_generation", "types_covered", "gold_types")]
data = {m: [rate(m, name, num, den, "real") for name, num, den in specs] for m in KEYS}
fig, ax = plt.subplots(figsize=(8, 5))
grouped_bars(ax, tasks, data, "Score (%)",
             "Model capability across tasks (REAL 51 templates, 95% Wilson CI)", ymax=100)
fig.tight_layout(); fig.savefig(os.path.join(HERE, "..", "figures", "comp1_task_scores.png"), dpi=150, bbox_inches="tight")
print("saved comp1_task_scores.png (real-51)")

# ---------- FIGURE 2: validity / self-correction (REAL 51) ----------
conds = ["Raw validity\n(no help)", "Self-correct\n(naive feedback)", "Rules upfront\n(first pass)"]
data2 = {}
for m in KEYS:
    raw = rate(m, "model_validity", "valid", None, "real")
    selfc = rate(m, "model_roundtrip", "valid", None, "real")
    det = [d for d in load(m, "model_rules")["details"] if subset_of(d["id"]) == "real"]
    fp = sum(1 for d in det if d["valid"] and d["tries"] == 1); nr = len(det)
    lo, hi = wilson(fp, nr)
    data2[m] = [raw, selfc, (fp/nr, lo, hi)]
fig, ax = plt.subplots(figsize=(8, 5))
grouped_bars(ax, conds, data2, "Valid Concerto (%)",
             "Compiler validity: raw vs self-correction (REAL 51, 95% Wilson CI)", ymax=112)
fig.tight_layout(); fig.savefig(os.path.join(HERE, "..", "figures", "comp2_validity_story.png"), dpi=150, bbox_inches="tight")
print("saved comp2_validity_story.png (real-51)")

# ---------- FIGURE 3: iterations-to-valid (REAL 51, bootstrap) ----------
def boot(vals, iters=10000):
    a = np.array(vals, float)
    if len(a) == 0: return 0, 0, 0
    ms = [RNG.choice(a, size=len(a), replace=True).mean() for _ in range(iters)]
    return a.mean(), np.percentile(ms, 2.5), np.percentile(ms, 97.5)
conds3 = ["Naive feedback", "Rules upfront"]
data3 = {}
for m in KEYS:
    row = []
    for fname in ["model_roundtrip", "model_rules"]:
        tries = [d["tries"] for d in load(m, fname)["details"] if d["valid"] and subset_of(d["id"]) == "real"]
        row.append(boot(tries))
    data3[m] = row
fig, ax = plt.subplots(figsize=(7, 5))
grouped_bars(ax, conds3, data3, "Mean tries to valid",
             "Iterations-to-valid (REAL 51, mean, 95% bootstrap CI)", as_pct=False, ymax=5)
fig.tight_layout(); fig.savefig(os.path.join(HERE, "..", "figures", "comp3_iterations.png"), dpi=150, bbox_inches="tight")
print("saved comp3_iterations.png (real-51)")

# ---------- FIGURE 5: CONTAMINATION — real vs synthetic ----------
# Two panels (type-mapping, coverage). Per model: real (solid) vs synthetic (hatched).
panels = [("Type-mapping", "type_mapping", "correct_fields", "total_fields"),
          ("Model-gen coverage", "model_generation", "types_covered", "gold_types")]
fig, axes = plt.subplots(1, 2, figsize=(11, 5))
for ax, (label, name, num, den) in zip(axes, panels):
    x = np.arange(len(KEYS)); w = 0.36
    for j, m in enumerate(KEYS):
        r = rate(m, name, num, den, "real")[0] * 100
        s = rate(m, name, num, den, "synthetic")[0] * 100
        ax.bar(x[j]-w/2, r, w, color=COLORS[m], zorder=3)
        ax.bar(x[j]+w/2, s, w, color=COLORS[m], zorder=3, hatch="////", edgecolor="white", linewidth=0)
        ax.text(x[j]-w/2, r+1, f"{r:.0f}", ha="center", va="bottom", fontsize=8, color="#333")
        ax.text(x[j]+w/2, s+1, f"{s:.0f}", ha="center", va="bottom", fontsize=8, color="#333")
    ax.set_xticks(x); ax.set_xticklabels(["Gemini", "Claude", "GPT"], fontsize=9)
    ax.set_ylim(0, 100); ax.set_ylabel("Score (%)", fontsize=9)
    ax.set_title(label, fontsize=11, fontweight="bold", pad=10)
    style(ax)
# shared legend for solid=real, hatched=synthetic
from matplotlib.patches import Patch
handles = [Patch(facecolor="#888", label="Real 51"),
           Patch(facecolor="#888", hatch="////", edgecolor="white", label="Synthetic 89")]
fig.legend(handles=handles, frameon=False, ncol=2, loc="upper center", bbox_to_anchor=(0.5, 0.02), fontsize=9)
fig.suptitle("Contamination: synthetic data lifts Claude & GPT, sinks Gemini on coverage",
             fontsize=12, fontweight="bold", y=1.02)
fig.tight_layout(); fig.savefig(os.path.join(HERE, "..", "figures", "comp5_contamination.png"), dpi=150, bbox_inches="tight")
print("saved comp5_contamination.png")

print("\nDone — real-51 figures + contamination chart in figures/")
