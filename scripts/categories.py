# categories.py
# One source of truth for "which templates are near-duplicates of each other".
#
# Two templates are near-duplicates if their gold field-name sets overlap heavily
# (Jaccard >= THRESHOLD). Connected components of that relation are "categories".
# Used by (a) the synthetic generator's dedup check and (b) classification scoring,
# so a single definition drives both. This exists because the raw benchmark contains
# many near-identical sibling templates (e.g. the 5 latedeliveryandpenalty variants,
# the 3 employment-offer variants) that make exact-match classification unfair.
import json, os
from itertools import combinations

THRESHOLD = 0.60
HERE = os.path.dirname(__file__)

def jaccard(a, b):
    u = a | b
    return len(a & b) / len(u) if u else 0.0

def _field_sets():
    """Gold field-name set per template, from the model-generation benchmark."""
    with open(os.path.join(HERE, "..", "data", "model_generation.json")) as f:
        data = json.load(f)
    return {q["id"].rsplit("-", 2)[0]: set(q["expected_output"].keys()) for q in data}

def build_categories(field_sets=None, threshold=THRESHOLD):
    """Return {template_name: category_id}. category_id is the alphabetically-first member."""
    fs = field_sets or _field_sets()
    parent = {n: n for n in fs}
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    def union(a, b):
        parent[find(a)] = find(b)
    for a, b in combinations(sorted(fs), 2):
        if jaccard(fs[a], fs[b]) >= threshold:
            union(a, b)
    from collections import defaultdict
    members = defaultdict(list)
    for n in fs:
        members[find(n)].append(n)
    cat_of = {}
    for group in members.values():
        cid = sorted(group)[0]
        for n in group:
            cat_of[n] = cid
    return cat_of

def is_near_duplicate(new_fields, existing_field_sets, threshold=THRESHOLD):
    """True if new_fields (a set/list of names) is a near-duplicate of any existing set."""
    nf = set(new_fields)
    return any(jaccard(nf, es) >= threshold for es in existing_field_sets)

if __name__ == "__main__":
    cat = build_categories()
    from collections import Counter
    sizes = Counter(cat.values())
    multi = {c: n for c, n in Counter(cat.values()).items()}
    n_cats = len(set(cat.values()))
    n_multi = sum(1 for c in set(cat.values()) if list(cat.values()).count(c) > 1)
    print(f"{len(cat)} templates -> {n_cats} categories ({n_multi} are near-duplicate clusters)")
