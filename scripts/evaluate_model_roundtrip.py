# evaluate_model_roundtrip.py
# Task 3 / Round-tripping: generate -> validate -> feed ACTIONABLE error back -> fix -> repeat.
# Two conditions via RULES_IN_PROMPT:
#   False = naive start, learns from actionable compiler feedback (the round-trip experiment)
#   True  = Concerto rules stated upfront (first-pass validity ceiling)
# Measures how many round trips it takes to reach a valid model.

import json, os, subprocess, tempfile, time
from collections import Counter
from dotenv import load_dotenv
from openai import OpenAI

MODEL = os.environ.get("BENCH_MODEL", "google/gemini-2.5-flash")
MAX_TRIES = 5
LIMIT = None                # run all 51
RULES_IN_PROMPT = True     # False = round-trip experiment; True = rules-upfront ceiling
NODE_PATH = os.path.expanduser(
    "~/.npm-global/lib/node_modules/@accordproject/concerto-cli/node_modules")
VALIDATOR = "scripts/validate_cto.js"

load_dotenv()
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])

with open("data/model_generation.json") as f:
    questions = json.load(f)
if LIMIT:
    questions = questions[:LIMIT]

RULES = """Concerto syntax rules you MUST follow exactly:
- Do NOT put semicolons (;) at the end of properties. Concerto does not use them.
- The namespace MUST be versioned, e.g.  namespace org.example@1.0.0
- Declare each property as:  o <Type> <name>   (e.g.  o String buyer)
- Use ONLY these primitive types (no imports needed): String, Double, Integer, Long, Boolean, DateTime.
- If a value is a money amount, duration, etc., still model it with these primitives
  (e.g. o Double penaltyPercentage, o Long penaltyDays) so the model is self-contained.
- Do NOT import external models."""

BASE_PROMPT = """You are an expert in the Accord Project Concerto modelling language.
Given the legal clause below, generate a Concerto data model capturing every variable as a typed property.

{rules}

Output ONLY the .cto code. No explanation, no markdown fences.

Clause:
{clause}
"""


def clean(raw):
    if not raw:
        return ""
    t = raw.strip()
    if t.startswith("```"):
        t = t.strip("`")
        nl = t.find("\n")
        if nl != -1 and t[:nl].strip().lower() in ("cto", "concerto"):
            t = t[nl + 1:]
    return t.strip()


def validate(cto_text):
    with tempfile.NamedTemporaryFile("w", suffix=".cto", delete=False) as f:
        f.write(cto_text)
        path = f.name
    try:
        env = dict(os.environ, NODE_PATH=NODE_PATH)
        r = subprocess.run(["node", VALIDATOR, path], capture_output=True, text=True, env=env)
        return r.returncode == 0, r.stdout.strip().replace("INVALID: ", "")
    finally:
        os.unlink(path)


def actionable(err):
    """Translate a cryptic validator error into plain guidance the model can act on."""
    hints = []
    if '";"' in err or "';'" in err:
        hints.append("You used semicolons — remove ALL semicolons from property lines.")
    if "unversioned namespace" in err:
        hints.append("Your namespace has no version — write it as  namespace <name>@1.0.0")
    if "Undeclared type" in err or "Could not find" in err or "import" in err.lower():
        hints.append("You used a type that isn't defined — use only String, Double, Integer, "
                     "Long, Boolean, DateTime, or define the concept yourself. Do not import.")
    guidance = " ".join(hints) if hints else "Fix the syntax so it is valid Concerto."
    return (f"The model is INVALID. Validator said:\n{err}\n\nGuidance: {guidance}\n\n"
            f"Return the corrected, COMPLETE .cto. Output ONLY code.")


def ask(messages, max_retries=4):
    for attempt in range(max_retries):
        try:
            r = client.chat.completions.create(model=MODEL, messages=messages, temperature=0)
            return r.choices[0].message.content.strip()
        except Exception:
            if attempt < max_retries - 1:
                time.sleep(5 * (attempt + 1))
            else:
                return None
    return None


results, valid_total, tries_to_valid, first_pass = [], 0, [], 0
for i, q in enumerate(questions, 1):
    rules_text = RULES if RULES_IN_PROMPT else "Output ONLY valid Concerto code."
    messages = [{"role": "user", "content": BASE_PROMPT.format(rules=rules_text, clause=q["input"])}]
    history, became_valid = [], False
    for attempt in range(1, MAX_TRIES + 1):
        raw = ask(messages)
        cto = clean(raw)
        ok, msg = validate(cto)
        history.append({"attempt": attempt, "valid": ok, "error": msg})
        if ok:
            became_valid = True
            valid_total += 1
            tries_to_valid.append(attempt)
            if attempt == 1:
                first_pass += 1
            break
        messages.append({"role": "assistant", "content": raw or ""})
        messages.append({"role": "user", "content": actionable(msg)})
        time.sleep(1)
    results.append({"id": q["id"], "valid": became_valid,
                    "tries": history[-1]["attempt"] if became_valid else None, "history": history})
    print(f"[{i}/{len(questions)}] {q['id']}: "
          + (f"VALID in {history[-1]['attempt']} try(s)" if became_valid
             else f"NEVER valid ({MAX_TRIES} tries)"))
    time.sleep(1)

n = len(questions)
print(f"\n=== Round-tripping ({MODEL}, max {MAX_TRIES} tries, RULES_IN_PROMPT={RULES_IN_PROMPT}) ===")
print(f"Valid on FIRST pass: {first_pass}/{n} = {first_pass/n:.1%}")
print(f"Reached valid (with round-trips): {valid_total}/{n} = {valid_total/n:.1%}")
if tries_to_valid:
    dist = Counter(tries_to_valid)
    print(f"Mean tries (among successes): {sum(tries_to_valid)/len(tries_to_valid):.2f}")
    for t in sorted(dist):
        print(f"  {t} try(s): {dist[t]} models")

os.makedirs("results", exist_ok=True)
suffix = "rules" if RULES_IN_PROMPT else "roundtrip"
with open(f"results/model_{suffix}_results.json", "w") as f:
    json.dump({"model": MODEL, "max_tries": MAX_TRIES, "rules_in_prompt": RULES_IN_PROMPT,
               "first_pass": first_pass, "reached_valid": valid_total, "total": n,
               "details": results}, f, indent=2)
print(f"Saved -> results/model_{suffix}_results.json")
