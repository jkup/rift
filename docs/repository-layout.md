# Repository layout

## Maintained source and tooling

| Root entry | Purpose |
| --- | --- |
| `src/` | Interpreter, semantic core and host CLI/observation entry points. |
| `test/` | Host drivers, expected results and focused guest fixtures. |
| `fixtures/` | Runtime inputs consumed by tests, reference oracles and the preserved legacy corpus. |
| `probes/` | Small compiler-contract programs used by `npm run test:probes` and TypeScript checks. |
| `examples/` | The counter program used by the quick start. |
| `tools/` | Build, test, Test262, data-generation and readability tooling. |
| `toolchain/` | Source pin, patches, checksums and setup for patched scriptc. |
| `docs/` | Current guides, feature notes, provenance, licenses and historical evidence. |
| `.github/` | CI workflow for readability and Node regressions. |

## Root files

| Files | Purpose |
| --- | --- |
| `README.md`, `CONTRIBUTING.md`, `LICENSE` | Entry point, contributor workflow and MIT license. |
| `AGENTS.md` | Shared coding-agent instructions. |
| `TASKS.md`, `COORDINATION.md` | Short current task/acceptance and checkout-ownership records. |
| `package.json`, `package-lock.json`, `tsconfig.json` | Commands, pinned dependencies and TypeScript compilation. |
| `.editorconfig`, `.gitignore` | Editor defaults and generated/local-file exclusions. |
| `.oxfmtrc.json`, `.oxlintrc.json`, `.oxlint-typed.json` | Formatter and lint policies. |
| `.readability-baseline.json` | Measured existing structural debt; new/growing violations fail. |

## Local generated directories

`node_modules/`, `build/`, `.scriptc/` and `.cache/` are ignored and are not
part of a fresh clone. `build/` can contain expensive compiler builds, downloaded
corpora and unrepeated local validation evidence, so cleanup does not discard it.
`.git/` is local version-control metadata.

## Cleanup record (2026-11-19)

The TypeScript package previously moved from `typescript/` to the root; the
retired engine, headers, REPL, CMake configuration and build jobs were removed.
Historical JavaScript regression inputs remain under `fixtures/legacy/`.

The redundant `CLAUDE.md` pointer was removed; `AGENTS.md` is the maintained
instruction file. The obsolete `tools/audit-number-radix.mjs` was removed: it
asserted a fixed TS-032-era commit/file list and 212-case suite, used the retired
npm compiler path, and wrote into historical evidence. Current radix tests and
their oracle remain. The original tool is recoverable from Git.

The old root `bench/` was moved to
[validation/native-benchmarks/](validation/native-benchmarks/README.md), preserving
all workload and report bytes. Its unused build-directory ignore was removed.
Task, coordination and roadmap chronologies were replaced with concise current
state; originals remain at Git commit `ee58390b78a8fd4f12488fa00af6b1f029d045a9`.
Existing `docs/history/` and `docs/validation/` evidence is unchanged.
