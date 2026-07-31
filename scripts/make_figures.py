# make_figures.py
# EDA of the benchmark dataset + publication-quality result charts for the dissertation draft.
# Outputs PNGs to figures/ and prints summary stats.

import json, os, statistics, textwrap
from collections import Counter
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from domains import domain_of, DOMAIN_ORDER

os.makedirs("figures", exist_ok=True)
plt.rcParams.update({"figure.dpi": 150, "font.size": 11, "axes.spysine.top": False} if False else {"figure.dpi": 150, "font.size": 11})
ACCENT = "#2a6f97"
ACCENT2 = "#e09f3e"


def load(p):
    return json.load(open(p))


# ---------- EDA on the dataset ----------
# NOTE: headline EDA is reported on the REAL 51 templates, so this reads the frozen
# pre-expansion baseline. Reading data/ here silently blends in the 89 synthetic
# templates and contradicts these figures' own captions (dissertation section 3.3).
gen = load("data_baseline_51/model_generation.json")
var_counts = {q["id"].replace("-modelgen-01", ""): len(q["expected_output"]) for q in gen}
all_types = Counter(t for q in gen for t in q["expected_output"].values())
n_templates = len(gen)
total_vars = sum(var_counts.values())
counts = sorted(var_counts.values())
mean_v = total_vars / n_templates
median_v = statistics.median(counts)
sd_v = statistics.stdev(counts)

# Legal-domain assignment comes from the shared taxonomy (scripts/domains.py) so that
# Figure 3 (real-corpus skew) and Figure 4 (before-vs-after expansion) cannot disagree.
# The previous keyword heuristic lived here, collapsed the library into three buckets,
# and routed every synthetic template into "other" because its keywords were derived
# from real Accord filenames.
themes = Counter(domain_of(name) for name in var_counts)

print("=== DATASET EDA (REAL 51) ===")
print(f"templates: {n_templates}, total variables: {total_vars}, distinct types: {len(all_types)}")
print(f"variables/template: mean {mean_v:.1f}, median {median_v:.0f}, SD {sd_v:.1f}, "
      f"range {counts[0]}-{counts[-1]}")
print(f"String: {all_types['String']} ({all_types['String']/total_vars:.0%})")
print("top types:", all_types.most_common(10))
for d in DOMAIN_ORDER:
    if themes[d]:
        print(f"  {themes[d]:3d} ({themes[d]/n_templates:4.0%})  {d}")


def style(ax):
    ax.spines[["top", "right"]].set_visible(False)
    ax.set_axisbelow(True)
    ax.tick_params(length=0)

# Fig 1: Concerto type distribution
top = all_types.most_common(12)
fig, ax = plt.subplots(figsize=(8, 4.5))
tlabels = [t for t, _ in top][::-1]
tvals = [c for _, c in top][::-1]
bars = ax.barh(tlabels, tvals, color=ACCENT, zorder=2)
ax.xaxis.grid(True, color="#e6e6e6", linewidth=0.8, zorder=0)
for b, v in zip(bars, tvals):
    ax.text(v + max(tvals) * 0.012, b.get_y() + b.get_height() / 2,
            f"{v}  ({v/total_vars:.0%})" if v / total_vars >= 0.05 else str(v),
            va="center", fontsize=9, color="#333")
ax.set_xlim(0, max(tvals) * 1.18)
ax.set_xlabel(f"Occurrences across the 51 real templates (n = {total_vars} properties)")
ax.set_title("Distribution of Concerto types in the gold models (real 51)",
             fontweight="bold", fontsize=12)
style(ax)
fig.tight_layout(); fig.savefig("figures/fig1_type_distribution.png"); plt.close(fig)

