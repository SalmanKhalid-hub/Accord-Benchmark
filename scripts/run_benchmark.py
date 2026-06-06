# run_benchmark.py
# Phase 1 slice: ask an AI model to classify ONE Accord clause.
#built one complete end-to-end example first — 
#a single clause, classified by an LLM, scored automatically.. to prove the pipeline worked before I scaled it


import json
import os
from dotenv import load_dotenv
from google import genai

# 1. Load the secret API key from the .env file (so it's never hardcoded)
load_dotenv()
api_key = os.environ["GEMINI_API_KEY"]

# 2. Read our one benchmark question from the JSON file
with open("data/clause_classification.json") as f:
    question = json.load(f)

# 3. Build the PROMPT — the instruction we send to the model
prompt = f"""You are classifying legal contract clauses.
Classify the clause below into exactly ONE of these categories:
{question['labels']}

Reply with ONLY the category name, nothing else.

Clause:
{question['input']}
"""

# 4. Send the prompt to Gemini and get its answer back
client = genai.Client(api_key=api_key)
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt,
)

# 5. Print what the model said
model_answer = response.text.strip()
print("Model answered:", model_answer)

# 6. SCORE the answer — compare the model's answer to the correct one
expected = question["expected_output"]
is_correct = model_answer.lower() == expected.lower()
score = 1 if is_correct else 0

print("Correct answer:", expected)
print("Result:", "✅ correct" if is_correct else "❌ wrong", f"(score: {score})")
