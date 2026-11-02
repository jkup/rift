# TS-033D2: host-only global declaration instantiation

Implementation handoff, 2026-11-02. Assigned base `ab41e3d`; coordinator tracking
commit `8c8662d` preserved. Branch `codex/test262-classification`.
Implementation is ready for independent review. Acceptance remains incomplete:
the final observation replay reproduced the known CL006 cancellation-test race.
No successor or Script execution work was started.

## Implementation and boundary

The sole new production module is `src/script-global-declarations.ts`. It checks
Script Realm, strict plan and root/indices before ticks, then performs current
lexical/restricted-property checks, prior lexical checks for every var occurrence,
reverse function admission, forward repeated var admission and ordered creation.
Winning functions are reversed once into source order; vars retain their first
surviving site. Lexicals stay TDZ. Abrupt results return unchanged; host errors
escape without catch/retry; creation prefixes are not rolled back.

The exact full-signature materializer is explicit and has no fallback. Only the
host test supplies one, returning a noncallable marker. A normal primitive throws
`declaration materializer requires object`. No source initializer/body runs,
no actual function is created, and context Realm/call/tick state is preserved.
Existing parser/plans, GlobalEnvironment algorithms, Realm, runtime, interpreter,
observation, protocol, factories, toolchain pins and all execution guards remain
unchanged. The seam is not exported through the interpreter/observation API.
Trusted stand-alone fault environments do not establish exotic global support.

The fixed ECMA-262 2025 §16.1.7 and pinned engine262 GDI were read from the accepted
[retained specification](../ts-033d-p/spec.json) and
[engine source](../ts-033d-p/engine.json). The implementation follows the frozen
admission/creation separation and last-function ordering, not engine262's generator
machinery, agent state or broad grammar. No upstream implementation was copied.

## Frozen controls and results

`frozen-expectations.md` captured literal G01–G16 and all neighbors before the
production module was written. Host assertions use explicit descriptors, operation
order and source-derived literal locations, never planner output as an oracle.
`test/script-global-declarations.ts` checks:

- G01–G16 and phase neighbors, including eight W/E/C combinations for function
  and var declarations, inherited properties, extensibility, previous initialized
  or TDZ lexicals, restricted builtins and namespace shadowing.
- Exact G03 reverse admission/source creation and all occurrence ticks; repeated
  CanVar with unique CreateVar; multiple lexicals/functions and descendant vars.
- Exact eleven-tick sample at every budget0–11, including the allocated marker
  without a property, original resource completion/count/limit/location/origin,
  and an identical host tick sentinel at each of the eleven boundaries.
- G15 original guest completion/value/location/origin and host sentinel identity,
  plus every remaining abrupt primitive/materializer/creation seam, no later
  operation and retained creation prefixes.
- Materializer declaration, environment, context and unit identities; noncallable
  markers; changed current state on repeated plan invocation; strict empty plan,
  malformed root/IDs, non-strict/legacy priority and primitive-normal rejection.
- 12000 repeated vars (36001 ticks), interruption in the forward scan, 6000
  unique vars (24000 ticks), and no body/initializer/call effects.

Two files are read after compilation: `seed|7` and `other|11`. The runtime name
is used in var/let/function controls; the payload is stored in the marker and
checked by descriptor identity. G16 uses runtime names with inert initializer
and function body calls. Both Node and native pass both inputs (`host-results.json`).
These marker comparisons make no claim about calling guest functions.

All 42 static-only builds and separately parsed coverage reports pass, preserving
41 old entries. New host entry: 2208/2208 static, zero dynamic. Both rebuilt guest
lanes preserve all 212 exact inherited records, no skips. `preservation.json`
checks protected paths, exact records, the one additive gate and all60 blocked
corpus variants. No denominator or blocker classification changed.

Fresh-binary replays pass in both lanes: D1 planner135, full legacy baseline207,
metadata136/42 and stress8, globals15 with two inputs, bootstrap18 with two inputs.
The `replay-*.mjs` files are copies of the accepted D1 validators with their output
redirected by their new directory; historical evidence is not rewritten.
Typecheck, runner20, probes10 and host73 pass.

Observation16 passed earlier in the session. The final fresh-binary observation
replay passes15/16 and fails only T30: its100ms cancellation may finish during
pre-launch validation, leaving no transport.json, while the test assumes it
exists. This is the already documented CL006 race. The raw failed run is retained
in `observation-cancellation-attempt.json` and `suite-test-observations.json`.
The test, synchronization seam and limits were not edited, nor was the failed
case retried until green. This prevents claiming complete acceptance.

## Attempts and compiler reduction

`attempts.md` lists read/typecheck/environment attempts. Raw first native report
and source are retained: old gates failed sandbox Zig library lookup; the new
test additionally hit SC1090 on two nullable/union record identity comparisons.
Explicit discriminant/null narrowing retains the same identity checks. There is
no production compiler workaround. `identity-before.ts`, `identity-after.ts`,
`reduce.mjs` and `identity-reduction.json` retain the minimal failure and successful
static/Node/native reduction. The first reduction used equal record shapes and
did not reproduce SC1090; that attempt is also retained. The differing diagnostic
field is necessary to reproduce the compiler boundary.

Host sandbox symlink/rename EPERM and probe Zig library failures are separately
retained; approved reruns pass. `new-driver-coverage.log` is an earlier2195-statement
checkpoint; `native-build-results.json` is the final2208-statement gate.

## Reproduction

From `typescript/`, with installed Zig on PATH and its libraries accessible:

```
npm run test:guest:node
npm run test:guest:native
npm run typecheck
npm run test:runner
npm run test:probes
npm run test:test262
npm run test:observations
node docs/validation/ts-033d2/validate.mjs node native
node docs/validation/ts-033d2/replay-plans.mjs node native
node docs/validation/ts-033d2/replay-baseline.mjs node native
node docs/validation/ts-033d2/replay-metadata.mjs node native
node docs/validation/ts-033d2/replay-stress.mjs node native
node docs/validation/ts-033d2/replay-global.mjs node native
node docs/validation/ts-033d2/replay-bootstrap.mjs node native
node docs/validation/ts-033d2/reduce.mjs
node docs/validation/ts-033d2/preserve.mjs
```

Evidence is bounded to Windows x64 and pinned scriptc0.4.7. P4, callable factories,
Script evaluation, local/function/block instantiation and broader conformance
remain excluded. Independent review and resolution of the unrelated CL006 gate
are required before acceptance.
