# evaluate_classification.py
# Phase 2: run an LLM across the clause-classification benchmark and score it.

import json
import os
import time
from dotenv import load_dotenv
from google import genai

MODEL = "gemini-2.5-flash"
LIMIT = None  # start small like 5 to test; set to None to run ALL questions

# 1. Load API key + the benchmark questions
load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

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
            response = client.models.generate_content(model=MODEL, contents=prompt)
            return response.text.strip()
        except Exception as e:
            if attempt < max_retries - 1:
                wait = 5 * (attempt + 1)   # back off: wait 5s, then 10s, then 15s
                print(f"   (retry {attempt + 1}/{max_retries} after error — waiting {wait}s)")
                time.sleep(wait)
            else:
                return f"ERROR: {e}"
    return "ERROR: unreachable"


# 2. Run the model over each question and score it
results = []
correct = 0
for i, q in enumerate(questions, start=1):
    try:
        answer = classify(q)
    except Exception as e:
        answer = f"ERROR: {e}"
    is_correct = answer.lower() == q["expected_output"].lower()
    if is_correct:
        correct += 1
    results.append({
        "id": q["id"],
        "expected": q["expected_output"],
        "model_answer": answer,
        "correct": is_correct,
    })
    print(f"[{i}/{len(questions)}] {q['id']}: {answer}  ->  {'✅' if is_correct else '❌'}")
    time.sleep(4)  # stay under the free-tier rate limit

# 3. Report + save the results
accuracy = correct / len(questions) if questions else 0
print(f"\n{MODEL}: {correct}/{len(questions)} correct = {accuracy:.1%} accuracy")

os.makedirs("results", exist_ok=True)
with open("results/classification_results.json", "w") as f:
    json.dump({
        "model": MODEL,
        "total": len(questions),
        "correct": correct,
        "accuracy": accuracy,
        "details": results,
    }, f, indent=2)
print("Saved -> results/classification_results.json")
