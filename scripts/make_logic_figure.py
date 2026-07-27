# make_logic_figure.py
# Task 4 (logic synthesis) chart: two panels (loadability | pass rate), each showing
# STATELESS vs STATEFUL for the three models, 95% Wilson CI. Okabe-Ito colours.
import json, math, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

MODELS = {"gemini": "Gemini 2.5 Flash", "claude": "Claude Haiku 4.5", "gpt": "GPT-5.4-mini"}
KEYS = list(MODELS)
COLORS = {"gemini": "#0072B2", "claude": "#E69F00", "gpt": "#009E73"}
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

data = {m: load(m) for m in KEYS}
def det(m, kind):
    ds = data[m]["details"]
    if kind == "stateless": return [d for d in ds if not d.get("stateful")]
    if kind == "stateful":  return [d for d in ds if d.get("stateful")]
    return ds

def loadability(m, kind):
    ds = det(m, kind); k = sum(1 for d in ds if d["loaded"]); n = len(ds)
    return (k/n, *wilson(k, n))
def passrate(m, kind):
    ds = det(m, kind); k = sum(d["passed"] for d in ds); n = sum(d["total"] for d in ds)
    return (k/n, *wilson(k, n))

def panel(ax, metric_fn, title):
    kinds = ["stateless", "stateful"]
    x = np.arange(len(kinds)); w = 0.26
    for i, m in enumerate(KEYS):
        v = np.array([metric_fn(m, k)[0] for k in kinds]) * 100
        lo = np.array([metric_fn(m, k)[1] for k in kinds]) * 100
        hi = np.array([metric_fn(m, k)[2] for k in kinds]) * 100
        yerr = np.clip(np.vstack([v-lo, hi-v]), 0, None)
        bars = ax.bar(x + (i-1)*w, v, w*0.9, label=MODELS[m], color=COLORS[m], zorder=3,
                      yerr=yerr, ecolor="#333333", capsize=3, error_kw={"linewidth": 1, "zorder": 4})
        for j, b in enumerate(bars):
            ax.text(b.get_x()+b.get_width()/2, hi[j]+1.5, f"{v[j]:.0f}%",
                    ha="center", va="bottom", fontsize=8, color="#333333")
    ax.set_xticks(x); ax.set_xticklabels(["Stateless\n(33)", "Stateful\n(9)"], fontsize=10)
    ax.set_ylim(0, 112); ax.set_ylabel("Percent", fontsize=9)
    ax.set_title(title, fontsize=11, fontweight="bold", pad=10)
    ax.spines[["top", "right"]].set_visible(False)
    ax.yaxis.grid(True, color="#e6e6e6", linewidth=0.8, zorder=0); ax.set_axisbelow(True)
    ax.tick_params(length=0)

plt.rcParams.update({"font.size": 12})
fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 5))
panel(a1, loadability, "Loadability (produces runnable logic)")
panel(a2, passrate, "Unit-test pass rate (logic is correct)")
fig.suptitle("Task 4 — Logic synthesis: stateless vs stateful (95% Wilson CI)",
             fontsize=13, fontweight="bold", y=1.02)
handles, labels = a1.get_legend_handles_labels()
fig.legend(handles, labels, frameon=False, ncol=3, loc="upper center", bbox_to_anchor=(0.5, 0.0), fontsize=9)
fig.tight_layout()
out = os.path.join(HERE, "..", "figures", "comp6_logic_synthesis.png")
fig.savefig(out, dpi=150, bbox_inches="tight")
print("saved figures/comp6_logic_synthesis.png")
