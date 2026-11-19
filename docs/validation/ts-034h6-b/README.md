# TS-034H6-B candidate evidence

Accepted base: `0b93310`; contract: `docs/harness-errors.md` and corrected
H6-BP `427468b`. This directory owns new evidence. Every historical evidence
file and verifier remains unchanged. Actual and independent second review are
required before acceptance; this writer does not publish or start C.

## Implementation

All fifty originating language errors now allocate in the running Script Realm.
Nine conversion/extraction helpers and global binding creation require an explicit
Realm argument. Null is confined to the reviewed legacy/bootstrap callers.
`failure`, resource and unsupported failures retain their original payloads.

The existing H6-A prototype objects are completed, never replaced. Five intrinsic
constructors are created into the private Realm map before global publication;
registration reads that map. Calls and construction implement allocation, message
conversion and cause installation in the frozen order. Generic Error.toString
performs name conversion before reading message. No observer conversion or catch
relabeling exists.

Builtin construction has a separate guarded callback and tagged one-use permit.
The guard checks profile before captured callee and exact context/Realm/invoke/
callee/args/loc/used identity. Ordinary Script construction is unchanged except
its originating TypeError and the branch to builtin dispatch. The existing call
permit adds its tag; OperationContext and ordinary call semantics are unchanged.
`unchanged-boundaries.mjs` checks these exact source boundaries.

## Frozen oracles and execution

`freeze.json` hashes the accepted matrix, corrected traces, review decisions,
closure and two inputs copied before production edits. Their historical
UNEXECUTED labels describe the snapshot, not current evidence. No oracle was
refitted to runtime output. `oracle-source-audit.mjs` compares the driver's literal
15 B source/event tables with that freeze. T13–T18 and all F01–F12 remain C-only
and unexecuted.

`test/harness-errors-b.ts` reads E(7) or E(11) at runtime and requires distinct
literal results. Each input executes E01–E36/G01–G10, 504 fresh/seven-seeded budget
controls across same/foreign Realms, 2,528 additional callback-abrupt budget
controls (number, foreign Error, unsupported completion, host sentinel), and
call-limit controls. T09 replaces the next getter during name conversion.
T07/T11 nested-session controls exercise normal/guest/host exits and cleanup.
Inherited A03 supplies the complete graph/descriptor checks; inherited H5 supplies
ordinary-shell and prototype-getter controls; inherited E4 supplies evaluation
depth257 and provenance controls. These replays are required, not presumed passes.

`validate.mjs` checks both lanes against literal stdout, separate static coverage,
and exact input hashes. `feature-checks.mjs` runs H1–H6-A, E4, both Node boundaries
and Node-only forged slots. `replays/replays.mjs` runs all17 inherited groups.
Copied verifiers change only their new output locations, with the A replay
reading A's original frozen inputs. No historical verifier is edited to accept
new hashes. `preserve.mjs` requires every migrated live test to equal the complete
accepted proposal, all94 replacements across22files, all50 diagnostic producers,
mandatory signatures, 212 exact records/lane and55 inherited gates plus B.

## Guard testability limitation

G06/G07 reach raw attempts with replaced args/location during a live callback.
They reject before effects, but an unused valid permit is never exposed, so these
controls do not prove independent args/loc field sensitivity. Exact source
comparison and actual/second review remain mandatory. No authority seam was
added. Source audit results are not described as executable mutation proof.

## Retained development failures

- `initial-native-build.log`: sandbox could not locate Zig's libraries. The
  approved rerun succeeded; this was an environment access failure.
- `driver-initial-coverage.log` and `driver-initial-dynamic.log`: inferred-never
  throwing test callbacks generated dynamic adapters despite static-only success.
  Subsequent reports located the same adapter in both fabricated-context
  throwing call callbacks (`driver-final-dynamic.log`,
  `driver-annotated-dynamic.log`). Explicit ValueCompletion annotations apply the already accepted
  throw-callback pattern; no compiler/API/pin workaround was introduced.
- `interrupted-native.log`: early sweep stopped when bootstrap was tightened to
  populate the private constructor map before publishing globals. Final gates
  are from the restarted sweep.
- `suites-typecheck-runner-host-observations.json`: sandbox symlink restrictions
  affected host/observation tests. The separately retained approved suite rerun
  is authoritative; no cases were skipped.

B's remaining limitations are the accepted profile: no String/Object globals,
Symbol factory, JSON/map surface, grammar/public CLI/observer/admission changes,
Error subclasses beyond the four named native families, stack, newTarget or
subclassing. All60 corpus variants remain blocked.

## Final candidate validation

All required checks pass: 212 exact records per lane; 56 static-only builds with
separate zero-dynamic coverage (B 4,320 statements); both B inputs and all
E/G controls; H1–H6-A/E4, both Node boundaries/slots and all17 replay groups;
typecheck, runner20, probes10, host73 and observations22. The inherited55 gates
come from the complete final-production sweep. Only B was rebuilt after its
test-only return annotations. No production source changed after that sweep.
`preservation.json`, `error-results.json`, `feature-checks.json`,
`replays/replays-results.json`, `matrix-execution.json` and suite records retain
the evidence. Review and acceptance remain pending.

## G10 review correction (after unaccepted `0ca3b5a`)

Second review found that the nested-session restoration check skipped host unwind
and the final `run('7;', a)` created a new session. Only the new B driver's G10
block and a local retained-call helper change. All original controls remain.
Production and old tests are unchanged.

The message hook now checks the full outer frame, Realm, steps, calls and depth
in `finally`, including while the exact inner host sentinel unwinds. It checks
inner idle cleanup and rejects the retained raw outer callback there. After every
normal/language/host outcome in call/new forms, BOTH original sessions execute
`resume(7);` through a guarded builtin. Each adds exactly three steps, runs once
in its original Realm and record with calls1/depth2, and finishes idle. Raw
retained calls reject during live reuse and afterward without effects. The
original fresh-session control remains.

Only B was rebuilt: **4,367 static statements, zero dynamic**, superseding the
original candidate's 4,320 above. Both inputs/all B controls pass on Node/native;
typecheck and frozen-oracle/source-boundary/preservation audits pass. Unchanged
55 gates and212records are inherited from the coordinator's completed full sweep;
no unchanged full suite or replay was rerun for this correction.

`g10-correction/verification.json` records exact scope and inherited-gate
comparisons; `before-*` preserves prior B evidence. Current gate/results,
preservation and `suites-typecheck.json` describe the correction. Actual and
independent second re-review remain pending.
