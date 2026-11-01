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

- On 2026-11-01 the owner authorized the coordinator to continue assigning new Codex chats, reviewing fixes, and committing/pushing tested milestones while they are away, for as long as the next step is clear. Track active assignments and acceptance in `COORDINATION.md`. This does not authorize merging to main, deleting C++, or bypassing validation.
- In the shared local checkout, use one implementation writer at a time; independent read-only review can overlap. Feature chats stop at their assigned boundary and hand back to the coordinator. The coordinator reviews and assigns the next ready task. Do not start later work solely because the previous agent marked it done.
- Independent companion work is listed in the root `Claude Roadmap.md`. The owner can have Claude Code claim any ready entry. Those entries own only their specified assistance output paths and do not authorize changes to the active core task. Companion agents claim that queue rather than `TASKS.md`.
- The coordinating agent maintains the companion queue during reviews: add useful independent tasks with explicit ownership and acceptance, review returned work, and mark it accepted before integrating it. Do not add speculative busywork or assign the same work in both queues.
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
