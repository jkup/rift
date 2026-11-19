# TS-034H3 implementation handoff

2026-11-04, base `4e7b356`, branch `codex/test262-classification`.
Implementation and validation complete; awaiting actual and independent second
review. No successor, publication or main merge.

## Implementation

Exactly five production files implement the accepted classic-for/postfix design.
The lexer opts in only for declaration planning. The parser preserves original
header var nodes, NoIn grammar, postfix targets and line-termination boundaries.
A unary expression cannot reopen an unparenthesized postfix suffix chain;
parenthesized expressions retain their normal suffix behavior. The collector
visits initializer, test, update and body in source order without a loop scope.

The shared evaluator resolves one Reference, gets once, performs
ToPrimitive(number)/ToNumber, writes through that same Reference and returns the
old numeric value. Converted keys remain cached; writes consult current
descriptors and preserve original receivers. Classic for uses original
body/initializer nodes, existing completion payloads and budgets, including
continue/update and break/no-update ordering. There is no new evaluator, runtime,
coercion API, Value domain, public admission or harness execution claim.

## Validation and preservation

`freeze.json`, `frozen-contract.md`, `prefixes.json`, and both actual runtime inputs
were written before production edits. `for-update-results.json` records both
inputs on Node and native, with fixed expected outcomes for F01-F20/U01-U16/
N01-N14/X01-X05 and all190 fresh/seven-seeded prefixes. It checks exact completion
origins at ten stages, caught A then reused B throw provenance, ten reachable
host-fault positions and active outer-session restoration, same-session
cross-Realm reentry, recursive getters/numeric hooks, original declaration node
identities, retained functions/closures and source/depth limits. Measured recursion
steps are169/329 for host/guest getters and202/394 for host/guest numeric hooks;
all terminate through resource completions and restore sessions. The original
infinite-for and unresolved-postfix sources remain runtime controls.

- `native-build-results.json`: all51 retained gates plus H3 pass static-only and
  separate zero-dynamic checks. All51 were rebuilt after the suffix correction;
  the H3 gate was rebuilt after its final test-only callback type amendment.
  H3 is3804/3804 static with zero dynamic statements and zero demotion requests.
- `guest-node-results.json` / `guest-native-results.json`:212 exact old records
  per lane, deep equality against accepted H2, no skips.
- `switch-results.json`, `catch-results.json`, `replays/execution-results.json`:
  H2/H1/E4 both inputs and hosts,208/104 inherited switch/catch prefixes, H1 C14
  consumed throw history and inherited boundary controls preserved.
- `replays/replays-results.json`: all17 inherited declaration, metadata, closure,
  accessor, global, bootstrap, capability and reduction groups pass.
  `replays/node-boundary-results.json` remains explicitly Node-only reflection.
- `replays/suite-typecheck.json`: typecheck, runner20, test262 host73,
  observations22, compiler probes10 and Node guests212 pass. Final typecheck
  is also retained in `typecheck-final.log`.
- `source-preservation.json` / `preservation.json`:3340 protected tracked files,
  exact whole-file two-test migrations preserving H1/H2 amendments and historical
  verifiers, frozen inputs/controls,52 gates,212 records/lane,60 blocked variants.
  `final-source-hashes.json` binds current production/test/build files.
- `validation-summary.json` derives the final status from the retained results.

## Retained failures and review decisions

[Compiler checkpoint](compiler-checkpoint.md) retains the two callback forwarding
reductions and exact independently reviewed approvals. Matching the new test
helpers' callback parameters to the existing Builtin signature removes dynamic
adapters without changing callback bodies, ValueCompletion annotations,
production APIs or pins. Initial/first-amendment coverage failures remain in the
original result files; the final actual-driver gate is `corrected-h3-gate.json`.
A new identity assertion initially compared broad node unions (SC1090); it now
asserts required node kinds before exact identity, like existing preparation
validation. The original source and diagnostic are retained.

Initial Zig sandbox-access failure, host-suite temporary-file rename failures,
and an inherited replay attempt without Zig on PATH are retained separately.
Approved-access reruns pass. `initial-inherited-checks.json`/`inherited-checks.json`
record that environment failure; `replays/replays-results.json` and
`replays-final.log` contain the successful targeted retry of all17 groups. Other
unchanged passing groups were not rerun for test-helper-only type corrections.
Windows x64 evidence only; no broader platform or conformance claim.

## Reproduction

From `typescript/`, with pinned Zig on PATH and approved library access:

```
npm run build:native
node docs/validation/ts-034h3/replays/suites.mjs typecheck test:runner test:test262 test:observations test:probes test:guest:node
node docs/validation/ts-034h3/final-checks.mjs
node docs/validation/ts-034h3/preserve.mjs
```

Coordinator-owned COORDINATION edits remain unstaged. The task becomes done
only after independent review, acceptance and integration.
