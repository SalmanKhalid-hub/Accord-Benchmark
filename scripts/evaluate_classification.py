# evaluate_classification.py
# Phase 2: run an LLM (via OpenRouter) across the clause-classification benchmark and score it.

import json
import os
import time
from dotenv import load_dotenv
from openai import OpenAI

MODEL = os.environ.get("BENCH_MODEL", "google/gemini-2.5-flash")

LIMIT = None  # start small to test; set to None to run ALL

# 1. Connect to OpenRouter (it speaks the OpenAI API "language")
load_dotenv()
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)

with open("data/clause_classification.json") as f:
    questions = json.load(f)
if LIMIT:
    questions = questions[:LIMIT]

def classify(question, max_retries=4):
    """Ask the model to classify one clause; retry on transient errors."""
    prompt = f"""You are classifying legal contract clauses.
Classify the clause below into exactly ONE of these categories:
{question['labels']}

Reply with ONLY the category name, nothing else.

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
                print(f"   (retry {attempt + 1}/{max_retries} after error — waiting {wait}s)")
                time.sleep(wait)
            else:
                return f"ERROR: {e}"
    return "ERROR: unreachable"

results = []
correct = 0
for i, q in enumerate(questions, start=1):
    answer = classify(q)
    is_correct = answer.lower() == q["expected_output"].lower()
    if is_correct:
        correct += 1
    results.append({"id": q["id"], "expected": q["expected_output"],
                    "model_answer": answer, "correct": is_correct})
    print(f"[{i}/{len(questions)}] {q['id']}: {answer}  ->  {'✅' if is_correct else '❌'}")
    time.sleep(2)

accuracy = correct / len(questions) if questions else 0
print(f"\n{MODEL}: {correct}/{len(questions)} correct = {accuracy:.1%} accuracy")

os.makedirs("results", exist_ok=True)
with open("results/classification_results.json", "w") as f:
    json.dump({"model": MODEL, "total": len(questions), "correct": correct,
               "accuracy": accuracy, "details": results}, f, indent=2)
print("Saved -> results/classification_results.json")
