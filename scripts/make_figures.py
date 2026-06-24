# make_figures.py
# EDA of the benchmark dataset + publication-quality result charts for the dissertation draft.
# Outputs PNGs to figures/ and prints summary stats.

import json, os
from collections import Counter
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

os.makedirs("figures", exist_ok=True)
plt.rcParams.update({"figure.dpi": 150, "font.size": 11, "axes.spysine.top": False} if False else {"figure.dpi": 150, "font.size": 11})
ACCENT = "#2a6f97"
ACCENT2 = "#e09f3e"


def load(p):
    return json.load(open(p))


# ---------- EDA on the dataset ----------
gen = load("data/model_generation.json")
var_counts = {q["id"].replace("-modelgen-01", ""): len(q["expected_output"]) for q in gen}
all_types = Counter(t for q in gen for t in q["expected_output"].values())
n_templates = len(gen)
total_vars = sum(var_counts.values())
counts = sorted(var_counts.values())
mean_v = total_vars / n_templates
median_v = counts[len(counts) // 2]

# thematic buckets (keyword heuristic) to show the supply/goods skew (Matt's concern)
def bucket(name):
    n = name.lower()
    if any(k in n for k in ["latedelivery", "late-delivery", "delivery", "goods", "bill-of-lading",
                            "acceptance", "fragile", "perishable", "supply", "demandforecast",
                            "volumediscount", "car-rental", "rental"]):
        return "Supply / goods / logistics"
    if any(k in n for k in ["payment", "invoice", "pay", "interest", "promissory", "saft", "safte",
                            "installment", "fixed-interest"]):
        return "Payment / financial"
    if any(k in n for k in ["information", "certificate", "signature", "company", "contact",
                            "project", "copyright", "ip-", "docusign", "servicelevel", "sales-contract"]):
        return "Corporate / informational / other"
    return "Corporate / informational / other"

themes = Counter(bucket(name) for name in var_counts)

print("=== DATASET EDA ===")
print(f"templates: {n_templates}, total variables: {total_vars}")
print(f"variables/template: mean {mean_v:.1f}, median {median_v}, min {counts[0]}, max {counts[-1]}")
print("top types:", all_types.most_common(10))
print("themes:", dict(themes))

# Fig 1: Concerto type distribution
top = all_types.most_common(12)
plt.figure(figsize=(8, 4.5))
plt.barh([t for t, _ in top][::-1], [c for _, c in top][::-1], color=ACCENT)
plt.xlabel("Occurrences across all templates")
plt.title("Figure 1. Distribution of Concerto types in the benchmark gold models")
plt.tight_layout(); plt.savefig("figures/fig1_type_distribution.png"); plt.close()

# Fig 2: variables-per-template histogram
plt.figure(figsize=(7, 4))
plt.hist(counts, bins=range(0, max(counts) + 3, 2), color=ACCENT, edgecolor="white")
plt.xlabel("Variables per template"); plt.ylabel("Number of templates")
plt.title("Figure 2. Template complexity (variables per template)")
plt.tight_layout(); plt.savefig("figures/fig2_variable_counts.png"); plt.close()

# Fig 3: thematic distribution (skew)
th = themes.most_common()
plt.figure(figsize=(7, 4))
plt.bar([t for t, _ in th], [c for _, c in th], color=[ACCENT, ACCENT2, "#8d99ae"])
plt.ylabel("Number of templates")
plt.title("Figure 3. Thematic skew of the template library")
plt.xticks(rotation=12, ha="right", fontsize=9)
plt.tight_layout(); plt.savefig("figures/fig3_theme_skew.png"); plt.close()

# ---------- Results charts ----------
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
plt.figure(figsize=(7, 4))
bars = plt.bar([str(t) for t in xs], ys, color=[ACCENT] * (len(xs) - 1) + ["#c1121f"])
for b, v in zip(bars, ys):
    plt.text(b.get_x() + b.get_width() / 2, v + 0.3, str(v), ha="center", fontsize=10)
plt.xlabel("Round trips to reach valid"); plt.ylabel("Number of templates")
plt.title("Figure 6. Round trips needed to self-correct to valid Concerto (naive start)")
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
