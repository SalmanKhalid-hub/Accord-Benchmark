# test_model_generation.py
# Stage A: generate ONE Concerto model from a clause and print it, to eyeball quality.

import os
from dotenv import load_dotenv
from openai import OpenAI

MODEL = "google/gemini-2.5-flash"
load_dotenv()
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])

clause = """In case of delayed delivery except for Force Majeure cases,
"Dan" (the Seller) shall pay to "Steve" (the Buyer) for every 2 days
of delay penalty amounting to 10.5% of the total value of the Equipment
whose delivery has been delayed. Any fractional part of a days is to be
considered a full days. The total amount of penalty shall not however,
exceed 55% of the total value of the Equipment involved in late delivery.
If the delay is more than 15 days, the Buyer is entitled to terminate this Contract."""

prompt = f"""You are an expert in the Accord Project's Concerto modelling language.
Given the legal clause below, generate a Concerto data model that captures every
variable in the clause as a typed property.

Requirements:
- Output ONLY valid Concerto code (a .cto model). No explanation, no markdown fences.
- Define a concept (or asset) holding one property per variable in the clause.
- Choose the most appropriate Concerto type for each property
  (e.g. String, Double, Integer, Boolean, DateTime, or domain types like
  Duration, MonetaryAmount if relevant).
- Include a namespace declaration at the top.

Clause:
{clause}
"""

response = client.chat.completions.create(
    model=MODEL,
    messages=[{"role": "user", "content": prompt}],
    temperature=0,
)
print(response.choices[0].message.content)
