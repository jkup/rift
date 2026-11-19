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

Status: **accepted** (coordinator review and authorized PR merge, 2026-11-02). Owner: Claude Code session, branch `claude/cl-001-custom-test-audit` (separate worktree), base `0819c71`. Dependencies: none.

Purpose: identify portable regression evidence we can reuse without assuming the current C++ harness establishes correctness.

Read: `test/`, `test-runner.js`, and relevant C++ source only as needed.

Write only: `typescript/docs/assistance/custom-test-audit.md` and this entry's status/handoff fields. Optional read-only inventory tooling belongs under `typescript/tools/assistance/custom-test-audit/`; it must not mutate test files or shared build configuration.

Deliver:

- An inventory grouped by language/built-in area, with exact file counts and a repeatable way to obtain them. Include nested tests.
- Distinguish assertion-bearing tests, output-only demos, simulated GC helpers, host dependencies and tests whose failures may not cause nonzero exit status.
- A short ranked list of reusable fixtures for the approved first milestone, stating the expected behavior and any harness dependency.
- Identify misleading test claims or concrete harness defects with evidence; propose separate fixes rather than making them here.

Acceptance: another agent can locate each cited example and reproduce inventory counts. No invented pass rates; running C++ is optional and must be reported separately from static inspection. No core or existing-test edits.

Handoff (2026-11-01): outputs `typescript/docs/assistance/custom-test-audit.md` and read-only `typescript/tools/assistance/custom-test-audit/inventory.mjs` (work commit `e7e41dc`). Counts reproduce with `node typescript/tools/assistance/custom-test-audit/inventory.mjs`: 240 files under `test/`, 225 run by `npm test`, classified by area and failure visibility. Static inspection plus Node v26.13.0 reference runs of two files; C++ was not built or run, so no Rift pass rates are claimed. Key findings: uncaught guest throws exit 0 (H1); 106 of 225 run files have no harness-visible failure signal; stale UNSUPPORTED scripts and one test asserting non-spec sloppy `this` behavior. No dedicated closure or receiver fixtures exist, so legacy reuse for the first milestone is limited to adapted loop/function/object fixtures. Limitations: area and category assignment is heuristic regex classification; proposed harness fixes require separate coordinator assignment.

## CL-002 — Audit test262 runner semantics before future reuse

Status: **accepted** (coordinator review and authorized PR merge, 2026-11-02). Owner: Claude Code session, branch `claude/cl-002-test262-runner-audit` (separate worktree), base `0819c71`. Dependencies: none.

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

Status: **accepted** (coordinator review and authorized PR merge, 2026-11-02). Owner: Claude Code session, branch `claude/cl-003-semantic-examples` (separate worktree), base `0819c71`. Dependencies: none.

Purpose: create small readable examples with explicit expected outcomes for later integration, without touching the active test harness.

Write only: `typescript/fixtures/assistance/semantic-examples/` and this entry's status/handoff fields.

Deliver 8–12 standalone guest `.js` examples covering retained mutable closures, closure independence, object aliasing, method receivers, evaluation order, shadowing, loop side effects and return propagation. Use the TS-001 syntax subset where possible. Put deliberately later-feature examples in a clearly labeled deferred group; do not call them current regressions.

For each fixture include exact expected stdout and a short explanation in a local README or manifest. Verify the output with a recorded Node version; include a small Node-only verification script in the owned directory if useful. Avoid nondeterminism, implementation-specific errors, timers, file/network access and dependence on the emerging Rift APIs.

Acceptance: examples produce the documented expected output under Node, can be read without a custom assertion library, and teach distinct semantic rules. Passing Node is reference evidence, not proof Rift supports them. The coordinator chooses when/how to integrate them; do not edit `typescript/test/`, package scripts or the core engine.

