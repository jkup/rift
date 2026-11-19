# TS-035E3-P design/evidence handoff

Base 3cbb301. Candidate for coordinator actual audit and independent second
review; no production, old-test or historical evidence changes. No execution
grants, builds, native process launches, conformance launches or registry edits.
COORDINATION is owned by the coordinator and excluded from this commit.

The design closes actual E1/E2/C/decoder/producer ownership before proposing a
small first slice: a data-only composeScriptEnvelope using the one existing
classifier, with the exact C source-identity test migration. Later receipt owner
work is explicitly deferred: the driver rejects conformance mode, the producer
hardcodes observation mode, E2 and C have different incomplete-for-execution
closures, and streaming versus retained artifact hashes need separate fields.
No public mint/register/load/JSON authority or injected verifier is proposed.

## Evidence and provenance

- preservation.json: 6703 protected tracked file byte identities; verify.mjs
  passes. Excludes TASKS/COORDINATION and owned new outputs only. Retained
  212 guest records in both lanes, 71 static gates and C++ remain unchanged.
- closure.json: 108 actual source/import/export inventories. The narrative
  identifies dynamic build/filesystem closure and producer callsites as well.
- proposal-manifest.json: two exact whole-file old-file proposals with before/
  after SHA256. proposals/script-compose.test.mjs is the complete proposed new
  test, not an edit to a live test. artifacts.json pins the final owned inputs.
- run-hg5gHL: actual source read-only E1/E2 API runs in both lanes, each 60 slots,
  19 feature/41 profile, zero execution/body count, 16 actual denied controls.
  Complete selections and initial/final reports retained. 154 frozen A codec
  rows decoded by actual child/envelope modules and initial proposed constructor;
  38 context/binding mutations, four actual priority controls, 21 private lexical
  owner-model controls. The private model is not production reachability or
  filesystem failure evidence. Both-lane selection is not both-host execution.
- extended-WEQKXR: initial 2392 required-field deletions/15 representative
  complete originals, 13 full retained report expectations independently
  recomputed, three exact migrated C codec tests on fresh ordinary copied files.
- initial-candidate: exact original proposals retained before local correction.
  Review noticed that classification adds bytes to a size-bounded draft.
- size-Qtd5NQ: reduced full witness: initial proposed constructor returns a
  65537-byte envelope which the real full decoder rejects; corrected constructor
  rejects it. This is a proposed-code defect, not a production defect. Both
  original and corrected outcomes retained; no relaxed size limit.
- Final proposed constructor test: four groups pass, including 154 complete
  literals, malformed/injection/context rejects, all eight statuses, exact final
  envelope 65536-byte positive and 65537-byte negative. Tool transcript records
  the run; final-validation.json records command/results as a summary.
- extended-nllRUL: final exact migrated C codec tests 3/3, 2392 required-field
  deletions, 13 complete report expectations pass after the size correction.
  This repeat is justified by the changed source/test proposal hashes. Original
  evidence remains intact. No old test was changed or launched from its old path.

The full report requirement literals are copied with explicit origin from
ts-035e2-p; they are not labeled as newly admitted output. Frozen A codec literals
are synthetic retained fixtures, never fresh Node/native output. Actual E2c
revocation/checkpoint evidence is retained unchanged and not rerun. Future
admitted ownership/transport/artifact/revocation controls are design obligations,
not measured successes. No claim of authentic conformance receipt is made.

## Reproduction

From typescript, run `node docs/validation/ts-035e3-p/verify.mjs` (read-only),
`node --test docs/validation/ts-035e3-p/proposals/script-compose.test.mjs`, and
optionally `node docs/validation/ts-035e3-p/extended.mjs`. The last creates a new
extended-* directory, never writes historical outputs or needs junctions.
`probe.mjs` creates run-* and requires the already present pinned corpus at its
documented local path; it neither fetches nor executes guest source.
`size-witness.mjs` creates size-* with the retained proposed-code reduction.
Do not rerun freeze.mjs to bless changed source: it is the initial artifact
generator, not a verifier. Verify the recorded before hashes instead.

Two discovery commands used an unsupported PowerShell glob spelling and a
nonexistent guessed filename; rg reported these directly and the searches were
corrected to directory/glob filtering and actual script-observation-types.ts.
One documentation patch had no matching context and made no changes. These were
tooling-only failures, not successful probes or suppressed implementation errors.
No native/IO uncertainty was worked around or retried in production.
