# evaluate_variable_extraction.py
# Phase 2: run an LLM across the variable-extraction benchmark and score it (field-level).

import json
import os
import time
from dotenv import load_dotenv
from google import genai

MODEL = "gemini-2.5-flash"
LIMIT = 5   # start small; set to None to run ALL

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

with open("data/variable_extraction.json") as f:
    questions = json.load(f)
if LIMIT:
    questions = questions[:LIMIT]

def extract(question, max_retries=4):
    """Ask the model to extract the listed variables from the clause as JSON."""
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
            response = client.models.generate_content(model=MODEL, contents=prompt)
            return response.text.strip()
        except Exception as e:
            if attempt < max_retries - 1:
                wait = 5 * (attempt + 1)
                print(f"   (retry {attempt + 1}/{max_retries} — waiting {wait}s)")
                time.sleep(wait)
            else:
                return None
    return None

def parse_json(text):
    """Best-effort parse of the model's JSON answer (handles ```json code fences)."""
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
    """Field-level: how many gold fields did the model get right?"""
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
    time.sleep(4)

accuracy = total_correct / total_fields if total_fields else 0
print(f"\n{MODEL}: {total_correct}/{total_fields} fields correct = {accuracy:.1%} field-level accuracy")

os.makedirs("results", exist_ok=True)
with open("results/variable_extraction_results.json", "w") as f:
    json.dump({
        "model": MODEL,
        "total_fields": total_fields,
        "correct_fields": total_correct,
        "field_accuracy": accuracy,
        "details": results,
    }, f, indent=2)
print("Saved -> results/variable_extraction_results.json")
