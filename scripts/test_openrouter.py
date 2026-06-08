import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
    max_retries=0,   # don't silently retry — show the error immediately
    timeout=60,
)

print("Calling model...")
try:
    r = client.chat.completions.create(
        model="meta-llama/llama-3.3-70b-instruct:free",
        messages=[{"role": "user", "content": "Say hello in one word."}],
    )
    print("SUCCESS:", r.choices[0].message.content)
except Exception as e:
    print("ERROR:", repr(e))