Handoff (2026-11-01): outputs under `typescript/fixtures/assistance/semantic-examples/` (work commit `cb81e62`): nine `current/` examples in the TS-001 subset (retained mutable closures, closure independence, object aliasing, method receivers, evaluation order, shadowing, loop side effects, return propagation, function-declaration hoisting) and three `deferred/` examples (for-let per-iteration bindings, finally completions, arrow lexical this) labeled as not current regressions. Exact stdout lives in `manifest.json`; `verify-node.mjs` runs each as a classic script and matched 12/12 under Node v26.13.0 (expectations hand-written first). Not run under Node-hosted or native Rift, and not wired into `typescript/test/` or package scripts. Limitations: Node agreement is reference evidence only; the receiver example relies on a `"use strict"` directive so that Node matches the Rift strict-call profile.

## CL-004 — Identify a small trustworthy test262 starting corpus

Status: **accepted** (independent review, 2026-11-02). Owner: Claude Code, PR #78, base609c2f3. Dependencies: accepted CL-002 audit.

Purpose: prepare evidence for a future conformance adapter without changing the interpreter or claiming compliance. Pin one upstream test262 revision and inspect 15–25 relevant tests for already implemented language semantics (strict lexical bindings, closures, evaluation order, primitive operators, ordinary data properties). Use accepted TS-017A as the capability baseline; distinguish parse support, runtime support and harness dependencies.

Write only: `typescript/docs/assistance/test262-starter-corpus.md`, optional machine-readable manifest under `typescript/fixtures/assistance/test262-starter-corpus/`, and this entry's status/handoff. Preserve upstream licensing if copying any content; links and metadata are preferred. No runner, package, core, existing tests or feature-list changes.

For each candidate provide revision-pinned path/link, flags/features/includes, strict/raw/module variants, negative phase/type if any, semantic expectation, exact required harness helpers and known blocker. Include deliberately unsuitable examples that expose adapter pitfalls from CL-002. Separate plausible candidates from tests actually run; do not count Node output as Rift conformance or silently strip directives/harness assertions. End with the smallest explicit adapter prerequisite checklist. Acceptance: another agent can retrieve each exact test and understand why it is included or deferred, without inventing support or relying on upstream default-branch contents.

Handoff (2026-11-02): outputs `typescript/docs/assistance/test262-starter-corpus.md` and `typescript/fixtures/assistance/test262-starter-corpus/manifest.json` (work commit `d5b09b5`). Pinned tc39/test262 `91c7075` (2026-10-29, same as CL-002); 22 candidates across TDZ/closures, strict this, primitive operators, ordinary data properties and genuine early errors, plus 11 deliberately unsuitable examples mapped to CL-002 defects. Each entry records pinned link, git blob SHA (all 33 verified against upstream), flags/features/includes, INTERPRETING variants, negative phase/type, helpers, expectation and blockers. Measured on Node-hosted Rift only, at TS-017A `b02cfc3` and head `609c2f3`, in raw (no harness) and labeled probe-shim modes; neither is reported as conformance. Key findings: pinned assert.js/sta.js do not parse in the subset, so no non-raw test can run faithfully; unsupported syntax is reported as parse SyntaxError, so all 308 surveyed parse-negative tests are rejected but 173 only via unsupported messages; engine errors are not Error objects. Node v26.13.0 reference matched every candidate variant and disagreed with U07. Limitations: native lane not built; survey covered 41 directories (2,000 files), not the whole suite; syntax scan is heuristic.

## CL-005 — Research a faithful nondecimal number formatter

Status: **accepted** at `d532a14`; revised PR #80 merged to main `78811ec` (2026-11-02). Owner: Claude Code. Dependencies: accepted TS-021P evidence. Research accepted; production formatter remains a separately scoped future task.

Purpose: investigate the concrete Number.toString blocker without changing the engine. Read typescript/docs/number-prototype-conversions.md and docs/validation/ts-021p/: both hosts fail seven exact rounding-interval cases, including0.3/base3. Static compilation and host agreement alone are insufficient. Number valueOf proceeds independently.

Write only: `typescript/docs/assistance/radix-formatter-options.md`, optional research scripts/data under `typescript/fixtures/assistance/radix-formatter-options/`, and this entry's status/handoff. No core, integrated tests, toolchain, manifest or coordinator edits.

