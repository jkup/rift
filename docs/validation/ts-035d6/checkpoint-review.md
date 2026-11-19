# TS-035D6 implementation checkpoint — review required

Base: `2d794e5`, branch `codex/test262-classification`. No candidate commit or acceptance claim.

Applied the exact five production proposal files and four approved whole-file migrations. `ts-035d6-p/verify.mjs --applied` passed: 898 files, four migrations, 894 identities, all 60 blocked variants. Historical evidence has not been replayed or overwritten. COORDINATION belongs to the coordinator and its concurrent change is not ours.

The initial new Node driver passed 612 source/context/profile/metadata/prefix/budget/ready runs against the frozen literals (`source-results-node.json`, `source-node.log`). These results precede the stronger history assertions now in the driver and are not evidence for its current bytes. Typecheck passes with the current driver. The full native build was interrupted after 13 passing gates because review is required below; no complete native or guest validation is claimed. Missing PATH and sandbox Zig failures are retained separately. The eventual runner must rebuild all 69 gates and preserve old outputs recursively; it has not yet been authored. The wire host test exists but has not been run.

## Reduced history failure

The stronger test combines seeded history with successful zero/one/two-unit prefixes, then snapshots before rejected preparation. It currently also asserts that `lastAbrupt` always identifies the seed. This is false for nonempty prefixes: `evaluateScript` clears lastAbrupt on its next top-level evaluation (`src/script-execution-internal.ts` around line 1237). `history-reduction.mjs` and its complete output show:

- Prefix length zero: before/after rejection retain the seed record/Realm identities and history location 1:20.
- Prefix lengths one/two: successful prefix clears lastAbrupt before preparation; before/after rejection both have null history.
- Seed completion remains a separate retained throw Number 3. Numeric preparation is a syntax-error rejection and consumes no evaluator budget.

`history-failure.log` retains the actual failing assertion. This is a new combined test expectation, not a demonstrated production defect or a claim that the frozen 12 no-effects literals are wrong: those literals do not include the successful prefixes.

Requested review: allow the combined test to compare the actual nullable snapshot taken after prefix execution with the snapshot after rejection, while retaining seed completion/value identities separately. Require seed-record history identity in the existing no-prefix seeded tests. Alternatively seed after the successful prefix if review requires a nonnull seeded history at the rejection boundary. No production inspection API change is proposed. Do not weaken the frozen 12 no-effects cases.

Per assignment, stopped before changing the failing API/oracle expectation. Remaining work: resolve this expectation, clean new driver, run full both-host matrices/wire controls, add recursive-preservation 36-stage runner and preservation inventory, run all required gates/guests/suites, retain fresh outputs, and make a coherent tested commit for two reviews. No publication or successor.
