# TS-017A implementation validation

Implementation base: `f4ab2a5`, branch `codex/primitive-computed-keys`.
Accepted design prerequisite: TS-017P `a3e2ced`. Validated 2026-11-02 on
Windows x64 with the unchanged pinned toolchain.

The atomic change installs readonly defining-Realm ownership at callable
construction, stamps Realm factories and bootstrap F, and migrates all raw host
fixtures with explicit owners. Null roots and absent metadata stay explicit.
One evaluator context now exposes its current active Realm, while finally restores
call/Realm state and admitted AST depth after normal, guest-abrupt and host-fault
paths. Lexical environments and all transferred Values remain unchanged.

## Acceptance

- `npm run typecheck`: passes.
- `npm run test:runner`: 20/20, no skips.
- `npm run test:probes`: 10/10, both hosts and static build/coverage checks.
- `npm run test:guest:node`: rebuilt, 163/163, no skips.
- `npm run test:guest:native`: rebuilt, 163/163, no skips; all 22 existing
  static-only builds and separate coverage gates pass, zero dynamic statements.

No cases, gates, error expectations or toolchain pins were removed. New assertions
extend existing compiled drivers, so 163 is the unchanged harness denominator,
not a count of individual assertions. Existing runtime-read fixtures remain in
use. No new compiler failure or workaround was needed; the accepted conversion
side-effect array import remains. The initial sandboxed native attempt failed on
Zig installation access and was interrupted; `native-sandbox-failure.log` retains
that environment failure. Successful native/probe runs used the installed Zig
0.17.0 directory on PATH with installation access. It is not a skipped test.

The final logs and JSON transcripts retain stdout, stderr, statuses, signals,
timeouts/harness errors and static counts. Final acceptance has no failures,
skips, crashes or timeouts. `native-build-results.json` supplies each exact
coverage report; guest JSON files retain all 163 expected-result verdicts.

## Fixed matrix mapping

| Rows | Existing driver and expected-result evidence |
| --- | --- |
| R1 | realms: both F roots and builtin ownership with existing exact graph/metadata checks; operation-context: declarations/expressions, borrowed A/B/C roots and call owner, undefined/zero ticks |
| R2 | operation-context: B object/array/nested function allocations from A, later nested invocation from C; function-call and realms: replaced documented caller-allocation expectations, stable context restoration |
| R3 | operation-context: retained B lexical counter reaches 2 while A n stays 100, exact captured token |
| R4-R5 | operation-context: A/B/A/B/A entry trace, stable identity, allocations, peak calls 3, live saved context and fixed Realm snapshot |
| R6-R7 | operation-context: delegating EntryObserver checks real C.call before/after B target, exact forwarded Values/location, two call slots, receiver error and target guard without ticks/effects |
| R8 | operation-context: exact throw record/value/diagnostic/location through C.call and A bridge; parsed B throw uses its actual AST location |
| R9 | operation-context: exact B host fault through B guest AST and C.call, caught in A with prior nonzero caller frames intact, successful later callback and idle cleanup |
| R10-R11 | operation-context: foreign illegal builtin/guest completions with exact host messages, return/fallthrough, callable-before-budget guards both at idle and inside B |
| R12-R13 | operation-context: alternating A/B call limit admits three entries with zero ticks; foreign nested loop shares steps 4 then 5 with exact guard diagnostics |
| R14-R15 | operation-context: same retained ticking callable across independent evaluators, separate budgets and shared captured state; depth=256 guards preserve depth and consume exactly two ticks; R9 covers real admitted-frame unwind |
| R16 | operation-context: B function changed to C.F then null, changed name/length, B allocations/ownership remain; bare null-root B builtin; function-call preserves opaque/null-root fixtures |
| R17-R18 | array-map: A direct helper on B sparse input with C callback preserves exact Values/hole, A restoration between callbacks; B builtin on A input with A length hook/C allocating callbacks gives B result/C elements and exact order/identities; existing constructor/species negatives retained |
| R19 | primitive-conversion: B valueOf replaces toString with C hook, fresh Get sees A, B/C hooks receive exact receiver/args/context/location, result 7 and restored A |
| R20 | primitive-conversion: foreign exact guest throw/host fault through computed-key AST, operator, array-like length and both array-length conversion passes, later hook/write suppression, double-conversion order and caller restoration; existing coercion drivers preserve detailed ordering negatives |
| R21 | operation-context: bootstrap A/B/C output callbacks would throw if invoked; realms retains exact root key/absence checks and no constructor/back-links/method additions |
| R22 | operation-context: retained recursion steps 11 and bridge-limit steps 3, zero-tick roots/builtin guards; unchanged full 163-case suites |

Fixture migration also covers addition, numeric/relational operators, property/key
coercion, array-like/storage, length/array-length coercion, conversion and function
call. The old foreign map adapter test now expects the adapter's defining Realm
for its result while retaining the other evaluator's context identity assertion;
its callback is also invoked from a different evaluator to prove explicit ownership.

## Scope and handoff

This implements synchronous Realm entry only. Strict receivers, diagnostic strings,
lexical Environment references, default limits and semantic tick placement remain.
No async/jobs/modules/generators, constructors/species, wrappers/Error objects,
bound/proxy functions, tail calls or extra standard methods are introduced.
Readonly ownership is an internal TypeScript invariant, not a host security boundary.
Saved contexts are live evaluator handles; host callbacks must reenter with their
supplied context.call. Independent run calls still create independent evaluators.

Coordinator acceptance remains pending. No successor work, main merge, branch
switch, C++ change, coordination-file edit or companion-output edit was performed.

## Final static coverage

All entries build under static-only; each analyzed statement is static.

| Entry | Static / analyzed |
| --- | --- |
| src/cli.ts | 1166 / 1166 |
| test/realms.ts | 1366 / 1366 |
| test/object-descriptors.ts | 886 / 886 |
| test/object-prototypes.ts | 1240 / 1240 |
| test/object-keys.ts | 880 / 880 |
| test/conversion.ts | 561 / 561 |
| test/definition-dispatch.ts | 1290 / 1290 |
| test/array-storage.ts | 1440 / 1440 |
| test/array-like.ts | 924 / 924 |
| test/operation-context.ts | 1486 / 1486 |
| test/array-map.ts | 1600 / 1600 |
| test/array-literals.ts | 1211 / 1211 |
| test/property-key-conversion.ts | 1380 / 1380 |
| test/numeric-operators.ts | 1224 / 1224 |
| test/addition.ts | 1238 / 1238 |
| test/relational.ts | 1269 / 1269 |
| test/primitive-conversion.ts | 1459 / 1459 |
| test/operator-coercion.ts | 1282 / 1282 |
| test/key-coercion.ts | 1312 / 1312 |
| test/length-coercion.ts | 1443 / 1443 |
| test/array-length-coercion.ts | 1638 / 1638 |
| test/function-call.ts | 1330 / 1330 |

Review follow-up: see [focused readability correction and complete rerun](review-followup/README.md)
for the post-review evidence, including the separately retained coordinator native
link failure. All required checks pass again after the correction.
