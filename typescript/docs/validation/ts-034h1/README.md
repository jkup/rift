# TS-034H1 implementation handoff

2026-11-04, base `3925efa`, unchanged branch `codex/test262-classification`.
Implementation and validation are complete under the precise coordinator-approved
existing-test amendment below. Awaiting root and independent second review.
No successor, merge or publication.

## Approved scope amendment

`test/script-execution.ts:851` includes the exact newly admitted source
`"use strict";try{}catch(e){}` in its whole-source rejection list. The unchanged
E4 driver therefore fails in both Node and freshly rebuilt native after its first
eleven PASS groups. Raw results are retained in `e4-old-catch-rejection.json`.
This was an incompatible old expectation, not a compiler failure or a reason to
reject the new grammar. The assignment originally forbade existing-test edits;
the coordinator independently reproduced the failure and approved exactly the
two-site amendment on 2026-11-04.

Applied precise amendment: replace only that negative source
with `"use strict";try{}catch(e){}finally{}`; add the original exact source as a
positive normal/undefined case in the existing scalar matrix. Retain every other
assertion and stdout label. `e4-amendment.patch` retains the approved review sketch.
The new preservation verifier reconstructs both edits from base3925efa and compares
the entire test file, rather than allowing arbitrary changes to that path.
`final-driver-build.json` retains the rebuilt E4 static-only/separate coverage gate;
`replays/execution-results.json` now passes both inputs in both lanes. The initial
full50-gate result remains in `initial-full-native-build-results.json`; the combined
final gate file replaces only E4. No production changes followed the full build.

## Implementation

Exactly four production files changed. Syntax owns DeclarationSite, BlockStmt and
TryCatchStmt. The parser admits simple catch only in declaration-plan mode.
Legacy parsing/return auditing remain closed. The iterative collector visits the
whole protected subtree before creating catch and handler scopes; catch owns only
its parameter, handler vars propagate to the enclosing variable scope, and nested
functions stop propagation. Non-strict catches, handler lexical/function conflicts
and catch-var collisions reject without new certification codes.

Preparation verifies original owner/block/body associations, unique node keys,
scope parents/order, strictness, ranges and parameter metadata. Public plan
inspection copies the parameter and its Location. A private CatchActivation is
bound to owner key, scope and original outer environment and advances once through
fresh/started/complete. Allocation, binding creation and initialization have the
three prescribed ticks. Publication occurs only after initialization, then the
original handler runs through ordinary block evaluation. Catch remains in body
phase; finally restores its enclosing frame. No AST/body or activation API is
exported and no callback can observe unpublished setup.

Only guest and engine-diagnostic throws are caught. Unsupported/resource outcomes
and host exceptions bypass catch. Catch consumption clears the private active
propagation marker without clearing diagnostic history. C14 reuses the same
completion, Value and Location at A:1:27 and B:1:29, including defining-Realm B;
the final snapshot identifies B and a copied coordinate900:9. Definition counters
are9 then18, callbacks28 then40, final40; the history-only control ends at24.
UpdateEmpty(undefined) preserves exact throws and explicit empty completion rules.

The semantic basis is the accepted pinned edition16 §14.15.2–3 and engine262
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171` TryStatement implementation retained in
`../ts-034p/upstream.json`. The design's private unpublished simple-identifier
initialization is unobservable to guest code; destructuring is excluded. No
engine262 code was copied. The accepted H1 correction governs tick placement,
private associations and propagation provenance.

## Frozen expectations and passing evidence

Before production edits, `frozen-controls.md` and byte-exact
`frozen-correction.md` retained C01–C14, D01–D10 and P14/P14R/P05/P15F. The original
literal14/14/5/15 arrays are unchanged. `frozen-input-hashes.txt` binds the final
two literal input files before final execution. They contain the exact prescribed
sources without trailing newlines and are read whole, without trimming/rewriting.

* `catch-results.json`: both runtime sources in Node and newly built native,
  every fixed C/D row, cross-unit/cross-Realm controls, exact identity, explicit
  empty neighbors and all104 fresh/seven-seeded resource prefixes per run.
  Retained P15F closures execute in new ample-budget sessions, in their defining
  Realm and through same-profile cross-Realm transfer. Session limits never change.
* `native-build-results.json`: all49 retained gates plus one appended catch gate,
  static-only and separately parsed zero dynamic coverage; catch3277 static.
* `guest-node-results.json` / `guest-native-results.json`: exact212 old records
  in each lane, no skips. `replays/suite-test-guest-node.json` has full transcripts.
* `replays/suite-typecheck.json`: typecheck, runner20, host73, observations22 and
  probes10 pass. `probe-results.json` retains native probe coverage.
* `replays/replays-results.json`: all17 inherited helper/reduction replays pass,
  including E1/E2, E3A/B, ER-A/B, D1, metadata/stress, global/bootstrap and D2.
  `replays/node-boundary-results.json` remains explicitly Node-only reflection.
* `preservation.json`:3154 protected files plus the exact two-site E4 amendment,
  all60 variants still blocked, exact old record/gate preservation.
  `final-source-hashes.json` binds implementation and the amended test.

The new declaration replay extends only inherited non-catch expected scopes with
the required literal `catchParameter:null`; old fields/IDs and fixture bytes stay
unchanged. `replay-initial-results.json` retains its initial metadata mismatch.
This expectation migration is confined to the new evidence copy, not old tests.

The complete E4 replay now passes after the approved amendment. Independent H1
acceptance remains pending. The original E4 failure remains retained and was not
counted as a skip or removed from the denominator. No native compiler workaround or pin change was
needed. Initial preflights retain missing Zig PATH/sandbox-library access failures;
approved Zig access succeeded. The first focused test also had newly authored
C04/C10/parameter coordinate mistakes, corrected by literal source index arithmetic
(64/52/parameter30..31) without changing any frozen tick expectation. Initial
runtime-file neighbors were replaced with the exact prescribed two sources before
final validation; final expected outputs are literal7/11 once each.

## Reproduction

From `typescript`, using the pinned Node/scriptc/Zig environment:

```text
npm run test:guest:node
npm run test:guest:native
node docs/validation/ts-034h1/validate.mjs
node docs/validation/ts-034h1/refresh-e4.mjs
node docs/validation/ts-034h1/replays/validate.mjs
node docs/validation/ts-034h1/replays/replays.mjs
node docs/validation/ts-034h1/replays/node-boundary.mjs
node docs/validation/ts-034h1/replays/suites.mjs typecheck test:runner test:test262 test:observations test:probes
node docs/validation/ts-034h1/preserve.mjs
```

The E4 refresh is needed only after its test changes; it retains the other49 gates.
Both the focused catch and complete E4 replays pass against the final build.

No finally, optional/destructured catch, sloppy/Annex B, genuine Error objects,
other grammar, harness execution, public CLI/profile/observation/conformance
admission, C++ or historical evidence changes are included.
