# make_force_figure.py
# Force-mode sub-study chart: generate-and-run (gen) vs execute-directly (force),
# FULL-OUTCOME oracle-agreement (result + emitted events) on canonical scenarios.
# Two panels (STATELESS | STATEFUL); x = the three models + POOLED; two bars each
# (gen, force), 95% Wilson CI. Scored authoritatively from stored raw outputs (o/g/f),
# identical policy to compute_force_stats.py.
import json, math, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

MODELS = {"gemini": "Gemini 2.5 Flash", "claude": "Claude Haiku 4.5", "gpt": "GPT-5.4-mini"}
KEYS = list(MODELS)
ARMS = [("g", "Generate-and-run", "#0072B2"), ("f", "Execute-directly (LLM)", "#D55E00")]
HERE = os.path.dirname(__file__)
DROP = {"$timestamp", "$identifier", "description"}

def load(m):
    p = os.path.join(HERE, "..", "results", m, "force_compare_results.json")
    return json.load(open(p)) if os.path.exists(p) else None

def cmp_norm(o):
    if isinstance(o, list): return [cmp_norm(x) for x in o]
    if isinstance(o, dict): return {k: cmp_norm(v) for k, v in o.items() if k not in DROP}
    if isinstance(o, (int, float)): return round(float(o), 6)
    return o
def canon(o): return json.dumps(cmp_norm(o), sort_keys=True)
def matches(oracle, arm):                     # FULL outcome (result + events)
    return arm is not None and canon(oracle) == canon(arm)

def counts(data, kind, arm_key):              # (k, n) scenario-level, full-outcome lens
    if data is None: return (0, 0)
    k = n = 0
    for d in data["details"]:
        if kind == "stateless" and d["stateful"]: continue
        if kind == "stateful" and not d["stateful"]: continue
        for s in d.get("scen", []):
            if "o" not in s or s.get("o") is None: continue
            n += 1
            if matches(s["o"], s.get(arm_key)): k += 1
    return (k, n)

def wilson(k, n, z=1.96):
    if n == 0: return (0.0, 0.0, 0.0)
    p = k/n; d = 1 + z*z/n
    c = (p + z*z/(2*n))/d
    h = (z*math.sqrt(p*(1-p)/n + z*z/(4*n*n)))/d
    return (p, max(0, c-h), min(1, c+h))

data = {m: load(m) for m in KEYS}
GROUPS = KEYS + ["pooled"]
GLABEL = {**{m: MODELS[m].replace(" ", "\n") for m in KEYS}, "pooled": "Pooled"}

def group_counts(g, kind, arm_key):
    if g == "pooled":
        tot = [counts(data[m], kind, arm_key) for m in KEYS]
        return (sum(k for k, n in tot), sum(n for k, n in tot))
    return counts(data[g], kind, arm_key)

def panel(ax, kind, title):
    x = np.arange(len(GROUPS)); w = 0.38
    for ai, (arm_key, label, color) in enumerate(ARMS):
        vals, los, his = [], [], []
        for g in GROUPS:
            k, n = group_counts(g, kind, arm_key)
            p, lo, hi = wilson(k, n)
            vals.append(p*100); los.append(lo*100); his.append(hi*100)
        vals = np.array(vals); los = np.array(los); his = np.array(his)
        yerr = np.clip(np.vstack([vals-los, his-vals]), 0, None)
        bars = ax.bar(x + (ai-0.5)*w, vals, w*0.9, label=label, color=color, zorder=3,
                      yerr=yerr, ecolor="#333333", capsize=3, error_kw={"linewidth": 1, "zorder": 4})
        for j, b in enumerate(bars):
            ax.text(b.get_x()+b.get_width()/2, his[j]+1.5, f"{vals[j]:.0f}%",
                    ha="center", va="bottom", fontsize=8, color="#333333")
    # n per group
    ns = [group_counts(g, kind, "g")[1] for g in GROUPS]
    ax.set_xticks(x); ax.set_xticklabels([f"{GLABEL[g]}\n(n={ns[i]})" for i, g in enumerate(GROUPS)], fontsize=8)
    ax.axvline(len(KEYS)-0.5, color="#cccccc", linewidth=1, linestyle="--", zorder=1)
    ax.set_ylim(0, 60); ax.set_ylabel("Full-outcome oracle-agreement (%)", fontsize=9)
    ax.set_title(title, fontsize=11, fontweight="bold", pad=10)
    ax.spines[["top", "right"]].set_visible(False)
    ax.yaxis.grid(True, color="#e6e6e6", linewidth=0.8, zorder=0); ax.set_axisbelow(True)
    ax.tick_params(length=0)

plt.rcParams.update({"font.size": 12})
fig, (a1, a2) = plt.subplots(1, 2, figsize=(12, 5))
panel(a1, "stateless", "Stateless templates")
panel(a2, "stateful", "Stateful templates")
# mark the significant pooled stateful gap
a2.annotate("pooled gap\np=0.039 *", xy=(3, 30), fontsize=8, ha="center", color="#333333",
            bbox=dict(boxstyle="round,pad=0.3", fc="#fff4e6", ec="#D55E00", lw=0.8))
fig.suptitle("Execution strategy: generate-and-run vs direct LLM execution (95% Wilson CI)",
             fontsize=13, fontweight="bold", y=1.02)
handles, labels = a1.get_legend_handles_labels()
fig.legend(handles, labels, frameon=False, ncol=2, loc="upper center", bbox_to_anchor=(0.5, 0.0), fontsize=9)
fig.tight_layout()
out = os.path.join(HERE, "..", "figures", "comp7_force_mode.png")
fig.savefig(out, dpi=150, bbox_inches="tight")
print("saved figures/comp7_force_mode.png")
