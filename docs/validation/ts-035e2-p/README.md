# TS-035E2-P review evidence

Candidate base `51bf64d`, 2026-11-05. Design only. Read
`../../script-selection-ledger.md` for exact APIs, schemas, ordering and scope.
Smallest proposed implementation is E2a's two new planner/test files. E2b policy
history, E2c checkpoints and E3 conformance receipts are separate assignments.
No production transport receipt, nonempty registry or restart resume exists.

From `typescript`:

```powershell
node docs/validation/ts-035e2-p/verify.mjs
node docs/validation/ts-035e2-p/model.mjs
node docs/validation/ts-035e2-p/e2a-corrections.mjs
```

These are bounded offline host scripts. They do not run a guest, full build,
native compiler, launcher, existing test or old evidence-writing orchestrator.
`verify.mjs` writes only this new directory, and checks preserved whole-file
hashes before and after. Its disposable scratch directory is resolved/checked
inside this directory before recursive cleanup. The local pinned corpus root
is the existing export used by C's tests; missing bytes cause failure, never
network retrieval or a fabricated successful result.

Actual API evidence:

- 5,277 tracked TypeScript files preserved by whole-file SHA256 (TASKS and
  coordinator-owned COORDINATION excluded). This includes all production,
  existing tests, historical raw evidence and E1. No old-test proposal edits.
- Fixed empty E1 reader; exact full debts for 120 ordered lane slots. Both
  actual planCorpus calls verify the existing local 33-file corpus, reproducing
  every pinned slot identity/hash/byte length/ordered harness in the literals.
  Each lane remains 60 blocked, feature19/profile41, zero admitted or executed.
- 154 actual serializer fixtures replayed through both current decoder entry
  paths plus context validation. Both directions of v1/v2 wire rejection and
  actual v1 ledger rejection of a v2 envelope. Module rejected in both Script
  decoder paths. Actual unsupported-operation and resource outcomes accepted
  structurally with blockers, demonstrating why ledger admission is separate.
- 35 context/limit substitutions rejected by real boundaries. These are
  structural/context checks, not proof of trusted transport provenance.
- 15 input/persistence witnesses: empty/duplicate/unknown/fixture selection;
  revision and retrieval retaining null variants; direct malformed-metadata
  rejection; missing includes before/after a verified include; corrupt second
  include retaining both variants and empty exposed harness; current v1 persist;
  an attempted exclusive hard-link publication returning EPERM. The last
  witness is a retained storage feasibility failure, not checkpoint acceptance.
- Two complete original C producer bundles from its retained zip, one per
  lane, including exact child bytes, plan, record, completion facts and license.
  Every file is checked against C's immutable archive index. Both decoders and
  inspectScriptEnvelope replay saved parent facts. These are historical
  observation records, not new conformance records or usable receipt tokens.
- Retained D8 evidence has 212 PASS records per lane and 71 native gates. None
  was rebuilt or rerun by this design task; preservation is the claim.

`model.mjs` runs 63 design-only checks: thirteen full report literals (both
lane initial/final, all eight statuses, fail-to-pass retry preserving headline,
Module terminal, unknown metadata denominator, include failures, all-pass exit0,
cancelled/missing exit2); private one-use receipt/rejection atomicity model;
ordered history/first-attempt tampering; process-local checkpoint authenticity,
stale/dirty/context/second-reopen rejection; nine persistence phase literals and
two indeterminate recovery decisions. No exported authority/test seam exists.
Receipt/all-status models use explicitly synthetic admitted slots, which the
production E2 schema rejects. They freeze later requirements, not E2 support.
Persistence fault phases are a state-transition model, not injected OS faults;
the actual filesystem probe stopped at EPERM, before collision verification.
`link-probe-failure.txt` retains the initial failure and reduced interpretation.
E2c storage remains unvalidated pending separate review; no fallback was added.
Actual E2 implementation suites must test the new APIs once assigned.

Literal files are checked in. Normal replay never regenerates expectations.
`freeze.mjs` is the retained one-time capture tool, not a test prerequisite.
It captured corpus identities from accepted ts-031b-a ledgers and E1 debts;
verify subsequently compares those to fresh offline local-byte planning.
`capture-producers.ps1` reproduces exact two-lane bundle extraction from the
accepted C archive; normal replay reads the checked-in files instead.
`closure-inventory.json` gives exact source declarations/lines/hashes;
`callsites.txt` gives current consumers. Source changes invalidate preservation,
so line locations cannot silently drift under this evidence.
The producer bundles are byte-preserved using local Git attributes. Their
original LICENSE files contain trailing spaces; those exact upstream bytes
are intentionally retained and are the only `git diff --check` exceptions.

Review decisions requested: accept outer Module policy terminals with no wire;
accept E2a as the only first implementable slice; accept the explicit E2b/c
separation and process-local-only writable reopen model. No scope expansion is
requested. An authenticated restart journal or E3 bridge needs a separate
design, exact proposals and acceptance. Historical v1 and C remain unchanged.

Correction after review of `5e9492b`: `initial-candidate/` retains that design,
README and result summaries. `wrong-revision-literals.json` freezes complete
two-lane actual planCorpus results and outer selection projections for the
literal revision `wrong`: all 33 selected files remain, each null slots with
input/revision-mismatch. Surrounding UUID/policy fields are explicitly synthetic
fixture data, not a production closure or minted token. The requested revision
is exempt from the Hash40 rule; actual slot IDs still use pinned REVISION.
`second-check-literals.json` freezes twelve combinations of second authority
read/invalid/mismatch and closure read/mismatch, exact error/trace and publication
flags. Authority is awaited/compared before closure; earlier failure wins.
The successful-different-authority row is defensive and unreachable under E1's
fixed canonical reader, not an added registry format or injection capability.
`e2a-corrections.mjs` passes 35 checks including actual wrong-revision planning,
complete projection equality, unknown-denominator retention and compound-error
precedence/no-publication. Normal replay never regenerates these literals.

The coordinator's elevated isolated link probe subsequently succeeded for bytes,
EEXIST/no-overwrite and retained destination after temp unlink. Its reported
output is copied in `root-link-probe-review.txt`; the producer EPERM and original
conclusions remain in initial-candidate and link-probe-failure. This does not
accept E2c or establish power-loss durability. E2b/c and E3 stay deferred.

Verification artifacts: `verify-results.json`, `model-results.json`,
`actual-plans.json`, `input-witnesses.json`, `boundary-witnesses.json`,
`context-mutations.json`. Full report values include every file status, both
execution counters, unknown denominator, first outcomes, retries, ratios and
exit codes. Do not summarize these results as conformance progress.