Compare a small set of revision-pinned algorithms/implementations for binary64 to radix2–36 strings against fixed ECMA-2622025 step5: round-trip interval membership and shortest significand, separating recommended closest/even choice from required behavior. Explain exact arithmetic needs, subnormal/power boundaries, output size, licensing/attribution and plausible readable TypeScript representation under current static compilation constraints. Inspect source rather than citing library marketing. Use retained failures and mathematically independent oracles; report what actually ran and what remains unproven. Do not count a host formatter or handwritten fixed expected strings as a general oracle. Recommend a bounded future proof/probe plan and acceptance matrix, not an unsolicited production formatter or dependency upgrade. Existing decimal backend stays unchanged.

Acceptance: evidence-backed comparison directly addresses the retained counterexamples and shortestness, with precise source revisions/licenses and honest portability uncertainty. A coordinator can choose a later isolated backend task without guessing the algorithm or numerical contract. No new runtime support/compliance claim.

Handoff (2026-11-02): outputs `typescript/docs/assistance/radix-formatter-options.md` and research files under `typescript/fixtures/assistance/radix-formatter-options/` (work commit `f780ead`). Pinned source review: V8 14.6.202.34 (Node 26.13.0) `DoubleToRadixStringView`, scriptc 0.4.7 vendored V8 radix component, Boa v0.22 V8 port, SpiderMonkey `js_dtobasestr`, QuickJS-ng v0.18.0 `js_dtoa`, engine262 host delegation, and Burger & Dybvig 1996 free-format. Measured with an exact step 5 search oracle (`oracle.mjs`) cross-checked by an independent free-format reference over 13,350 nondecimal cases (`run.mjs`, exit 0): V8/Node in interval 1,956/1,956 for power-of-two radices but 4,056/11,394 otherwise, reproducing all 7 TS-021P failures; free-format in interval and shortest 13,350/13,350 (7 subnormal Note 2 differences). Models of the QuickJS-ng selection rule (27 non-shortest at powers of two) and SpiderMonkey integer branch (not shortest above 2^53) are labeled as models. A `bigint` transcription builds under scriptc 0.4.7 static-only (78/78 static) and matches the oracle in Node and native, 167/167 (`probe-run.mjs`, exit 0). Recommends an isolated `numberToStringRadix` backend task (free-format from the paper with exact bigint plus a cross-power Note 2 step) with acceptance matrix A1-A10; decimal backend unchanged. Limitations: other engines not run; Windows x64 only; bigint performance, other platforms and an exhaustive proof remain unproven.

Revision (2026-11-02, commit `f063ab8`, branch merged with main at `64bf139`): addresses the PR #79 review. `parsePositional` now rejects anything but radix digits with at most one interior point, and `judge` requires the text to equal the step 6 rendering of its own (s, n, k), so `0.1.garbage`, `0.1.`, `0.10` and `1.` are malformed while integer padding zeros stay required. `run.mjs` adds those four plus `00.1`, `.1`, `0.1.0`, `+0.1`, a leading space, empty, uppercase, `ff.0`, `0ff`, `100.` and a padded integer with `.0` as must-reject self-checks, unpadded integers as wrong values, and canonical padded strings as must-accept. Rerun exit 0: every total unchanged, and all 13,350 strings from each of Node, free-format and the QuickJS-ng model (5,263 for the SpiderMonkey model) were well formed. Stored `probe-results.json` lane outputs re-judged with the stricter oracle: 334/334 verdicts unchanged; the probe was not rebuilt because it renders through the oracle's own `format`. Acceptance row A5 now requires the whole string to equal the oracle rendering.

## Deferred companion areas

- Built-in implementation: wait for stable registration/object/coercion interfaces and bounded ownership in `typescript/TASKS.md`.
- Parser/evaluator refactoring: owned by the integration task until the foundation is accepted.
- Performance tuning and compiler/toolchain changes: require measured need and explicit coordination.
- Broad documentation of implemented behavior: wait for actual interfaces and validation; do not document planned features as shipped.

