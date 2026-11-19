# Contributing

Rift is a TypeScript JavaScript interpreter, runnable under Node and compiled with the pinned scriptc toolchain. Start with [README.md](README.md), [project goals](docs/project-goals.md), and [architecture](docs/architecture-decisions.md).

Run npm ci, npm test, and npm run typecheck from the repository root. Native changes also require npm run test:probes and relevant native guest checks; see the [compiler contract](docs/compiler-contract.md). Keep static-only compilation and the zero-dynamic coverage gate enabled.

Source lives in src/, host tests in test/, runtime inputs in fixtures/, and tooling in tools/. Historical JavaScript regression inputs are under fixtures/legacy/. Saved validation records retain their original paths and provenance.