# Fig 2: variables-per-template histogram
fig, ax = plt.subplots(figsize=(7.5, 4))
ax.hist(counts, bins=range(0, max(counts) + 3, 2), color=ACCENT, edgecolor="white", zorder=2)
ax.yaxis.grid(True, color="#e6e6e6", linewidth=0.8, zorder=0)
ax.axvline(mean_v, color="#c1121f", linestyle="--", linewidth=1.4, zorder=3)
ax.text(mean_v + 1.0, ax.get_ylim()[1] * 0.88,
        f"mean {mean_v:.1f}\nmedian {median_v:.0f}", fontsize=9, color="#c1121f")
ax.set_xlabel("Variables per template")
ax.set_ylabel("Number of templates")
ax.set_title(f"Template complexity, real 51 (SD {sd_v:.1f}, range {counts[0]}–{counts[-1]})",
             fontweight="bold", fontsize=12)
style(ax)
fig.tight_layout(); fig.savefig("figures/fig2_variable_counts.png"); plt.close(fig)

# Fig 3: legal-domain coverage of the real corpus, including the EMPTY domains.
# Zero-height bars are deliberate: the absent domains are the finding.
dvals = [themes[d] for d in DOMAIN_ORDER]
cols = [ACCENT if v else "#d9d9d9" for v in dvals]
n_absent = sum(1 for v in dvals if not v)
fig, ax = plt.subplots(figsize=(10, 5.0))
bars = ax.bar(range(len(DOMAIN_ORDER)), dvals, color=cols, width=0.66, zorder=2)
ax.yaxis.grid(True, color="#e6e6e6", linewidth=0.8, zorder=0)
for b, v in zip(bars, dvals):
    ax.text(b.get_x() + b.get_width() / 2, v + 0.4,
            f"{v}\n({v/n_templates:.0%})" if v else "0",
            ha="center", fontsize=9, color="#333" if v else "#999")
ax.set_xticks(range(len(DOMAIN_ORDER)))
ax.set_xticklabels([textwrap.fill(d, 16) for d in DOMAIN_ORDER],
                   fontsize=8, rotation=30, ha="right", rotation_mode="anchor")
ax.set_ylabel("Number of templates")
ax.set_ylim(0, max(dvals) * 1.26)
sup_pay = (themes["Supply / goods / logistics"] + themes["Payment & financial"]) / n_templates
ax.set_title(f"Thematic skew of the real template library\n"
             f"supply + payment = {sup_pay:.0%} of the corpus; {n_absent} domains absent entirely",
             fontweight="bold", fontsize=11.5)
style(ax)
fig.tight_layout(); fig.savefig("figures/fig3_theme_skew.png"); plt.close(fig)

# ---------- Legacy single-model results charts ----------
# These predate the multi-model benchmark and are SUPERSEDED by make_comparison_figures.py
# (figures/comp*.png), which is what the dissertation uses. They read the old flat
# results/ layout, which no longer exists now that results are split per model into
# results/{gemini,claude,gpt}/. Kept for provenance; skipped when the old files are absent
# so that this script still reproduces Figures 1-3 cleanly.
if not os.path.exists("results/classification_results.json"):
    print("\nSaved Figures 1-3 (EDA, real 51) to figures/")
    print("Legacy single-model charts skipped: superseded by make_comparison_figures.py")
    raise SystemExit(0)

cls = load("results/classification_results.json")["accuracy"]
ext = load("results/variable_extraction_results.json")["field_accuracy"]
tym = load("results/type_mapping_results.json")["type_accuracy"]
gencov = load("results/model_generation_results.json")["type_recall"]

# Fig 4: per-task headline scores
labels = ["Task 1\nClassification", "Task 2\nVar. extraction", "Task 2b\nType mapping", "Task 3\nModel gen (coverage)"]
vals = [cls, ext, tym, gencov]
plt.figure(figsize=(8, 4.5))
bars = plt.bar(labels, [v * 100 for v in vals], color=ACCENT)
for b, v in zip(bars, vals):
    plt.text(b.get_x() + b.get_width() / 2, v * 100 + 1, f"{v:.1%}", ha="center", fontsize=10)
