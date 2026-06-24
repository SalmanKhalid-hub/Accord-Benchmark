# evaluate_model_generation.py
# Task 3 / Stage B: generate a Concerto model from each clause; score by TYPE-MULTISET RECALL.
# (Naming varies across models, so we score the bag of types captured, not field names.)

from numba.core.types import none
import json
import os
import re
import time
from collections import Counter
from dotenv import load_dotenv
from openai import OpenAI

MODEL = "google/gemini-2.5-flash"
LIMIT = None  # set to a small int to test; None = run all

load_dotenv()
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])

with open("data/model_generation.json") as f:
    questions = json.load(f)
if LIMIT:
    questions = questions[:LIMIT]


def generate_model(clause, max_retries=4):
    prompt = f"""You are an expert in the Accord Project's Concerto modelling language.
Given the legal clause below, generate a Concerto data model that captures every
variable in the clause as a typed property.

Requirements:
- Output ONLY valid Concerto code (a .cto model). No explanation, no markdown fences.
- Define a concept holding one property per variable in the clause.
- Choose the most appropriate Concerto type for each property
  (String, Double, Integer, Long, Boolean, DateTime, or domain types like
  Duration, MonetaryAmount, TemporalUnit where relevant).
- Include a namespace declaration at the top.

Clause:
{clause}
"""
    for attempt in range(max_retries):
        try:
            r = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )
            return r.choices[0].message.content.strip()
        except Exception:
            if attempt < max_retries - 1:
                wait = 5 * (attempt + 1)
                print(f"   (retry {attempt + 1}/{max_retries} — waiting {wait}s)")
                time.sleep(wait)
            else:
                return None
    return None


def parse_generated_types(cto_text):
    """Pull every 'o <Type> <name>' / '--> <Type> <name>' property out of generated Concerto."""
    if not cto_text:
        return []
    types = []
    for line in cto_text.splitlines():
        line = line.strip().rstrip(";").rstrip(",")
        if line.startswith("o ") or line.startswith("--> "):
            parts = line.split()
            if len(parts) >= 3:
                types.append(parts[1])   # the type token
    return types


def type_recall(gold_types, pred_types):
    """How many gold types are covered by the generated model's types (as a multiset)?"""
    gold_bag = Counter(t.lower() for t in gold_types)
    pred_bag = Counter(t.lower() for t in pred_types)
    overlap = sum((gold_bag & pred_bag).values())
    return overlap, sum(gold_bag.values())


results = []
total_covered = 0
total_gold = 0
for i, q in enumerate(questions, start=1):
    raw = generate_model(q["input"])
    gold_types = list(q["expected_output"].values())
    pred_types = parse_generated_types(raw)
    covered, n = type_recall(gold_types, pred_types)
    total_covered += covered
    total_gold += n
    results.append({
        "id": q["id"],
        "gold_field_count": len(gold_types),
        "pred_field_count": len(pred_types),
        "types_covered": covered,
        "gold_types": gold_types,
        "pred_types": pred_types,
        "model_raw": raw,
    })
    print(f"[{i}/{len(questions)}] {q['id']}: {covered}/{n} types covered "
          f"({len(pred_types)} fields generated vs {len(gold_types)} gold)")
    time.sleep(2)

recall = total_covered / total_gold if total_gold else 0
print(f"\n{MODEL}: {total_covered}/{total_gold} gold types covered = {recall:.1%} type-multiset recall")

os.makedirs("results", exist_ok=True)
with open("results/model_generation_results.json", "w") as f:
    json.dump({"model": MODEL, "total_gold_types": total_gold, "types_covered": total_covered,
               "type_recall": recall, "details": results}, f, indent=2)
print("Saved -> results/model_generation_results.json")
