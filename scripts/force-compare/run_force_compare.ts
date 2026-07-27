// Force-mode comparison over the corpus.
// Three ways to execute a template, scored by AGREEMENT with the oracle (real TS logic):
//   oracle  = the hand-written logic.ts, run RAW (mock globals + import + call trigger)  = ground truth
//   gen     = the LLM-GENERATED logic.ts, run RAW the same way   (Salman's generate-and-run arm)
//   force   = Devanshi's LLM executor via TemplateArchiveProcessor mode:'force'  (execute-directly arm)
// oracle+gen use identical raw execution (exactly as the Vitest unit tests do, so ./generated value
// imports resolve and loadability matches the headline Task-4 numbers). force is the executor's only
// path. All three are compared to the raw oracle result, ignoring the runtime $timestamp.
//
//   MODEL=anthropic/claude-haiku-4.5 node_modules/.bin/ts-node --transpile-only \
//     -O '{"module":"commonjs","esModuleInterop":true}' force-compare/run_force_compare.ts
//   env knobs: LIMIT=3  NAME=<one>  STATEFUL_ONLY=1  STATELESS_ONLY=1
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Template } from '@accordproject/cicero-core';
import { Factory, Serializer } from '@accordproject/concerto-core';
import { TemplateArchiveProcessor } from '../src/TemplateArchiveProcessor';
import { LLMExecutorConfig } from '../src/llm/LLMConfig';
import { execSync } from 'child_process';

// FREEZE the clock: many templates compute time-dependent outputs via `new Date()`
// (e.g. late-penalty amounts continuous in elapsed time). Without a fixed instant the
// oracle and gen arms run milliseconds apart and can NEVER agree. Pin no-arg `new Date()`
// and Date.now() to one instant so time-dependent logic is deterministic across arms.
// (Node TLS uses the OS clock, not JS Date, so network calls are unaffected.)
const RealDate = Date;
const FROZEN = new RealDate('2024-06-01T00:00:00Z').getTime();
class FrozenDate extends RealDate {
  constructor(...args: any[]) { if (args.length === 0) super(FROZEN); else super(...(args as [])); }
  static now() { return FROZEN; }
}
(global as any).Date = FrozenDate;

// runtime globals the template logic expects (same mocks as the library's test-setup.js)
(global as any).TemplateLogic = class TemplateLogic { async init(_d: any) { return { state: {} }; } async trigger(_d: any, _r: any, _s: any) { return {}; } };
(global as any).EngineResponse = class EngineResponse { result: any = null; };
(global as any).InitResponse = class InitResponse { state: any = null; };

const LIB = '/Users/salman/Documents/TAP x Docusign/cicero-template-library-task4/src';
const BENCH = '/Users/salman/Documents/TAP x Docusign/Accord-Benchmark';
const MODEL = process.env.MODEL || 'anthropic/claude-haiku-4.5';
const CURRENT_TIME = '2024-06-01T00:00:00Z';   // aligned to the frozen clock
const DEMOS = new Set(['empty', 'empty-contract', 'hellomodule', 'helloworld', 'helloworldstate', 'eat-apples']);
const MODEL_DIR: Record<string, string> = { 'google/gemini-2.5-flash': 'gemini', 'anthropic/claude-haiku-4.5': 'claude', 'openai/gpt-5.4-mini': 'gpt' };
const modelDir = MODEL_DIR[MODEL] || MODEL.split('/').pop()!;
const GEN_DIR = path.join(BENCH, 'results', modelDir, 'logic_gen');

