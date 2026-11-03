# TS-033E3A implementation and validation

The implementation resumes after coordinator acceptance `be32514` of the bounded
test-lane revision. `bdf684d` retains the failed candidate and reductions; it was
not implementation acceptance. The frozen matrix remains unchanged as evidence.

## Implemented boundary

The prepared record privately materializes branded `script-guest` callables.
Each success allocates a distinct ordinary function/prototype pair, installs the
literal length/name/prototype/constructor descriptors, and increments a detached
completed-materialization counter. Callable accessors retain the defining Realm,
record, scope, captured environment, strict metadata, copied formals and exact
UTF-16 source slice; private source-unit identity/range are checked at allocation.
No mutable AST, plan, key, invocation method or raw callable factory is exported.

Function environment allocation creates a real empty `FunctionActivation` after
the A tick, retaining exact receiver/outer/callable. Its private key, scope and
phase live on the activation. The record holds one key and no activation
collection. The phase methods are present for E3B, which alone owns setup and
phase transitions. This is an ownership invariant, not a GC measurement.

The parser records parenthesized expression identities and identifier assignment
eligibility only for declaration planning. `inspectNamingSites` returns sorted,
detached location/boolean rows. Parenthesized LHS is ineligible; parentheses around
RHS or a whole assignment preserve their respective identities. Legacy AST output
is unchanged. Name inference execution remains E4, not this host factory API.

The Callable union and toString helper are closed/exhaustive. Legacy behavior is
preserved, and Script calls/builtin invocation remain guarded before call counters
or Realm changes. No E3B method or stub, ER accessor migration, execution, profile
admission, global adapter, CLI change, compiler pin or C++ change is included.

## Exact validation split

The following two invalid typed inputs cannot be represented by the static
compiler. They run in `node-host-negatives.mjs` against the production APIs:

| Matrix control | Node runtime negative | Native compile-rejection evidence |
|---|---|---|
| F07 | Legacy Environment supplied as ScriptEnvironment; invariant before ticks/materializations/global changes | `foreign-union.ts`, SC2003 |
| F09 | Structural fake supplied as opaque ScriptGuestCallable; same zero-effect invariants | `forged-record.ts`, SC2002 |

`forged-class.ts` additionally records SC1090 for the attempted unrelated-class
alternative. These are **compile rejections, not native runtime passes**. All
representable foreign Realm/record/context/scope, malformed/cyclic chains,
descriptor/source/identity/receiver, guard and M/A budget controls remain in the
shared TypeScript runtime driver. Its exact F07/F09 output labels say
`REPRESENTABLE PASS`; the host-only result file explicitly disclaims native runtime
passes for the moved casts. The approved split changes neither production
APIs nor private brands. No synthetic callable is used by production or E2.

## Isolated compiler module-reachability constraint

The first full inherited build exposed a separate constraint that the focused
drivers did not: scriptc lowers opaque class types only when their declaring
module is reachable through a runtime import. E1/E2/E3A explicitly import
preparation and passed, while CLI and other runtime-only entries rejected the
Callable union (SC2009 and cascading SC1090; separate reports also exposed dynamic
slots). The full rejected build/suite are retained as `type-import-failed-*.json`.

`reachability-before.ts` reduces the problem to a type-only imported class with
private state and a union consumer. Its build fails SC2009; coverage reports one
dynamic operation despite a misleading fully-static footer. The otherwise same
`reachability-after.ts` adds a module-only import and passes static-only, 5/5
static statements, zero dynamic and exact Node/native runtime input output11.
`reachability-results.json` and `reachability-typecheck.json` retain both lanes.

The workaround is one documented module-only import beside Realm's bounded
factory wrapper. The runtime Callable import remains type-only; no private class,
state, key or constructor is exported. Loading the module executes declarations,
not preparation, materialization, binding setup or Script execution. No new core
module or dynamic-tier exception is introduced. Node validation also checks that
the added import cycle initializes correctly. CLI reduced validation is 2348/2348
static statements; the complete rebuilt gate table is recorded separately.

## Authorized E2 fixture migration

The E2 fixture now uses a Script Realm's actual global object/environment, so its
existing local chain has a genuine defining-Realm terminal. It prepares and
materializes `function f(){}` and calls `createFunctionEnvironment` for each of
the original receiver cases. Its trusted allocation context permits only M/A;
the original binding-operation context still forbids calls and ticks. All original
receiver/reference/completion assertions and printed L/T/C/input records remain.
Direct E2 binding operations are helper controls, not declaration setup.

## Reproduction

From `typescript`, with the pinned Zig installation on PATH and library access:

```
node docs/validation/ts-033e3a/suites.mjs typecheck test:runner test:guest:node test:guest:native test:probes test:test262 test:observations
node docs/validation/ts-033e3a/validate.mjs node native
node docs/validation/ts-033e3a/node-host-negatives.mjs
node docs/validation/ts-033e3a/reduce.mjs
node docs/validation/ts-033e3a/reachability.mjs
node docs/validation/ts-033e3a/replay-e2.mjs node native
node docs/validation/ts-033e3a/replay-e1.mjs node native
node docs/validation/ts-033e3a/replay-plans.mjs node native
node docs/validation/ts-033e3a/replay-baseline.mjs node native
node docs/validation/ts-033e3a/replay-metadata.mjs node native
node docs/validation/ts-033e3a/replay-stress.mjs node native
node docs/validation/ts-033e3a/replay-global.mjs node native
node docs/validation/ts-033e3a/replay-bootstrap.mjs node native
node docs/validation/ts-033e3a/replay-d2.mjs node native
node docs/validation/ts-033e3a/preserve.mjs
```

## Final results

Full rebuilt Node/native guest lanes pass all212 exact inherited records with no
skips. All45 static-only gates pass, with independently parsed raw coverage showing
zero dynamic operations: CLI2348/2348, E2 driver2075/2075, E3A2577/2577. The44 old
gate entries and old212 result objects per lane are unchanged. Runner20, probes10,
host73 and observations22 pass; `suite-typecheck.json` retains the full suite.

Both inputs pass E3A runtime controls in both hosts. E1/E2 two-input replays,
D1 planner135 and baseline207 projections, metadata136/42 and stress8, global15,
bootstrap18 and D2 two-input replays all pass. `replays-results.json` retains the
suite-level output; individual result files retain source hashes and subprocess
records. A final label-only edit changed F07/F09 output to `REPRESENTABLE PASS`;
`label-refresh-results.json` rebuilds that driver, reruns both-host two-input
controls and refreshes its separate coverage record. No inherited source or
expected record changed after the full rebuild.

`preservation.json` verifies2644 protected files, unchanged historical failure
evidence, all60 blocked corpus variants and exact inherited records. Original
hostile-cast and type-import failures are retained separately from successful
validation. No dynamic exception, pin change, C++ change, source execution or
conformance admission is included. This is an implementation handoff for
independent review, not coordinator acceptance. No successor or main publication
was performed by this writer.