## CL-006 — Make observation cancellation controls deterministic

Status: **review needed**. Owner: Claude Code session, branch `claude/cl-006-cancellation-controls` (separate worktree), base `ffcf7f0`. Independent of the TS-032 formatter work. Concrete evidence: typescript/docs/validation/ts-031c-b/README.md and cancellation-attempt/. The current100ms abort can occur during validateLaunch under load, before child spawn; the test then incorrectly assumes transport.json exists. Preserve this retained failure.

Own only typescript/tools/test262/observation.integration.mjs, a minimal host-only test synchronization seam in observe.mjs if essential, dedicated evidence under typescript/docs/assistance/cancellation-controls/, and this entry's handoff. Do not change engine, classifier/result/driver schemas, timers/limits semantics, core TASKS or COORDINATION. Use an isolated branch/PR; coordinator reviews before integration.

Add deterministic coverage for already-aborted/pre-launch cancellation and cancellation after actual child launch. Assert unfinished attempt/no terminal record, correct transport presence for each lifecycle stage, child termination where launched, and no false success. Synchronize on actual lifecycle evidence rather than increasing sleep or retrying until green. Prefer test-only changes; if a seam is necessary keep it narrow and observational, with unchanged production defaults and document the rationale. Preserve timeout/output-cap precedence, snapshot binding, all existing assertions and public behavior. Run host and real Node/native observation controls including repeated deterministic cases; no native semantic/build claim unless actually rebuilt. Report exact changes/checks and limitations in PR, never weaken the oracle or silently skip a lifecycle stage.

CL006 priority update (2026-11-02 20:24): now blocks final TS033D2 acceptance. D2 source and independent Node/native semantic/static/preservation checks passed; final producer observation run retained15/16 with the same T30 ENOENT for transport.json. See typescript/docs/validation/ts-033d2/observation-cancellation-attempt.json. No open PR at this check. Please preserve both prelaunch and launched-child cancellation assertions; ownership remains Claude, no duplicate Codex task.

Handoff (2026-11-03): work commit `de4507f`. Test-only: `typescript/tools/test262/observation.integration.mjs`; `observe.mjs` unchanged (no seam needed). Evidence: `typescript/docs/assistance/cancellation-controls/` (README, run.mjs, results.json, logs). Cause (source inspection plus measured reproduction): `launchObservation` awaits `validateLaunch` before its aborted check and persists `transport.json` only after a child closes; `run.mjs` reproduces the retained ENOENT 5/5 against unchanged code by aborting synchronously after launch starts. Per lane (node and native) three new tests: already-aborted, aborted during launch validation (the retained stage), and aborted after the real child spawned and printed its first line, synchronized by a test-only spawn observer (`module.syncBuiltinESMExports`, same arguments and ChildProcess) raced against launch settlement; no sleeps or retries. Prelaunch asserts unfinished result and attempt, no record, no child.json, only attempt.json and source.js, zero spawns, relaunch rejected. Launched asserts transport.json present with cancelled, no spawnError/deadline/cap, SIGTERM, ChildProcess killed, PID gone (ESRCH), stdout hash bound, no child.json. Retained T30 keeps its name and every assertion, now with launched-child synchronization (source prints `started` first). Checks, Windows x64, Node v26.13.0, both lanes rebuilt in the worktree: observations 22/22 (16 retained plus 6); mutation copies under build/ (control 7/7 pass; no-kill, cancel-completes-record and cancel-skips-transport each fail the 3 launched tests; no-prelaunch-check fails the 4 prelaunch tests); 10 idle and 5 loaded (24 spin processes) repeats all 22/22; host test:test262 73/73; runner 20/20. Limitations: Windows only (SIGTERM values not checked on POSIX); the wrapper relies on observe.mjs's named spawn import and fails closed if that changes; T31 junction may still hit sandbox EPERM; no native semantic claim.

Coordinator acceptance (2026-11-03): CL006 PR81 a9e0b9d accepted after actual diff and independent second review; five original-stage reproductions, four correctly rejected mutants, two idle plus one24-process-load22/22 suite runs. Merged into feature branch568680c; host73/runner20 pass. Existing production sources unchanged, no new native build claim. Historical failures retained; D2 gate resolved.

