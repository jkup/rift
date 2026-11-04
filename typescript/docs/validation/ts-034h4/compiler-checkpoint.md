# TS-034H4 implementation checkpoint — review required

Sole writer chat `01a1a660-5424-7162-a720-37063e1ebc6e`, base `3742d71`, branch
`codex/test262-classification`. The candidate is **incomplete and uncommitted**.
No successor, publication, main change or public Script admission occurred.

Nine-file production implementation, new driver/fixtures, one additive native
gate, feature inventory and task status are in the working tree. COORDINATION is
coordinator-owned and untouched by this writer. The original contract, twelve
traces and two runtime sources were copied before production work; `freeze.json`
records their hashes. The accepted H4-P audit also retains the pre-existing input
hashes. There are zero existing-test or historical-evidence edits.

Two new compiler failures require review before workarounds:

1. [Union-signature proposal](compiler-investigation/PROPOSAL.md): adding the
   approved defaulted global read strictness parameter exposes dynamic dispatch
   in two unchanged function-setup test helpers. The isolated equal-signature
   proposal is four static/zero dynamic versus four static/one dynamic, with
   equal Node/native output. Actual driver remains a failed gate.
2. [Reference representation proposal](compiler-investigation/REFERENCE-PROPOSAL.md):
   the approved optional Reference flag loses cached-key mutation on native
   structural widening. The minimal source prints string in Node, object native;
   removal of the field or explicit caller annotation isolates the trigger.
   Annotation is not proposed as an old-test migration. A private Script wrapper
   with default-strict operation arguments is proposed for review, not applied.

## Completed validation

- H4 driver: both complete runtime inputs pass on Node and freshly built native,
  fixed M/R (including R17)/D/X/N controls and 190 fresh/seven-seeded prefixes.
  `nonstrict-results.json` retains both lanes; separate coverage is 4,067 static,
  zero dynamic. Late-global, failed-FDI, primitive receiver, Symbol numeric,
  exact abrupt/provenance and local delete controls are additive.
- All53 static-only native builds succeed. **52/53 coverage gates pass**.
  `script-function-setup.ts` reports3,697 static plus2 dynamic operations.
  `initial-full-build-results.json`/`native-build-results.json` retain the failure;
  the misleading compiler "fully static" summary is not treated as acceptance.
- Node guest suite212/212, native211/212, no skips. The native saved-key regression
  is retained, not weakened or filtered. Full inherited acceptance is incomplete.
- Typecheck, runner20, host73, observations22 and compiler probes10 pass. The
  initial sandbox ledger rename failure and approved-access success are retained
  separately. Final test-only additions also pass `typecheck-final.log` and the
  H4 two-lane driver.
- Source preservation:3,458 protected tracked files; no old-test migrations;
  all60 corpus variants remain blocked. `preserve.mjs --source-only` passes.
  The full preservation command intentionally cannot pass until the failed gate
  and native record are corrected.
- The additive bounded Node-only reflective capability check passes and is
  explicitly not claimed as native reflective syntax.

## Pending after review

Apply only approved amendments, recheck actual failing gates/native key caching,
then run complete H1/H2/H3/E4 and17 inherited replays, both Node boundary suites,
full native/static gates and exact212-record comparison. Own relocated replay
scripts are prepared; their historical sources remain unchanged. No H4 inherited
replay execution or full acceptance is claimed at this checkpoint.

All full-build/probe/host/guest/reduction processes have completed. No background
writer or build should be resumed. The next action is coordinator review of the
two proposals, not a pin/compiler/test migration or a candidate commit.
