# Rift TypeScript implementation instructions

These rules govern the TypeScript rewrite. The owner approved this direction on 2026-11-01. Read `docs/project-goals.md`, `docs/compiler-contract.md`, and `TASKS.md` before implementation. The root `TypeScript Rewrite.md` provides background; the approved decisions here and in `docs/project-goals.md` supersede its earlier tentative choices.

## Priorities

- Choose the clearest correct implementation for a TypeScript developer learning JavaScript engines. Explain invariants and observable semantics, not obvious syntax.
- Correctness constrains simplification. Full ECMAScript conformance is the long-term ambition; early unsupported behavior must be explicit. Preserve evaluation order, including calls caused by coercion and accessors.
- Use recognizable engine concepts and precise names. Consult the specification and a relevant engine for new subsystems or difficult semantics; record consequential design choices with source links/revisions.
- Optimize only with evidence. Keep compiler workarounds isolated and explained.

## Implementation defaults

- Build a tree-walking JavaScript interpreter in TypeScript, statically compiled with the pinned scriptc. Keep the same source runnable under Node.
- Use discriminated-union values, direct class references for guest objects, host strings behind a small guest-string API, and host-managed memory initially.
- Use explicit completion records for guest return/throw/break/continue. Host exceptions represent implementation faults. Define the suspension model later, before generators/async work.
- Reimplement intended behavior using C++ as a reference, not an oracle. Do not mechanically preserve its APIs, organization or bugs.
- There are no external compatibility obligations: breaking internal changes are allowed. Update affected callers, documentation and tests in the same task. Preserve the C++ engine and existing test files during this experiment.
- Never execute guest source using host eval, Function, Node vm, or another engine. Do not enable dynamic compilation to work around a static-compilation failure.
- Keep I/O outside the semantic core and mutable guest state inside a Realm. Different realms must not accidentally share guest objects.

## Task coordination

- Claim a ready task in `TASKS.md` before starting. Do not start blocked tasks or duplicate another agent's work.
- The initial integration owner establishes shared types, bootstrap and test interfaces. Feature agents coordinate changes to those interfaces rather than creating alternate versions.
- Keep work within the assigned task. Record newly discovered work as blocked/ready tasks rather than silently expanding scope.
- For later parallel assignments, prefer isolated worktrees and bounded file ownership. A task is done only when integrated and validated, not when a branch merely exists.
- Do not dispatch more agents for the initial foundation task. After it passes, the planned starting team is one integration owner and two bounded feature agents, when assigned by the owner/coordinator.

## Acceptance

- Run relevant tests under both Node-hosted Rift and native Rift. Keep `test:runner`, `test:probes`, and typechecking passing.
- Preserve assertions and report skips, unsupported features, timeouts, crashes and harness failures separately. Do not change the denominator to improve conformance claims.
- Add meaningful semantic tests, including expected results and error phases. Agreement between two implementations is not enough by itself.
- Reduce compiler failures to small probes; do not bury workarounds across the engine or change pinned toolchain versions within an unrelated feature task.
- If native validation is blocked, say so and leave acceptance incomplete. See the compiler contract for Zig on Windows; sandbox access may require escalation.
- Update task status, interface notes and feature scope when finishing. Report tested behavior and remaining limitations honestly.