## CL-007 — Independent review of Unicode diagnostic readiness proposal

Status: **review returned: 3 blockers** (Claude Code, 2026-11-08; handoff below). Owner: Claude Code. Dependency: current local candidate in `typescript/docs/validation/ts-035e3h-unicode-ready-p/`, based on accepted inert controller `ec63ebee1e77c818b405ed9f546cbbfacae187ab`. This is a read-only second review; the candidate is uncommitted in the shared checkout. Do not switch branches or edit the candidate.

Review the exact two-root design for the failed Unicode recorder diagnostic. Inspect `README.md`, `proposal.json`, `materialization.json`, `future-invocation.json`, `entry-transform.json`, transformed text artifacts, `check-proposal.mjs`, `verify-root.mjs`, and the accepted corrected controller and child contract. Check the bundle imports resolve to the copied sibling modules; the transformed binding and entry bytes match their independent literals; the outer Node environment is separate from the child PowerShell environment; runner and diagnostic roots are distinct and absent; the ordered materialization and exclusive-write/stop protocol are complete; and the accepted alias policy, limits, inputs, output literals and failure-retention rules remain unchanged. Verify the prior recorder failure remains a failure and the proposal grants no execution or provenance authority.

Run only `node typescript/docs/validation/ts-035e3h-unicode-ready-p/check-proposal.mjs` and `node typescript/docs/validation/ts-035e3h-unicode-ready-p/verify-root.mjs` if needed to reproduce the read-only checks. Do not execute either fixed-root entry, create or reserve either root, materialize any file, launch PowerShell or a diagnostic process, inspect/load binaries, alter source or oracle literals, run compiler/linker/helper work, or publish/commit. Return an independent written review with exact findings or an explicit no-finding result in the roadmap handoff. Acceptance, any correction, and any later one-shot diagnostic execution require separate coordinator review and owner authorization.

Acceptance: reviewer independently traces the exact transformed bytes, dependency paths, child/outer environments, fixed-root absence, exclusive materialization protocol, bounded controller contract and retained failure. Any contradiction or missing safety condition is reported as a blocker without editing files. No runtime result or successful recorder claim is inferred.

Handoff (Claude Code, 2026-11-08). Independent second review. Not ready to execute: three blockers, four non-blocking findings. I did not create or reserve either root, materialize files, launch Node entries, PowerShell or any diagnostic, or commit. I read `pwsh.exe` and `node.exe` only to size and hash them, as the checker does; nothing was loaded or executed. I edited only this entry: the status line and this handoff. My own trace script, outside the repo, read files and wrote nothing.

What I traced independently, all as expected:
- `enabled-bindings.json.txt` is byte-identical to the accepted `bindings.json` (3,745 bytes, `10d68530…`) after exactly three single-occurrence path replacements (controller, transport and inventory, moved to the runner root). The result is 3,706 bytes, `cd348427…`, LF only. JSON comparison shows no other change.
- `enabled-entry.mjs.txt` equals the accepted entry (1,460 bytes, `d8fa8adf…`) after exactly two single-occurrence replacements: `RUN = false` to `RUN = true`, and the old binding digest to `cd348427…`. The result is 1,459 bytes, `5fa58f52…`. The accepted entry's digest equals the accepted binding hash.
- Imports: the entry imports `./controller.mjs` and `./transport.mjs` relative to its own directory, and the controller imports `./inventory.mjs`. All are bundle siblings, plus `node:` builtins only. The entry's row check reads the bundle copies by the same absolute paths. All three accepted modules match their rows (9,681 `b6bce21f…`, 1,384 `8cfc9060…`, 4,092 `11bd1578…`).
- Environments: the outer Node environment has ten keys, six under the runner root, none naming the diagnostic root. The child environment has ten keys under the diagnostic root. The transport spawns with `env: contract.environment`, `shell: false` and an absolute executable, so nothing passes from the outer environment to the child. The accepted `future-invocation.json` differs only in entry path and its TEMP/HOME root.
- Both fixed roots are absent (ENOENT). The controller creates the diagnostic root only in `stage()` after `preflight()`, with a non-recursive `mkdir` and `wx` files, and retains partial output.
- Limits, inputs, output literals, the inventory allowlist and the retention rules are unchanged from the accepted controller and child contract (contract `2cd2ec5b…`, identical to `child-contract.json.txt`).
- The 68 mutation controls count correctly.
- The prior recorder failure is still recorded as FAILED (`ts-035e3h-unicode-p/README.md`, line 3), with its `runtime-exec` evidence untouched. Nothing in the candidate grants execution or provenance authority.

