# evaluate_variable_extraction.py
# Phase 2: run an LLM (via OpenRouter) across the variable-extraction benchmark; field-level scoring.

import json
import os
import time
from dotenv import load_dotenv
from openai import OpenAI

MODEL = "google/gemini-2.5-flash"
LIMIT = None   # start small; set to None to run ALL

load_dotenv()
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])

with open("data/variable_extraction.json") as f:
    questions = json.load(f)
if LIMIT:
    questions = questions[:LIMIT]

def extract(question, max_retries=4):
    fields = list(question["expected_output"].keys())
    prompt = f"""You are extracting variables from a legal contract clause.
Extract the value for each of these fields from the clause below:
{fields}

Return ONLY a valid JSON object mapping each field to its value. No extra text.

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
    correct = 0
    for key, gold_val in gold.items():
        if str(predicted.get(key)).strip().lower() == str(gold_val).strip().lower():
            correct += 1
    return correct, len(gold)

results = []
total_correct = 0
total_fields = 0
for i, q in enumerate(questions, start=1):
    raw = extract(q)
    predicted = parse_json(raw)
    correct, n = score(q["expected_output"], predicted)
    total_correct += correct
    total_fields += n
    results.append({"id": q["id"], "correct_fields": correct, "total_fields": n, "model_raw": raw})
    print(f"[{i}/{len(questions)}] {q['id']}: {correct}/{n} fields correct")
    time.sleep(2)

accuracy = total_correct / total_fields if total_fields else 0
print(f"\n{MODEL}: {total_correct}/{total_fields} fields correct = {accuracy:.1%} field-level accuracy")

os.makedirs("results", exist_ok=True)
with open("results/variable_extraction_results.json", "w") as f:
    json.dump({"model": MODEL, "total_fields": total_fields, "correct_fields": total_correct,
               "field_accuracy": accuracy, "details": results}, f, indent=2)
print("Saved -> results/variable_extraction_results.json")
