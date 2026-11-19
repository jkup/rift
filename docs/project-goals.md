# Approved project goals and starting decisions

These goals explain the contributor rules in [AGENTS.md](../AGENTS.md).

## Purpose

Build a real JavaScript engine that a TypeScript developer can understand by reading it, with trustworthy semantics and a native executable produced by scriptc. This explains the JavaScript-engine part of a browser, not DOM, layout or rendering. Production adoption, Node compatibility and competitive JIT performance are not initial requirements.

Readability is the primary design objective. Correctness is a constraint on simplification and full conformance is the long-term completeness ambition. Recognizable engine architecture supports learning. Performance changes require measurement and must justify their complexity.

Rift is experimental and does not promise a stable API. Internal breaking changes are acceptable when they improve the implementation; update all affected code, tests and documentation together. The repository contains the TypeScript implementation and its scriptc tooling.

## Development priorities

The bounded Test262 pass-count milestone is complete. Keep evidence used by current tests, compiler workarounds and published results.
Retire unreferenced migration snapshots to Git history. Present Rift as a TypeScript and scriptc project, with source and package commands at the repository root. Historical comparison records describe the retired implementation; it is no longer maintained or built here.

Use typechecking, Node regression tests and relevant native semantic tests for
the normal development loop. Native checks retain static-only compilation and
zero-dynamic coverage requirements. Reserve exhaustive native rebuilds for
toolchain changes, broad integration checkpoints or evidence of wider regressions;
do not require rebuilding every test executable for each feature. Record the
scope actually validated rather than treating focused checks as a full-suite pass.

## Design review questions

1. Can a TypeScript developer follow the semantic path and its invariants?
2. Is the claimed behavior correct, with expected-result tests in both hosts?
3. Are abstractions recognizable and useful, rather than borrowed for prestige?
4. Is added complexity justified by evidence?

Consult the ECMAScript specification and relevant implementations such as Boa, Kiesel, engine262, SpiderMonkey and V8 for substantial design work. Record what was adopted or rejected and why. The specification governs semantic disagreements; implementations are evidence and inspiration. Respect attribution and licenses when adapting code.
