# Repository layout

## Maintained source and tooling

| Path | Purpose |
| --- | --- |
| `src/` | Interpreter, semantic core and host CLI/observation entry points. |
| `test/` | Host drivers, expected results and focused guest fixtures. |
| `test/fixtures/` | Runtime inputs consumed by tests, reference oracles and the preserved legacy corpus. |
| `test/compiler/` | Small compiler-contract programs used by `npm run test:compiler` and TypeScript checks. |
| `examples/` | The counter program used by the quick start. |
| `tools/` | Build, test, Test262, data-generation and readability tooling. |
| `toolchain/` | Source pin, patches, checksums and setup for patched scriptc. |
| `docs/` | Current guides, design references, data licenses and validation evidence. |
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