plt.ylabel("Score (%)"); plt.ylim(0, 100)
plt.title("Figure 4. Gemini 2.5 Flash performance across benchmark tasks")
plt.tight_layout(); plt.savefig("figures/fig4_task_scores.png"); plt.close()

# Fig 5: validity & round-tripping conditions
rt = load("results/model_roundtrip_results.json")
ru = load("results/model_rules_results.json")
conds = ["A: naive +\nraw errors", "B: naive +\nactionable\n(round-trip)", "C: rules\nupfront"]
first = [0, rt["first_pass"] / rt["total"], ru["first_pass"] / ru["total"]]
reached = [0, rt["reached_valid"] / rt["total"], ru["reached_valid"] / ru["total"]]
x = range(len(conds)); w = 0.38
plt.figure(figsize=(8, 4.5))
b1 = plt.bar([i - w / 2 for i in x], [v * 100 for v in first], w, label="First pass", color="#8d99ae")
b2 = plt.bar([i + w / 2 for i in x], [v * 100 for v in reached], w, label="After round-trips", color=ACCENT)
for bars, vs in [(b1, first), (b2, reached)]:
    for b, v in zip(bars, vs):
        plt.text(b.get_x() + b.get_width() / 2, v * 100 + 1, f"{v:.0%}", ha="center", fontsize=9)
plt.xticks(list(x), conds); plt.ylabel("Valid Concerto (%)"); plt.ylim(0, 105)
plt.title("Figure 5. Model validity: feedback condition vs compile success")
plt.legend(); plt.tight_layout(); plt.savefig("figures/fig5_validity_conditions.png"); plt.close()

# Fig 6: round-trip tries-to-valid distribution (condition B)
tries = Counter(r["tries"] for r in rt["details"] if r["valid"])
never = sum(1 for r in rt["details"] if not r["valid"])
xs = sorted(tries) + ["never"]
ys = [tries[t] for t in sorted(tries)] + [never]
plt.figure(figsize=(8.5, 4.2))
bars = plt.bar([str(t) for t in xs], ys, color=[ACCENT] * (len(xs) - 1) + ["#c1121f"])
for b, v in zip(bars, ys):
    plt.text(b.get_x() + b.get_width() / 2, v + 0.3, str(v), ha="center", fontsize=10)
plt.xlabel("Round trips to reach valid"); plt.ylabel("Number of templates")
plt.title("Figure 6. Round trips to self-correct to valid Concerto", fontsize=11)
plt.tight_layout(); plt.savefig("figures/fig6_tries_distribution.png"); plt.close()

# Fig 7: 1-stage vs 2-stage
ovt = load("results/one_vs_two_stage_results.json")
plt.figure(figsize=(6.5, 4))
b = plt.bar(["1-stage\n(direct)", "2-stage\n(via variables)"],
            [ovt["one_stage_recall"] * 100, ovt["two_stage_recall"] * 100], color=[ACCENT, ACCENT2])
for bar, v in zip(b, [ovt["one_stage_recall"], ovt["two_stage_recall"]]):
    plt.text(bar.get_x() + bar.get_width() / 2, v * 100 + 1, f"{v:.1%}", ha="center", fontsize=11)
plt.ylabel("Type coverage (%)"); plt.ylim(0, 100)
plt.title(f"Figure 7. 1-stage vs 2-stage generation\n(head-to-head: {ovt['one_wins']} vs {ovt['two_wins']}, {ovt['ties']} ties)")
plt.tight_layout(); plt.savefig("figures/fig7_one_vs_two.png"); plt.close()

print("\nSaved 7 figures to figures/")
print(f"Scores: classification {cls:.1%}, extraction {ext:.1%}, type-mapping {tym:.1%}, model-gen coverage {gencov:.1%}")
print(f"Round-trip B: first {rt['first_pass']}/{rt['total']}, reached {rt['reached_valid']}/{rt['total']}")
print(f"Rules C: first {ru['first_pass']}/{ru['total']}, reached {ru['reached_valid']}/{ru['total']}")
