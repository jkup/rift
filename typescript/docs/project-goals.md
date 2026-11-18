# Approved project goals and starting decisions

Approved by the owner on 2026-11-01. This is the canonical rationale for the short rules in `../AGENTS.md`; `../../TypeScript Rewrite.md` retains the detailed exploration and long-term roadmap.

## Purpose

Build a real JavaScript engine that a TypeScript developer can understand by reading it, with trustworthy semantics and a native executable produced by scriptc. This explains the JavaScript-engine part of a browser, not DOM, layout or rendering. Production adoption, Node compatibility and competitive JIT performance are not initial requirements.

Readability is the primary design objective. Correctness is a constraint on simplification and full conformance is the long-term completeness ambition. Recognizable engine architecture supports learning. Performance changes require measurement and must justify their complexity.

There are no users or downstream developers to preserve compatibility for. Internal breaking changes are acceptable when they improve the implementation; update all affected code and tests together. Keep the C++ project intact as a reference while exploring the rewrite.

## Development priorities (owner update, 2026-11-18)

The current milestone is to pass at least as many Test262 tests as the C++ Rift
version passed, using a comparable pinned corpus and counting convention. Full
Test262 conformance is a long-term ambition, not this milestone's finish line.
Identify the recorded C++ Test262 baseline and measure the TypeScript engine
against that scope; do not substitute the separate legacy-fixture completion count.
C++ code and fixtures remain reference material. Matching their implementation,
bugs or nonstandard APIs is not required. Resolve semantic disagreements using
the specification.

Prioritize bringing up the Test262 runner, measuring the baseline comparison and
implementing the gaps needed to reach that target. Defer unrelated features and
further conformance work to subsequent goals. Keep unsupported features explicit and distinguish engine
failures from harness limitations, exclusions and unexecuted tests. Report
progress with the tested Test262 scope and feature coverage, not a C++ parity
percentage.

Use typechecking, Node regression tests and relevant native semantic tests for
the normal development loop. Native checks retain static-only compilation and
zero-dynamic coverage requirements. Reserve exhaustive native rebuilds for
toolchain changes, broad integration checkpoints or evidence of wider regressions;
do not require rebuilding every test executable for each feature. Record the
scope actually validated rather than treating focused checks as a full-suite pass.

## Starting implementation decisions

| Topic | Approved default |
|---|---|
| Execution | Readable tree-walking interpreter; no initial bytecode compiler or JIT |
| Porting strategy | Reimplement intended behavior; use C++, tests, spec and other engines as evidence |
| Values | Discriminated unions |
| Objects | Classes with direct references and explicit guest property operations |
| Strings | Host strings behind a small API expressing guest UTF-16 semantics |
| Memory | Host-managed storage; defer weak references and finalization |
| Control flow | Explicit guest completion records; defer suspension design |
| Native compilation | Pinned scriptc, static coverage gate, same source tested under Node |
| First milestone | CLI executing variables, functions, closures, ordinary objects and loops |
| Deferred features | Temporal, regex, modules, async/generators and optimization work |

These defaults are supported by small compiler probes, not proof of a complete engine. An integration owner can revise them when actual implementation provides contrary evidence: record the reason and update shared interfaces atomically. Revisit scope with the owner for a change to the project's purpose, removal of C++, or abandonment of the native route.

## Why integration comes before parallelism

The probes validate language constructs separately. The first implementation must exercise parsing, values, environments, objects, calls, completions, bootstrap and CLI together. It supplies concrete conventions and test commands that feature agents can follow.

After that, use a dependency-aware backlog with small tasks. Each has an owner, prerequisites, owned files, required behavior, exclusions and acceptance tests. Start with an integration owner and two feature agents, rather than assigning whole subsystems concurrently. Shared-interface changes require coordination; feature-local improvements do not require permission ceremonies.

## Design review questions

1. Can a TypeScript developer follow the semantic path and its invariants?
2. Is the claimed behavior correct, with expected-result tests in both hosts?
3. Are abstractions recognizable and useful, rather than borrowed for prestige?
4. Is added complexity justified by evidence?

Consult the ECMAScript specification and relevant implementations such as Boa, Kiesel, engine262, SpiderMonkey and V8 for substantial design work. Record what was adopted or rejected and why. The specification governs semantic disagreements; implementations are evidence and inspiration. Respect attribution and licenses when adapting code.
