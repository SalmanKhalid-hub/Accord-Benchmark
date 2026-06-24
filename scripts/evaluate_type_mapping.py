# evaluate_type_mapping.py
# Phase 3 bridge: run an LLM to assign a Concerto type to each variable; field-level scoring.

import json
import os
import time
from dotenv import load_dotenv
from openai import OpenAI

MODEL = "google/gemini-2.5-flash"
LIMIT = None # start small to test; set to None to run ALL

load_dotenv()
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])

with open("data/type_mapping.json") as f:
    all_questions = json.load(f)

# Type vocabulary = every type seen in the gold, so the correct type is always a valid option.
TYPE_VOCAB = sorted({t for q in all_questions for t in q["expected_output"].values()})

questions = all_questions[:LIMIT] if LIMIT else all_questions

def assign_types(question, max_retries=4):
    prompt = f"""You are assigning a data type to each variable in a legal contract clause.
For each variable below, choose the single most appropriate type from this list:
{TYPE_VOCAB}

Variables: {question['variables']}

Return ONLY a valid JSON object mapping each variable name to its chosen type. No extra text.

Clause:
{question['input']}
"""
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            if attempt < max_retries - 1:
                wait = 5 * (attempt + 1)
                print(f"   (retry {attempt + 1}/{max_retries} — waiting {wait}s)")
                time.sleep(wait)
            else:
                return None
    return None

def parse_json(text):
    if text is None:
        return None
    t = text.strip()
    if t.startswith("```"):
        t = t.strip("`")
        if t.lstrip().lower().startswith("json"):
            t = t.lstrip()[4:]
    try:
        return json.loads(t)
    except Exception:
        return None

def score(gold, predicted):
    if not isinstance(predicted, dict):
        return 0, len(gold)
    correct = sum(1 for k, v in gold.items()
                  if str(predicted.get(k)).strip().lower() == str(v).strip().lower())
    return correct, len(gold)

results = []
total_correct = 0
total_fields = 0
for i, q in enumerate(questions, start=1):
    raw = assign_types(q)
    predicted = parse_json(raw)
    correct, n = score(q["expected_output"], predicted)
    total_correct += correct
    total_fields += n
    results.append({"id": q["id"], "correct_fields": correct, "total_fields": n, "model_raw": raw})
    print(f"[{i}/{len(questions)}] {q['id']}: {correct}/{n} types correct")
    time.sleep(2)

accuracy = total_correct / total_fields if total_fields else 0
print(f"\n{MODEL}: {total_correct}/{total_fields} types correct = {accuracy:.1%} type-mapping accuracy")

os.makedirs("results", exist_ok=True)
with open("results/type_mapping_results.json", "w") as f:
    json.dump({"model": MODEL, "total_fields": total_fields, "correct_fields": total_correct,
               "type_accuracy": accuracy, "details": results}, f, indent=2)
print("Saved -> results/type_mapping_results.json")