Blockers:
1. **Pinned PowerShell executable changed.** `C:\Users\jonku\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe` is now 301,360 bytes, SHA-256 `2a6769a3…b2233`. The binding row and child contract pin 301,368 bytes, `362a356c…0ad139`. The file's creation time is 2026-11-08 01:22 UTC, which suggests a runtime refresh. `check-proposal.mjs` now fails at line 83 with "301360 !== 301368". The entry and controller would fail closed with "bound source identity" before any launch, so this is safe but not executable. Any re-pin changes the accepted child contract and needs its own review.
2. **The approved attempt would stop on inventory by construction.** The accepted inventory permits only root, tmp, home and the three AppData directories. Its `startupCachePolicy` stops on any other entry. This repo's own measured evidence shows this PowerShell writes `home/AppData/Local/Microsoft/PowerShell/StartupProfileData-NonInteractive` under the same private-home environment: see `ts-035e3h-runtime-exec/runtime-inventory.json` lines 130–137 and the `build-exec` archive. So `run()` would set `firstFailure = 'inventory'`, and `review()` would return `stopped` even with exit 0 and the expected stdout. The single owner-approved attempt could not localize anything. That cache is measured, not guessed, so the documented route applies before execution: a separately reviewed allowlist amendment, or a deliberate decision that stopping is acceptable.
3. **The candidate's preconditions don't hold in the current checkout.** `verify-root.mjs` fails because `git diff ec63ebee` lists tracked evidence outside the package. The files are `ts-035c/lifecycle-latest.json` (122 lines rewritten, timestamp 2026-11-08 01:26 UTC, new run IDs under this checkout's `typescript/build`), `ts-035c/pinned-results.json`, `ts-035c/preflight-negative-results.json`, `ts-035e2a/fresh-selections.json` and `ts-035e2a/input-fault-results.json`. A suite rerun apparently overwrote accepted evidence, which also contradicts the proposal's "all prior seals unchanged" assertion. I did not change or restore these files. The coordinator should restore or explain them first. Separately, `verify-root.mjs` pins the roadmap diff to exactly +10/−0 lines, so this handoff alone makes it fail. Rerun it after updating that literal.

Non-blocking findings:
- **No frozen materializer.** Runner-root materialization (5 directories, 5 exclusive files, before/after rehash) exists only as protocol text in `materialization.json`. No reviewed script implements it, so the future executor would be unreviewed code or manual steps. Freeze it as code under the same review.
- **Inconsistent row schema.** `materialization.json` rows use `source` for three entries and `path` for two. Check attempt 2 adapted the checker instead of fixing the schema.
- **Tautological controls.** Some mutation controls cannot fail against the candidate: alias-policy broadening, the missing protocol step and the trailing byte. They compare a hand-mutated literal with itself, and only show that `assert.deepEqual` works.
- **Ambiguous protocol wording.** Step 1 says "rehash all eleven source/tool rows", but three of the enabled binding rows point into the not-yet-created runner root. It should say the accepted base rows.

Teammate note, beyond scope: the diagnostic can only localize the FFFD replacement to the `ConvertFrom-Json` parse path. The README's own "potential later fix" doesn't depend on that result: transport UTF-16 as integer code units and rebuild after parsing. Implementing it with a lone-surrogate round-trip test may be cheaper than more diagnostic rounds.