function readJson(p: string): any { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
function loadKey(): string { const m = fs.readFileSync(path.join(BENCH, '.env'), 'utf-8').match(/OPENROUTER_API_KEY=(.+)/); if (!m) throw new Error('no key'); return m[1].trim(); }
const API_KEY = loadKey();
function forceConfig(): LLMExecutorConfig { return { mode: 'force', provider: { provider: 'openai-compatible', customEndpoint: 'https://openrouter.ai/api/v1', apiKey: API_KEY, model: MODEL, maxTokens: 4096, isStructuredOutputSupported: true } }; }

// STORAGE form: strip only $timestamp (wall-clock, runtime). Keeps everything else so
// stored outputs can be re-scored offline under a different policy.
function stripTs(o: any): any {
  if (Array.isArray(o)) return o.map(stripTs);
  if (o && typeof o === 'object') { const out: any = {}; for (const [k, v] of Object.entries(o)) { if (k === '$timestamp') continue; out[k] = stripTs(v); } return out; }
  return o;
}
// COMPARE form: score on the COMPUTED, semantic fields only. Drop runtime $timestamp/$identifier
// and the free-text `description` (natural-language boilerplate — parties/amounts are the real
// payload, not the wording), and round numbers to kill float noise (110.00000000000001 -> 110).
const DROP = new Set(['$timestamp', '$identifier', 'description']);
function cmpNorm(o: any): any {
  if (Array.isArray(o)) return o.map(cmpNorm);
  if (o && typeof o === 'object') { const out: any = {}; for (const [k, v] of Object.entries(o)) { if (DROP.has(k)) continue; out[k] = cmpNorm(v); } return out; }
  if (typeof o === 'number') return Math.round(o * 1e6) / 1e6;
  return o;
}
// canonical (sorted-key) stringify so object key ORDER never causes a spurious mismatch
function sortKeys(o: any): any {
  if (Array.isArray(o)) return o.map(sortKeys);
  if (o && typeof o === 'object') { const out: any = {}; for (const k of Object.keys(o).sort()) out[k] = sortKeys(o[k]); return out; }
  return o;
}
// the full execution outcome = result + emitted events (many templates carry the payload in the event)
const outcome = (r: any) => r ? { result: stripTs(r.result), events: stripTs(r.events || []) } : null;
const eq = (a: any, b: any) => JSON.stringify(sortKeys(cmpNorm(a))) === JSON.stringify(sortKeys(cmpNorm(b)));
const isStateful = (name: string) => /async\s+init\s*\(/.test(fs.readFileSync(path.join(LIB, name, 'logic', 'logic.ts'), 'utf-8'));
const scenarios = (dir: string) => fs.readdirSync(dir).filter(f => /^request.*\.json$/.test(f)).sort().map(f => ({ name: f, request: readJson(path.join(dir, f)) }));

function qualifying(): string[] {
  return fs.readdirSync(LIB).filter(name => {
    if (DEMOS.has(name)) return false;
    const d = path.join(LIB, name);
    return fs.existsSync(path.join(d, 'logic', 'logic.ts')) && fs.existsSync(path.join(d, 'sample.json')) && fs.readdirSync(d).some(f => /^request.*\.json$/.test(f));
  }).sort();
}

// raw import of a logic.ts (fresh, uncached) -> the logic class instance
function rawLogicInstance(logicPath: string): any {
  delete require.cache[require.resolve(logicPath)];
  const mod = require(logicPath);
  const Logic = mod.default ?? mod;
  return new Logic();
}
// materialise the generated logic into a temp copy of the template so ./generated resolves; returns logic.ts path
function genLogicPath(dir: string, name: string): string | null {
  const genFile = path.join(GEN_DIR, `${name}.ts`);
  if (!fs.existsSync(genFile)) return null;
  const tdir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fc-')), 'template');
  fs.cpSync(dir, tdir, { recursive: true });
  fs.writeFileSync(path.join(tdir, 'logic', 'logic.ts'), fs.readFileSync(genFile, 'utf-8'));
  return path.join(tdir, 'logic', 'logic.ts');
}

async function main() {
  let names = qualifying();
  if (process.env.NAME) names = names.filter(n => n === process.env.NAME);
  if (process.env.STATEFUL_ONLY) names = names.filter(isStateful);
  if (process.env.STATELESS_ONLY) names = names.filter(n => !isStateful(n));
  if (process.env.LIMIT) names = names.slice(0, parseInt(process.env.LIMIT));

  const commit = execSync(`git -C "${path.dirname(LIB)}" rev-parse HEAD`).toString().trim();
  console.log(`=== Force compare | model=${MODEL} | ${names.length} templates | commit ${commit.slice(0, 10)} ===\n`);

  const details: any[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i]; const dir = path.join(LIB, name); const sf = isStateful(name);
    const data = readJson(path.join(dir, 'sample.json'));
    const scen = scenarios(dir);
    const oraclePath = path.join(dir, 'logic', 'logic.ts');
    const gPath = genLogicPath(dir, name);

    // oracle-init state (raw) so all arms trigger from the same valid state
    let state: any = undefined;
    if (sf) { try { state = (await rawLogicInstance(oraclePath).init(data)).state; } catch { state = undefined; } }

    // does the generated code even load?
    let genLoaded = false;
    if (gPath) { try { rawLogicInstance(gPath); genLoaded = true; } catch { genLoaded = false; } }

    // the force executor needs a Template object (its only execution path)
    const oracleTpl = await Template.fromDirectory(dir, { offline: true });

    // validator to drop stale/version-mismatched request fixtures (e.g. an @0.1.0 request
    // against an @0.2.0 model) fairly, before any arm is scored on them
    const mm = oracleTpl.getModelManager();
    const serializer = new Serializer(new Factory(mm), mm, { validate: true, acceptResourcesForRelationships: true });
    const validRequest = (r: any) => { try { serializer.fromJSON(r); return true; } catch { return false; } };

    const rec: any = { id: name, stateful: sf, n_scen: 0, gen_loaded: genLoaded, gen_match: 0, force_match: 0, force_error: 0, scen: [] };
    for (const s of scen) {
      if (!validRequest(s.request)) { rec.scen.push({ scen: s.name, skipped: 'invalid_request' }); continue; }
      let oOut: any;
      try { oOut = outcome(await rawLogicInstance(oraclePath).trigger(data, s.request, state)); }
      catch (e: any) { rec.scen.push({ scen: s.name, oracle_error: String(e.message || e).slice(0, 120) }); continue; }
      rec.n_scen++;   // count only scenarios with a valid request AND a ground-truth oracle result

      let gOut: any = null, genMatch: boolean | null = null;
      if (genLoaded) { try { gOut = outcome(await rawLogicInstance(gPath!).trigger(data, s.request, state)); genMatch = eq(gOut, oOut); } catch { genMatch = false; } }
      if (genMatch) rec.gen_match++;

      let fOut: any = null, forceMatch: boolean | null = null, ferr: string | undefined;
      try { fOut = outcome(await new TemplateArchiveProcessor(oracleTpl, forceConfig()).trigger(data, s.request, state, CURRENT_TIME)); forceMatch = eq(fOut, oOut); }
      catch (e: any) { forceMatch = false; ferr = String(e.message || e); rec.force_error++; }
      if (forceMatch) rec.force_match++;

      // store raw outcomes so metric tweaks can re-score OFFLINE (no re-spend on the LLM)
      rec.scen.push({ scen: s.name, gen: genMatch, force: forceMatch, o: oOut, g: gOut, f: fOut, ...(ferr ? { force_err: ferr.slice(0, 120) } : {}) });
    }
    details.push(rec);
    console.log(`[${i + 1}/${names.length}] ${name.padEnd(38)} ${sf ? 'ST' : '  '} scen=${rec.n_scen} gen=${genLoaded ? `${rec.gen_match}/${rec.n_scen}` : 'NOLOAD'} force=${rec.force_match}/${rec.n_scen}${rec.force_error ? ` (err${rec.force_error})` : ''}`);
  }

  const outDir = path.join(BENCH, 'results', modelDir); fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'force_compare_results.json');
  const merged: Record<string, any> = {};
  if (fs.existsSync(outPath)) for (const d of readJson(outPath).details || []) merged[d.id] = d;
  for (const d of details) merged[d.id] = d;
  const all = Object.values(merged).sort((a: any, b: any) => a.id.localeCompare(b.id));
  const sum = (f: (d: any) => number) => all.reduce((t, d) => t + f(d), 0);
  const genScen = sum(d => d.gen_loaded ? d.n_scen : 0), genOk = sum(d => d.gen_match);
  const forceScen = sum(d => d.n_scen), forceOk = sum(d => d.force_match);
  console.log(`\n=== ${MODEL} (merged, ${all.length} templates) ===`);
  console.log(`gen   agreement: ${genOk}/${genScen} = ${genScen ? (100 * genOk / genScen).toFixed(1) : '0'}%`);
  console.log(`force agreement: ${forceOk}/${forceScen} = ${forceScen ? (100 * forceOk / forceScen).toFixed(1) : '0'}%`);
  fs.writeFileSync(outPath, JSON.stringify({ model: MODEL, template_library_commit: commit, n_templates: all.length, gen_scenarios: genScen, gen_match: genOk, force_scenarios: forceScen, force_match: forceOk, details: all }, null, 2));
  console.log(`Saved -> results/${modelDir}/force_compare_results.json`);
}
main().catch(e => { console.error('FATAL:', e); process.exit(1); });
