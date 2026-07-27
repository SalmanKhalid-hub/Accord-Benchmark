# Force-mode execution-strategy comparison (Task 4 sub-study)

This directory archives the harness behind §4.8's execution-strategy comparison —
**generate-and-run** (the LLM writes `logic.ts`, run deterministically) vs
**execute-directly** (the Accord LLM *logic executor* computes each result directly,
`mode: 'force'`). Both are scored by **oracle-agreement** (result + emitted events match
the real hand-written logic) on each template's shipped `sample.json` + `request*.json`.

## Why it lives here as an archive

`run_force_compare.ts` imports the LLM executor from the `template-engine` package, so it
**runs from inside a `template-engine` checkout**, not from this repo. It is stored here so
the code behind every number in the write-up is version-controlled alongside the results.

## How to reproduce

1. Clone the executor's repo and check out the pinned commit (the executor + trigger/init
   tests are from Devanshi Chhatbar's PRs; the template library is pinned separately — see
   `../../TEMPLATE_LIBRARY_PIN.md`):
   ```
   git clone https://github.com/accordproject/template-engine
   cd template-engine
   npm install
   ```
2. Copy `run_force_compare.ts` into a `force-compare/` folder in that checkout (the relative
   imports `../src/...` assume it sits one level below `template-engine/src`).
3. Point the paths at the top of the script at your local `cicero-template-library` checkout
   (pinned to commit `a124064`) and your `Accord-Benchmark` folder (for the `.env` key and
   the archived generated logic under `results/<model>/logic_gen/`).
4. Run one model at a time (needs `OPENROUTER_API_KEY` in `Accord-Benchmark/.env`):
   ```
   MODEL=anthropic/claude-haiku-4.5 node_modules/.bin/ts-node --transpile-only \
     -O '{"module":"commonjs","esModuleInterop":true}' force-compare/run_force_compare.ts
   ```
   Repeat with `MODEL=google/gemini-2.5-flash` and `MODEL=openai/gpt-5.4-mini`.
   Optional env: `LIMIT=N`, `NAME=<template>`, `STATEFUL_ONLY=1`, `STATELESS_ONLY=1`.

Output is written to `Accord-Benchmark/results/<model>/force_compare_results.json`, which
stores the raw oracle/gen/force outputs per scenario so scoring can be re-run offline.

## Scoring and figures (this repo, no API calls)

```
python3.13 scripts/compute_force_stats.py     # Wilson CIs + paired McNemar, per model + pooled
python3.13 scripts/make_force_figure.py        # -> figures/comp7_force_mode.png
```

## Method notes (why the numbers are trustworthy)

- **Clock frozen** to a fixed instant, so time-dependent penalty amounts are deterministic
  across strategies (otherwise two runs seconds apart never agree).
- **Stale/version-mismatched request fixtures** (e.g. an `@0.1.0` request against an `@0.2.0`
  model) are validated against the model and skipped — fairly, for every strategy.
- Comparison scores **computed fields only**: runtime/cosmetic fields (`$timestamp`,
  `$identifier`, free-text `description`) are dropped, numbers rounded (float noise), and
  keys sorted (order-independent).
