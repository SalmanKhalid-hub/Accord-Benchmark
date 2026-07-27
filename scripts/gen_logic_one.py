# gen_logic_one.py
# Task 4 (logic synthesis) — generate ONE template's logic.ts with an LLM.
# Reads the clause + Concerto model, asks the model to write the logic, and SAVES it
# to logic.generated.ts (does NOT overwrite the real logic.ts). Inspect, then swap by hand.
#
# Run from the Accord-Benchmark folder (so .env with OPENROUTER_API_KEY is found):
#   BENCH_MODEL=anthropic/claude-haiku-4.5 python3 scripts/gen_logic_one.py
import os, re, glob
from dotenv import load_dotenv
from openai import OpenAI

TASK4 = os.path.expanduser("/Users/salman/Documents/TAP x Docusign/cicero-template-library-task4")
TEMPLATE = os.environ.get("TEMPLATE", "acceptance-of-delivery")
MODEL = os.environ.get("BENCH_MODEL", "anthropic/claude-haiku-4.5")

load_dotenv()
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])

tdir = os.path.join(TASK4, "src", TEMPLATE)

# --- read the clause (headings kept — the logic prompt benefits from them) ---
with open(os.path.join(tdir, "text", "sample.md")) as f:
    clause = f.read().strip()

# --- read the main Concerto model (the one with @template) ---
cto_text = ""
for path in glob.glob(os.path.join(tdir, "model", "*.cto")):
    txt = open(path).read()
    if "@template" in txt:
        cto_text = txt
        break

# --- pull the namespace, request type and response type out of the model ---
ns = re.search(r"namespace\s+(\S+)", cto_text)
namespace = ns.group(1) if ns else "unknown"
req = re.search(r"transaction\s+(\w+)\s+extends\s+Request", cto_text)
resp = re.search(r"transaction\s+(\w+)\s+extends\s+Response", cto_text)
req_type = req.group(1) if req else "Request"
resp_type = resp.group(1) if resp else "Response"

PROMPT = f"""You are an expert in the Accord Project's smart legal contract framework.
Write the TypeScript logic file (`logic.ts`) that implements the executable logic for the
clause below, following the Accord Project convention exactly.

CONVENTION you MUST follow:
- Import the needed TYPES from `./generated/{namespace}` (type names are the Concerto
  declarations prefixed with `I`, e.g. `ITemplateModel`, `I{req_type}`, `I{resp_type}`).
- `TemplateLogic` is a GLOBAL base class injected by the runtime. Do NOT import it from any
  package — just reference it directly, with `// @ts-ignore` on the class line.
- Define a class that `extends TemplateLogic<ITemplateModel>` and `default export` it.
- Implement `async trigger(data: ITemplateModel, request: I{req_type}): Promise<{{ result: I{resp_type} }}>`.
- Concerto DateTime values are JavaScript `Date` objects, never strings. Use `new Date()` for
  `$timestamp` — do NOT call `.toISOString()`.
- Return `{{ result: {{ $class: '{namespace}.{resp_type}', $timestamp: <a Date>, ...responseFields }} }}`.
- Output ONLY the TypeScript code. No markdown fences, no explanation.

The data model (Concerto):
{cto_text}

The clause:
{clause}
"""

print(f"# Generating logic for '{TEMPLATE}' with {MODEL} ...\n")
r = client.chat.completions.create(model=MODEL,
                                   messages=[{"role": "user", "content": PROMPT}],
                                   temperature=0)
code = r.choices[0].message.content.strip()
# strip markdown fences if the model added them
if code.startswith("```"):
    code = re.sub(r"^```[a-zA-Z]*\n", "", code)
    code = re.sub(r"\n```$", "", code)

out_path = os.path.join(tdir, "logic", "logic.generated.ts")
with open(out_path, "w") as f:
    f.write(code + "\n")

print(code)
print(f"\n# Saved -> {out_path}")
print(f"# (this did NOT touch the real logic.ts — inspect the above, then we swap it in)")
