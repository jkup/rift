# Claude companion roadmap

This is the coordinator-maintained queue for independent assistance during the TypeScript rewrite. The owner starts Claude Code manually. Read `typescript/AGENTS.md` and `typescript/docs/project-goals.md` first, even for tasks whose outputs are outside that subtree. The main implementation backlog remains `typescript/TASKS.md`.

## How to use this queue

- Pick any **ready** task. Ready tasks have no dependencies on each other and may be completed in any order. Do not pick a task already claimed or marked blocked.
- Claim one task by recording **in progress**, your session/branch, and the base commit here. On completion, record **review needed**, output paths, checks performed, limitations and commit hash. The coordinator marks it **accepted** after review.
- Prefer a separate worktree/branch for simultaneous work. If sharing a checkout, inspect existing changes and never stage another agent's files. Do not switch branches, reset, stash or clean a shared active checkout.
- Stay inside the task's output paths. Read other files freely, but do not fix core code, change compiler pins, edit shared build scripts, rewrite existing tests or alter implementation architecture as side work. Report discoveries for the coordinator to assign.
- Commit coherent results and push your working branch; do not merge to main or force-push. Coordinate integration of a separate branch. Preserve other entries when updating this queue.
- If a task needs an unsettled engine interface, mark it **blocked** with the precise dependency. Do not invent a second interface or ask the owner to mediate a routine design question that the coordinator can resolve.
- Research deliverables must distinguish measured results, source inspection and inference. Cite exact files/lines or upstream source links and revisions. Do not convert old documentation claims into verified facts.
- Do not start all tasks at once or delegate further automatically. If no ready task remains, report that the queue is empty; do not manufacture work.

The coordinator replenishes this queue during implementation reviews when useful independent work appears. Keep it small and purposeful. Candidate ideas are not assignments until they have clear ownership and acceptance criteria.

## CL-001 — Audit the existing custom JavaScript tests

Status: **ready**. Owner: unclaimed. Dependencies: none.

Purpose: identify portable regression evidence we can reuse without assuming the current C++ harness establishes correctness.

Read: `test/`, `test-runner.js`, and relevant C++ source only as needed.

Write only: `typescript/docs/assistance/custom-test-audit.md` and this entry's status/handoff fields. Optional read-only inventory tooling belongs under `typescript/tools/assistance/custom-test-audit/`; it must not mutate test files or shared build configuration.

Deliver:

- An inventory grouped by language/built-in area, with exact file counts and a repeatable way to obtain them. Include nested tests.
- Distinguish assertion-bearing tests, output-only demos, simulated GC helpers, host dependencies and tests whose failures may not cause nonzero exit status.
- A short ranked list of reusable fixtures for the approved first milestone, stating the expected behavior and any harness dependency.
- Identify misleading test claims or concrete harness defects with evidence; propose separate fixes rather than making them here.

Acceptance: another agent can locate each cited example and reproduce inventory counts. No invented pass rates; running C++ is optional and must be reported separately from static inspection. No core or existing-test edits.

Handoff: pending.

## CL-002 — Audit test262 runner semantics before future reuse

Status: **review needed**. Owner: Claude Code session, branch `claude/cl-002-test262-runner-audit` (separate worktree), base `0819c71`. Dependencies: none.

Purpose: provide a concrete checklist for a trustworthy future TypeScript test262 adapter; implementing the adapter is not this task.

Read: `scripts/test262/`, package commands and authoritative test262 documentation. Record the upstream revision/date consulted; the suite need not be downloaded in full.

Write only: `typescript/docs/assistance/test262-runner-audit.md` and this entry's status/handoff fields.

Deliver:

- Trace strict/non-strict, raw, module, async `$DONE`, includes and negative-test phase/type handling in the current runner.
- Check how skips, unsupported features, timeouts, crashes and harness errors affect counts and cache keys.
- For each concrete defect, provide a code reference and a minimal scenario showing why the classification is wrong. Separate correctness defects from optional improvements.
- Specify expected outcomes for a small adapter-validation matrix, including module versus script parsing and asynchronous failure/completion. Keep it independent of the new interpreter's still-moving APIs.

Acceptance: findings are evidence-backed, with authoritative links for harness requirements. No changes to runner code, feature skip lists, tests or published compliance claims.

Handoff (2026-11-01): output `typescript/docs/assistance/test262-runner-audit.md` (work commit `b29d398`). Upstream consulted: tc39/test262 `91c7075` (2026-10-29) `INTERPRETING.md`, `harness/assert.js` and example tests, read through the GitHub API without downloading the suite. Static inspection only; neither the runner nor C++ was executed. Ten correctness defects with code references and scenarios. Most serious: runtime-phase negative tests always fail because guest throws exit 0; negative phase is never checked; `raw` tests get the harness prepended (upstream `directive-prologue/10.1.1-2gs.js` cannot pass); `module` tests run as strict scripts; dropped includes and the weakened `harness-compat.js` `assert.throws` (accepts any thrown primitive); a crash after output counts as a pass; the incremental cache key excludes skip lists, harness and test262 revision. Includes an adapter checklist and a 25-row validation matrix independent of the new interpreter APIs. Limitations: no effect sizes are estimated because no run was performed; proposed fixes need coordinator assignment.

## CL-003 — Prepare independent semantic examples

Status: **ready**. Owner: unclaimed. Dependencies: none.

Purpose: create small readable examples with explicit expected outcomes for later integration, without touching the active test harness.

Write only: `typescript/fixtures/assistance/semantic-examples/` and this entry's status/handoff fields.

Deliver 8–12 standalone guest `.js` examples covering retained mutable closures, closure independence, object aliasing, method receivers, evaluation order, shadowing, loop side effects and return propagation. Use the TS-001 syntax subset where possible. Put deliberately later-feature examples in a clearly labeled deferred group; do not call them current regressions.

For each fixture include exact expected stdout and a short explanation in a local README or manifest. Verify the output with a recorded Node version; include a small Node-only verification script in the owned directory if useful. Avoid nondeterminism, implementation-specific errors, timers, file/network access and dependence on the emerging Rift APIs.

Acceptance: examples produce the documented expected output under Node, can be read without a custom assertion library, and teach distinct semantic rules. Passing Node is reference evidence, not proof Rift supports them. The coordinator chooses when/how to integrate them; do not edit `typescript/test/`, package scripts or the core engine.

Handoff: pending.

## Not ready for companion assignment

- Built-in implementation: wait for stable registration/object/coercion interfaces and bounded ownership in `typescript/TASKS.md`.
- Parser/evaluator refactoring: owned by the integration task until the foundation is accepted.
- Performance tuning and compiler/toolchain changes: require measured need and explicit coordination.
- Broad documentation of implemented behavior: wait for actual interfaces and validation; do not document planned features as shipped.
