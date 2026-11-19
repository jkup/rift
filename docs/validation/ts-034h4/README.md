# TS-034H4 candidate — complete, awaiting independent acceptance

Sole writer chat `01a1a660-5424-7162-a720-37063e1ebc6e`, base `3742d71`, branch
`codex/test262-classification`. This is a tested implementation candidate, not
public Script admission or a main publication. Actual and independent second
acceptance remain the coordinator's responsibility.

The nine-file implementation adds source-derived bounded preparation, callee-owned
strictness/this binding, defining-Realm boxes, a distinct sloppy FDI body lexical
environment, captured reference mode, identifier deletion, and mode-aware global
writes. Existing strict entry/default APIs, restricted descriptors, source and
completion identity, capability authorization, budgets and cleanup are preserved.

[Approved amendments](AMENDMENTS.md) supersede two frozen interface details after
independent compiler reductions and semantic review: local binding reads accept
an unused fourth defaulted flag; the shared mutable Reference retains its exact
original shape, while a private wrapper carries Script mode. One explicitly typed
inner Reference owns the cached key throughout Get/Put/Delete and receiver selection.
The wrapper allocates a host object, with no guest allocation or tick change.

## Final evidence

- `validation-summary.json` derives the final pass from retained evidence.
- `nonstrict-results.json`: complete fixed M/R (including R17)/D/X/N controls and
  all190 fresh/seven-seeded prefixes, on Node and freshly rebuilt native for both
  frozen runtime sources. Native driver4,076 static, zero dynamic. Runtime source
  text is read after compilation and checked against the frozen files; the outputs
  include exact defining-Realm Number boxes and top-level7 versus11.
- `native-build-results.json` / `amended-build-results.json`: all53 static-only
  builds and independently parsed zero-dynamic coverage gates pass. The rebuild
  prioritized the two actual regressions, then rebuilt every remaining gate once.
- `guest-node-results.json` / `guest-native-results.json`:212 exact old records
  each, deep equality against accepted base; no skips or migrated tests.
- `for-update-results.json`, `switch-results.json`, `catch-results.json` and
  `replays/execution-results.json`: H3/H2/H1/E4 both hosts and both inputs,
  including190/208/104 inherited prefix matrices and H1 consumed-throw history.
- `replays/replays-results.json`: all17 inherited groups pass. The original and
  bounded `node-boundary-results.json` / `bounded-boundary-results.json` are
  explicitly Node-only reflective capability checks.
- `typecheck-final.log`, retained suite results under `replays/`: final typecheck,
  runner20, host73, observations22 and probes10 pass. Unchanged host suites/probes
  were not repeated solely for the approved engine amendments; Node/native guest
  tests and all affected engine gates/replays were rebuilt/rerun.
- `preservation.json`, `source-preservation.json`, `final-source-hashes.json`:
  3,458 protected tracked files, zero old-test migrations, original52 gates plus1,
  frozen controls and all60 corpus variants still blocked. Historical evidence,
  C++, pins and coordinator-owned COORDINATION remain unchanged by this writer.

## Retained failures and limits

`compiler-checkpoint.md`, `initial-full-build-results.json` and
`initial-guest-native-results.json` retain the initial two failed acceptance checks.
`compiler-investigation/` retains minimal Node/native reductions and proposals;
[AMENDMENTS.md](AMENDMENTS.md) records approval and the42-statement fully static
wrapper feasibility run before production integration. The actual unchanged
saved-key native test passes in `amended-key-coercion.json`; the unchanged
function-setup gate and full inherited setup replay also pass.

A supplemental narrower-base structural-widening example still differs between
Node and native even with the pre-H4 Reference shape and no wrapper. Its original
and reduced evidence is retained separately. It required no H4 production/test
workaround; no claim is made about arbitrary structurally narrowed host references.
The required actual Value-returning helper shape and complete preserved suites pass.

Initial Zig library-access and host temporary-ledger rename restrictions are
retained separately from successful approved-access runs. Coverage never treats
scriptc's misleading "fully static" summary as sufficient when dynamic operations
are also reported. This is Windows x64 evidence only.

Duplicate formals, arguments/eval/with, Annex B, construction, genuine errors,
other grammar and public harness/conformance admission remain excluded.

## Reproduction

From `typescript/`, with pinned Zig on PATH and access to its libraries:

```
npm run typecheck
npm run build:native
node docs/validation/ts-034h4/final-checks.mjs
node docs/validation/ts-034h4/preserve.mjs
node docs/validation/ts-034h4/summarize.mjs
```

Fresh full host validation can use the relocated `replays/suites.mjs` with
`typecheck test:runner test:test262 test:observations test:probes test:guest:node`.
The relocated replay scripts preserve historical source inputs and assertions;
only their output/dispatch locations changed. No background builds remain.
