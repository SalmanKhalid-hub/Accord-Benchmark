# generate_synthetic_templates.py
# Synthetic Accord-format templates to expand + de-skew the benchmark.
# A STRONG generator model (different from the models under test) produces {fields, clause_text};
# Python assembles a guaranteed-valid .cto; a QUALITY GATE (compile + value-consistency + dedup)
# rejects anything that doesn't pass. Output mimics the real template folder structure so the
# existing generate_*.py scripts derive gold identically.
import os, re, json, subprocess, tempfile, time
from openai import OpenAI
from dotenv import load_dotenv

GEN_MODEL = os.environ.get("GEN_MODEL", "anthropic/claude-sonnet-5")  # strong; NOT a model under test
OUT_DIR = "synthetic-templates/src"
NODE_PATH = os.path.expanduser("~/.npm-global/lib/node_modules/@accordproject/concerto-cli/node_modules")
VALIDATOR = "scripts/validate_cto.js"
PRIMS = {"String", "Double", "Integer", "Long", "Boolean", "DateTime"}

# category -> how many to generate. Balanced across the legal domains MISSING from the 51
# real templates (employment, IP, data-protection, real-estate, services, dispute, financial,
# corporate) to de-skew the benchmark. Resumable: re-running skips names already written.
CATEGORIES = {
    # Employment
    "employment-offer": 3, "non-compete": 3, "severance-agreement": 3, "employment-termination": 3,
    # Confidentiality
    "nda-mutual": 3, "nda-oneway": 3, "confidentiality-clause": 3,
    # IP & licensing
    "software-license": 3, "trademark-license": 3, "ip-assignment": 3, "patent-license": 2, "content-licensing": 2,
    # Data protection
    "data-processing-agreement": 3, "gdpr-privacy-clause": 3, "data-breach-notification": 2,
    # Real estate
    "commercial-lease": 3, "residential-lease": 3, "sublease-agreement": 2, "property-purchase": 2,
    # Services
    "consulting-agreement": 3, "statement-of-work": 3, "service-retainer": 2, "maintenance-agreement": 2,
    # Dispute / liability
    "limitation-of-liability": 3, "indemnification-clause": 3, "arbitration-clause": 3, "warranty-clause": 2,
    # Financial
    "loan-agreement": 3, "personal-guarantee": 2, "insurance-clause": 2,
    # Corporate / commercial
    "shareholder-agreement": 3, "distribution-agreement": 3, "advertising-agreement": 2, "franchise-fee": 2,
}

load_dotenv()
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])

PROMPT = """You are generating a synthetic legal clause for a benchmark of Accord Project smart legal contracts.
Category: "{category}".

Produce ONE realistic, self-contained {category} contract clause and its data model.
Return ONLY a JSON object (no prose, no code fences):
{{
  "fields": [
    {{"name": "<camelCaseVariableName>", "type": "<String|Double|Integer|Long|Boolean|DateTime>", "value": "<value exactly as it appears in the clause>"}}
  ],
  "clause_text": "<the full clause prose, 2-5 sentences>"
}}

Rules:
- Between 4 and 9 fields.
- Types: DateTime for dates (ISO value like 2024-03-01), Double for money/percentages, Integer for whole counts, Boolean for yes/no, String otherwise.
- For String, Double, Integer, Long and DateTime fields, the value MUST appear VERBATIM inside clause_text.
- For Boolean fields, express the condition NATURALLY in prose (e.g. "this license is not perpetual") — do NOT write the words "true"/"false" and do NOT name the field.
- NEVER mention the category name or any field name inside clause_text — write natural legal prose only.
- Make it read like a real legal clause."""


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def ask_model(category, tries=4):
    for _ in range(tries):
        try:
            r = client.chat.completions.create(
                model=GEN_MODEL, temperature=0.7,  # some variety across items
                messages=[{"role": "user", "content": PROMPT.format(category=category)}])
            txt = r.choices[0].message.content.strip()
            if txt.startswith("```"):
                txt = txt.strip("`")
                txt = txt[txt.find("\n") + 1:] if "\n" in txt else txt
            return json.loads(txt[txt.find("{"): txt.rfind("}") + 1])
        except Exception as e:
            time.sleep(2)
    return None


def build_cto(name, fields):
    """Assemble a guaranteed-valid Concerto model from fields (Python controls syntax)."""
    ns = "org.synthetic." + name.replace("-", "")
    lines = [f"namespace {ns}@1.0.0", "", "@template", "concept TemplateModel {"]
    for f in fields:
        lines.append(f"  o {f['type']} {f['name']}")
    lines.append("}")
    return "\n".join(lines)


def validate_cto(cto_text):
    with tempfile.NamedTemporaryFile("w", suffix=".cto", delete=False) as f:
        f.write(cto_text); path = f.name
    try:
        env = dict(os.environ, NODE_PATH=NODE_PATH)
        r = subprocess.run(["node", VALIDATOR, path], capture_output=True, text=True, env=env)
        return r.returncode == 0, r.stdout.strip()
    finally:
        os.unlink(path)


def quality_gate(item):
    """Return (ok, reason). Checks field types, value-in-text consistency, and compile."""
    fields = item.get("fields"); text = item.get("clause_text", "")
    if not fields or not text:
        return False, "missing fields or clause_text"
    if not (4 <= len(fields) <= 9):
        return False, f"field count {len(fields)} out of range"
    names = set()
    for f in fields:
        if f.get("type") not in PRIMS:
            return False, f"bad type {f.get('type')}"
        if not f.get("name") or f["name"] in names:
            return False, "missing/duplicate field name"
        names.add(f["name"])
        if f["type"] != "Boolean" and str(f.get("value", "")).strip() and str(f["value"]) not in text:
            return False, f"value '{f['value']}' not in clause text"  # Booleans are expressed in prose, not verbatim
    return True, "ok"


def write_template(name, fields, text):
    base = os.path.join(OUT_DIR, name)
    os.makedirs(os.path.join(base, "text"), exist_ok=True)
    os.makedirs(os.path.join(base, "model"), exist_ok=True)
    with open(os.path.join(base, "text", "sample.md"), "w") as f:
        f.write(f"# Clause\n\n{text}\n")
    with open(os.path.join(base, "model", "model.cto"), "w") as f:
        f.write(build_cto(name, fields) + "\n")
    with open(os.path.join(base, "sample.json"), "w") as f:
        json.dump({fl["name"]: fl["value"] for fl in fields}, f, indent=2)


os.makedirs(OUT_DIR, exist_ok=True)
existing = set(os.listdir(OUT_DIR)) if os.path.isdir(OUT_DIR) else set()
made, rejected = [], []
for category, n in CATEGORIES.items():
    for i in range(1, n + 1):
        name = f"{slugify(category)}-{i:02d}"
        if name in existing:
            continue
        item = ask_model(category)
        if item is None:
            rejected.append((name, "generation failed")); continue
        ok, reason = quality_gate(item)
        if ok:
            cto_ok, msg = validate_cto(build_cto(name, item["fields"]))
            if not cto_ok:
                ok, reason = False, f"cto invalid: {msg}"
        if not ok:
            rejected.append((name, reason)); print(f"  REJECT {name}: {reason}"); continue
        write_template(name, item["fields"], item["clause_text"])
        made.append(name); print(f"  OK     {name}  ({len(item['fields'])} fields)")

print(f"\nGenerated {len(made)} synthetic templates -> {OUT_DIR}")
if rejected:
    print(f"Rejected {len(rejected)}: {rejected}")
