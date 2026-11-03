# ER-B implementation and validation

The bootstrap creates one guarded thrower per Script Realm through createBuiltin,
freezes name/length, prevents extensions and installs two configurable accessors
sharing its Value. The Realm hook runs immediately after Function.prototype's
metadata, before other methods. Legacy construction skips the hook. No callback
is unwrapped and no execution/context guard is changed.

The only existing-test changes are the coordinator-approved B03/B04 migration in
script-realm-bootstrap.ts. The data-only own() invariant and all original method,
Realm identity, legacy inventory, guard, row ID and stdout checks remain.

## Frozen rows and observations

* R29: exact descriptor kinds/fields, all four identical endpoint Values, distinct
  Realm objects, defining Realm/prototype, name/length values and W/E/C flags,
  nonextensibility, exact own keys and no own restricted properties. Inspection
  adds no calls or ticks.
* R30: genuine E3 factory functions, inherited dot/computed host keys, exact
  receiver and argument identities and exact preallocated object-payload throw
  completion identity. Literal dispatch trace and no own shadow on failed Set.
  Two files read after compilation select caller/7/left or arguments/11/right;
  a subsequent own data shadow proves selected key/value/receiver storage and
  untouched alternate key/receiver, then is deleted. These are recording-context
  dispatch projections, not actual thrower execution.
* R31: delete/redefine/own-shadow ordinary lookup, ordinary Object.prototype
  objects, unaffected second Realm, restoration and removal of own shadow.
* R32: rejected metadata value/configurability updates, adding properties and
  prototype changes; successful equivalent/empty updates retain exact Value and
  flags. Freeze one prototype accessor, reject changed endpoint without mutation,
  and replace the independently configurable other endpoint.
* R35: direct guarded invoke, legacy evaluator call and Script evaluator creation
  raise exact existing host errors. Nonzero evaluator steps/calls/depth and Realm
  remain unchanged; recording-context counts remain unchanged. Exact legacy
  Function.prototype surface is preserved. No diagnostic TypeError execution claim.

R36 and all actual Script execution remain E4-only. Existing genuine Error-object
and conformance limitations remain. No admission, compiler pin, C++, callback
unwrapping, dynamic tier or history change is part of ER-B.

## Retained compiler evidence

initial-native-build.txt and initial-driver.ts.txt retain the test's rejected
PropertyKey[].join() calls (SC1090). The four-line key-join-before.ts reproduces
unsupported joining of a string/class union; key-join-after.ts compares exact
keys directly, preserving order and rejecting class keys without coercion.
The production implementation needed no workaround. The initial after-build
failed to access Zig's installation inside the sandbox and is retained separately;
reduce.mjs reruns both Node outputs and the rejection/accepted native/coverage
control with Zig available. No failed attempt is counted as a native pass.

## Reproduction

From typescript with the pinned Zig directory on PATH and access to its libraries:

- node docs/validation/ts-033er-b/suites.mjs typecheck test:guest:node test:guest:native test:runner test:probes test:test262 test:observations
- node docs/validation/ts-033er-b/validate.mjs
- node docs/validation/ts-033er-b/replays.mjs
- node docs/validation/ts-033er-b/reduce.mjs
- node docs/validation/ts-033er-b/preserve.mjs

Task-local replay copies preserve original assertions and put fresh results in
this directory, including the inherited runtime-selected ER-A controls. Original
historical evidence files are protected by the preservation audit. Source hashes
and the raw separate coverage reports bind the final implementation.

## Completed producer validation (2026-11-03, Windows x64)

All 212 inherited expected-result records match the accepted ER-A records exactly
in both rebuilt lanes, with no skips. All 48 static-only builds and separately
parsed coverage reports pass: 47 retained gates plus the new driver. CLI has
2676/2676 static statements, bootstrap driver 3086/3086 and restricted driver
2790/2790; zero dynamic statements throughout.

Both runtime inputs pass R29–R32/R35 in both lanes. Runner 20/20, probes 10/10,
host test262 controls 73/73 and observation controls 22/22 pass. Inherited replays
pass: runtime-selected ER-A; E3B function18/block6/global12 and original11 marker;
E3A including separate Node hostile negatives/native compile rejections and
reachability reduction; E2/E1; D1 planner135/baseline207; metadata136/42/stress8;
global15/bootstrap18/D2 with both runtime inputs. The new key-join reduction
reproduces SC1090 before, Node output in both variants and native matching output
with 4/4 static statements after.

preservation.json verifies 2885 protected files, all 60 corpus variants still
blocked, unchanged old records/gate inventory and only the assigned changes plus
the coordinator-owned COORDINATION.md exception. No historical evidence changed.
The producer has stopped for independent review; these measurements do not
constitute independent acceptance or a new platform/conformance claim.
