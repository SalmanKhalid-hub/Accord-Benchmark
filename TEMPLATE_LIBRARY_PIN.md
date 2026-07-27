# Template Library Pin

This benchmark scores model output against gold answers derived from the Accord
Project **Cicero Template Library**. To keep every result reproducible, the
library is pinned to a single commit. All numbers in the dissertation and in
`results/` are scored against **this exact version**.

| Field | Value |
|---|---|
| Repository | https://github.com/accordproject/cicero-template-library |
| Pinned commit | `3afcccc683e13ced6a22a9740c2fd2d63a6a697c` |
| Commit subject | docs: add CLAUDE.md with repo conventions and migration notes (#514) |
| Branch it came from | `main` |
| Pinned on | 2026-07-20 |

## Why this is pinned
The library is a live open-source project with open pull requests (including one
from an Accord GSoC contributor that touches sample payloads and logic files). If
that library changes and the local copy is updated, the gold answers would change
underneath the benchmark and the published numbers would stop reproducing. Pinning
to a fixed commit removes that risk.

## How it was pinned
The local clone at `../cicero-template-library` was checked out to the commit
above (detached HEAD), so it will not move when the upstream project changes:

```
cd ../cicero-template-library
git checkout 3afcccc683e13ced6a22a9740c2fd2d63a6a697c
```

## How to reproduce these results
Anyone re-running the benchmark must first check out the same commit:

```
git clone https://github.com/accordproject/cicero-template-library
cd cicero-template-library
git checkout 3afcccc683e13ced6a22a9740c2fd2d63a6a697c
```

Every file written under `results/` also stamps this commit in a
`template_library_commit` field, so each result records the exact library version
it was scored against.

## Task 4 (logic synthesis) — a different pin

Task 4 needs the **trigger/init tests**, which are **not** in upstream `main` — they are
in an open PR by an Accord GSoC contributor (Devanshi Chhatbar). So Task 4 is scored
against a **different snapshot** than Tasks 1–3, cloned separately at
`../cicero-template-library-task4`.

| Field | Value |
|---|---|
| Source | `accordproject/cicero-template-library` **PR #520** (open at time of use) |
| Pinned commit | `a124064eced203b53e1f2f49c6373b764fb29797` |
| Local branch | `pr-520` |
| Pinned on | 2026-07-22 |
| Why a separate pin | trigger execution / `init` tests are added by this PR, not present in `main` (`3afcccc`) |

Because the PR is still under review, Task 4 results are a **point-in-time evaluation**
of that specific commit, and the contributor's executor and tests are cited as such.
To reproduce: `git fetch origin pull/520/head:pr-520 && git checkout a124064eced203b53e1f2f49c6373b764fb29797`.
