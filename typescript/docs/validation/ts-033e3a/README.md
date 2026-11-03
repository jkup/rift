# E3A compiler feasibility stop — not an accepted implementation

2026-11-03, assigned base 6638b2b. E3A was claimed and the copied matrix frozen
before editing. Production files and the E2 fixture are now restored to that
accepted base. This milestone contains evidence and a resumable candidate only.
E3A remains incomplete; no successor, setup, execution, admission, dynamic
fallback, compiler pin change or historical evidence change is authorized here.

## Exact blocker and requested bounded revision

F07/F09 require deliberately invalid host inputs. The candidate Node driver
rejects a legacy Environment supplied as ScriptEnvironment and a structural fake
supplied as opaque ScriptGuestCallable before ticks/effects. The pinned static
compiler cannot represent those calls at their frozen typed API boundaries:

* `forged-record.ts`: SC2002, a structural record cannot be asserted as the class
  with private state (6 statements, 5 static).
* `forged-class.ts`: SC1090, an unrelated class is nominally invalid in compiled
  code (8 statements, 7 static).
* `foreign-union.ts`: SC2003, legacy class is not an arm of the Script environment
  union (6 statements, 5 static).

`reduction-results.json` retains Node output (`false`), failed static-only builds
and independent coverage reports for all three. This is an invalid test-input
representation blocker, not evidence that the production private brand or
activation representation needs changing. No assertions were dropped to pass.

Recommended revision for independent decision: preserve production APIs/brands;
run impossible-to-type adversarial payloads as explicit Node host-only controls,
with native compile-rejection controls for those invalid casts. Continue both-host
runtime controls for genuine wrong-record/wrong-Realm, representable malformed
and cyclic chains, identity, guards and budgets. This changes the matrix's demand
that every adversarial payload execute natively, so it has **not** been adopted.
Alternatively authorize a specific host-validation boundary. Do not export private
state or add fake production callables merely to accommodate tests.

## Evidence before the stop

The unreviewed candidate implements factory/opaque metadata, private assignment
naming maps, descriptors/source, closed Callable migration and empty activation
only. It has no E3B methods/stubs. The record retains one ActivationKey and no
activation collection. These are candidate descriptions, not acceptance claims.

* Expr-key probe: Node/native exact `seed|false|distinct`, static-only build and
  11/11 separate static coverage. Initial Zig sandbox access failure is retained
  separately; approved installed Zig build passes without pin changes.
* Candidate typecheck passes. Two runtime-input Node runs match the expected
  output in `candidate-node-results.json`.
* Genuine factory/empty-activation E2 fixture retains all original L/T/C and input
  output records in Node/native for seed|7 and other|11.
* Candidate E2 builds static-only with 2071/2071 coverage. The new driver stops at
  2555/2557 (SC2002/SC2003), with no successful native result. Both gates are in
  `candidate-compiler-results.json`.
* Full inherited rebuild/replays were **not** completed. No complete matrix,
  full E3A acceptance, conformance, collection or performance claim is made.
* After restoration, typecheck and runner20 pass. Preservation verifies all
  production/tests/tooling/pins/history are unchanged from the base.

## Reproduction and resumption

From `typescript`, `node docs/validation/ts-033e3a/reduce.mjs` reproduces all three
failures without the candidate. `check-seam.mjs` builds the positive Expr Map
probe; place the pinned Zig installation on PATH with library access.

`candidate.patch.json` holds a JSON-encoded unified diff of nine tracked
source/fixture edits with repository-root paths (encoding preserves blank diff
context lines without trailing whitespace in the evidence file). After a contract
decision, decode the JSON string and apply it at repository root, then copy
`candidate-driver.ts.txt` to `typescript/test/script-function-materialization.ts`,
and `candidate-input-{a,b}.txt` to the corresponding
`typescript/fixtures/script-function-materialization/{a,b}.txt` paths. Rebuild
before `candidate-check.mjs` or `capture-candidate.mjs`; those tools capture the
reconstructed candidate, not baseline acceptance. Initial driver/coverage retain
the test narrowing corrections preceding the two remaining blockers. No additive
build gate was installed because the candidate cannot yet satisfy the contract.
