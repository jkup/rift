# TS-033E2 binding and completion helpers

Assigned base14704f7, 2026-11-03, codex/test262-classification. Sole implementation
writer; stops for independent review. No successor assigned and no main merge.

The [pre-edit API/expectations](frozen-expectations.md) define the additive modules.
Script locals own private mutable storage, explicit outer links, TDZ and host
invariant checks. A tagged wrapper preserves the existing GlobalEnvironment as
the terminal; no existing production signature or implementation changed.
References resolve iteratively once and retain their base/name/strictness/copied
location. Global Get/Put still use the accepted live rechecks. Identifier call
receiver is undefined. Function records retain actual existing Callable metadata
and exact strict thisValue; they create no callable and offer no invocation path.

Completion payloads keep empty distinct from undefined. UpdateEmpty carries a
previous payload through empty normal/break/continue; nonempty/return/throw retain
identity. The explicit ValueCompletion expression adapter keeps undefined present
and propagates original throws. No legacy Completion reinterpretation, evaluator,
loop/if/function/Script-exit execution or property-reference migration was added.
The fixed2025 and pinned engine262 rationale is retained in the accepted
[design](../../script-execution-integration.md); no new conformance claim.

## Controls and compiler boundary

L01-L04/T01-T03/C01-C04 exercise TDZ, invariants, nested/sibling isolation, captured
references, live descriptors, 20000-link chains, strict host metadata, exact fault
traces and guest/resource/host identity. Two files seed|7 and other|11 are read
after compilation and checked against literal results. No guest source executes.

The first native attempt rejected the expression adapter's return of a narrowed
ValueCompletion with SC2003 (union layout conversion). An explicit ThrowCompletion
local isolates the compiler constraint and retains the same object. The initial
source/build/coverage and reduced before/after sources are retained here.
A sandboxed link also failed to locate Zig's installation directory; the approved
run uses the unchanged pinned installed toolchain. No dynamic fallback or pin change.

## Reproduction

From typescript, put the pinned Zig installation on PATH with library access:

```
node docs/validation/ts-033e2/suites.mjs typecheck test:runner test:guest:node test:guest:native test:probes test:test262 test:observations
node docs/validation/ts-033e2/validate.mjs node native
node docs/validation/ts-033e2/replay-e1.mjs node native
node docs/validation/ts-033e2/replay-plans.mjs node native
node docs/validation/ts-033e2/replay-baseline.mjs node native
node docs/validation/ts-033e2/replay-metadata.mjs node native
node docs/validation/ts-033e2/replay-stress.mjs node native
node docs/validation/ts-033e2/replay-global.mjs node native
node docs/validation/ts-033e2/replay-bootstrap.mjs node native
node docs/validation/ts-033e2/replay-d2.mjs node native
node docs/validation/ts-033e2/reduce.mjs
node docs/validation/ts-033e2/preserve.mjs
```

Replay scripts copied into this task write only E2 evidence and scratch build
files. Historical evidence is preserved. Coordinator owns COORDINATION and the
separately authorized AGENTS policy-only update; preservation lists these exceptions.

## Final acceptance evidence

Full rebuilt Node/native lanes each pass all212 exact inherited records. All44
static-only builds and separately parsed coverage reports pass (43 inherited
entries preserved; E2 driver1274/1274 static). Typecheck, runner20, probes10,
host73 and observations22 pass. Two-input E2 and E1 controls, D1 planner135 and
baseline207, metadata136/42/stress8, global15/bootstrap18 and D2 two-input controls
pass in both hosts against rebuilt binaries. The suite transcript, host outputs,
coverage/build records, reduction and preservation JSON are retained here.
Preservation verifies2600 protected files, unchanged212 records per lane and all60
blocked corpus variants. No pins, C++, historical evidence, source execution,
profile admission or existing production signature changed.
