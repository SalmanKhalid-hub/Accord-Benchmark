# evaluate_one_vs_two_stage.py
# Task 3 final experiment: does going straight to the model (1-stage) beat
# going via variables->types->model (2-stage)? Same clauses, same coverage metric.

import json, os, time
from collections import Counter
from dotenv import load_dotenv
from openai import OpenAI

MODEL = os.environ.get("BENCH_MODEL", "google/gemini-2.5-flash")
LIMIT = None
load_dotenv()
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])

with open("data/model_generation.json") as f:
    questions = json.load(f)
if LIMIT:
    questions = questions[:LIMIT]

TYPE_HINT = "String, Double, Integer, Long, Boolean, DateTime, Duration, MonetaryAmount, TemporalUnit"


def ask(prompt, max_retries=4):
    for attempt in range(max_retries):
        try:
            r = client.chat.completions.create(
                model=MODEL, messages=[{"role": "user", "content": prompt}], temperature=0)
            return r.choices[0].message.content.strip()
        except Exception:
            if attempt < max_retries - 1:
                time.sleep(5 * (attempt + 1))
            else:
                return None
    return None


def parse_json(text):
    if not text:
        return None
    t = text.strip()
    if t.startswith("```"):
        t = t.strip("`")
        nl = t.find("\n")
        if nl != -1 and t[:nl].strip().lower() in ("json", ""):
            t = t[nl + 1:]
    try:
        return json.loads(t)
    except Exception:
        return None


def parse_cto_types(cto_text):
    """Pull every 'o <Type> <name>' property type out of a generated .cto."""
    if not cto_text:
        return []
    if cto_text.strip().startswith("```"):
        cto_text = cto_text.strip("`")
    types = []
    for line in cto_text.splitlines():
        line = line.strip().rstrip(";").rstrip(",")
        if line.startswith("o ") or line.startswith("--> "):
            parts = line.split()
            if len(parts) >= 3:
                types.append(parts[1])
    return types


def recall(gold_types, pred_types):
    g, p = Counter(t.lower() for t in gold_types), Counter(t.lower() for t in pred_types)
    return sum((g & p).values()), sum(g.values())


# ---- 1-stage: clause -> model ----
def one_stage(clause):
    prompt = f"""You are an expert in the Accord Project Concerto modelling language.
Generate a Concerto data model capturing every variable in the clause as a typed property.
Output ONLY the .cto code. Choose appropriate types ({TYPE_HINT}).

Clause:
{clause}
"""
    return parse_cto_types(ask(prompt))


# ---- 2-stage: clause -> variables -> types ----
def two_stage(clause):
    p1 = f"""List the variables (data fields) in this legal clause.
Return ONLY a JSON array of short field names. No extra text.

Clause:
{clause}
"""
    variables = parse_json(ask(p1))
    if not isinstance(variables, list) or not variables:
        return []
    p2 = f"""For each variable below, assign the most appropriate Concerto type
(choose from: {TYPE_HINT}).
Return ONLY a JSON object mapping each variable to its type.

Variables: {variables}

Clause (for context):
{clause}
"""
    type_map = parse_json(ask(p2))
    if not isinstance(type_map, dict):
        return []
    return list(type_map.values())


one_c, one_g, two_c, two_g = 0, 0, 0, 0
one_wins, two_wins, ties = 0, 0, 0
results = []
for i, q in enumerate(questions, 1):
    gold = list(q["expected_output"].values())
    o_types = one_stage(q["input"])
    t_types = two_stage(q["input"])
    oc, og = recall(gold, o_types)
    tc, tg = recall(gold, t_types)
    one_c += oc; one_g += og; two_c += tc; two_g += tg
    if oc > tc: one_wins += 1
    elif tc > oc: two_wins += 1
    else: ties += 1
    results.append({"id": q["id"], "gold_n": og,
                    "one_stage_covered": oc, "two_stage_covered": tc,
                    "one_types": o_types, "two_types": t_types})
    print(f"[{i}/{len(questions)}] {q['id']}: 1-stage {oc}/{og}  |  2-stage {tc}/{tg}")
    time.sleep(1)

print(f"\n=== 1-stage vs 2-stage ({MODEL}) ===")
print(f"1-stage coverage: {one_c}/{one_g} = {one_c/one_g:.1%}")
print(f"2-stage coverage: {two_c}/{two_g} = {two_c/two_g:.1%}")
print(f"Per-template: 1-stage wins {one_wins}, 2-stage wins {two_wins}, ties {ties}")

os.makedirs("results", exist_ok=True)
with open("results/one_vs_two_stage_results.json", "w") as f:
    json.dump({"model": MODEL,
               "one_stage_recall": one_c / one_g, "two_stage_recall": two_c / two_g,
               "one_wins": one_wins, "two_wins": two_wins, "ties": ties,
               "details": results}, f, indent=2)
print("Saved -> results/one_vs_two_stage_results.json")
