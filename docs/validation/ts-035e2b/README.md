# TS-035E2b implementation candidate

Implements the accepted in-memory policy ledger contract against base301de92.
The four synchronous exports own private frozen states and authentic tokens;
selection consumption is per ledger module. There is no persistence, execution,
receipt admission, runtime registry activation, or new CLI caller.

Only three existing files change, byte-for-byte as the accepted E2b-P proposals:
script-plan.mjs, script-plan.test.mjs, and E2a support.mjs. Historical JSON is
unchanged. The guarded eleven-literal closure migration remains exactly the
approved helper. Selection policy is v3, selectionVersion2, ledgerVersion2.

The production validator checks descriptor-based closed schemas, metadata and
variant relationships, pinned slot-ID revision, ordered closure records and their
saved digest, registry identity, harness occurrences, debt IDs/authority and final
coverage, and complete attempt history. It does not load the manifest, reread
closure bytes, reconstruct blockers, or compare selections to fixture literals.
Saved authenticated planner ownership supplies provenance. Structurally valid
alternative histories are not durable anchors; E2c remains deferred.

Validation from typescript/:

```powershell
node docs/validation/ts-035e2b/validate.mjs
```

The inherited alias tests require Windows hard-link/junction access. A denied
link is a failed run, never a skip. `--inherited-only` resumes the inherited
checks without repeating the E2b suite. Each runner invocation creates a new
run directory. The unchanged E1 and exact migrated E2a tests run in isolated
copies under that directory, with old raw evidence copied as read-only inputs.
No backup, historical restoration, or broad deletion is used. The original
E2b-P verifier runs with only its output destination redirected here, retaining
all 5811 baseline comparisons and three exact whole-file proposal checks.

`script-ledger.test.mjs` translates all 149 model controls and 28 complete
report/history literals into actual copied production-module calls. Its helper
uses real E2a tokens and authenticates them before substituting retained
selection snapshots in an isolated inspector. Private copied-source faults
exercise selection/history corruption and candidate failure. There is no test
hook or additional export in production. The legacy history-control log label
`defensiveOracleOnly` describes private corruption cases; these now execute the
production schema validator, not the model's fixture-equality oracle.

`extended.mjs` additionally uses the canonical unmodified planner and ledger
for eight complete both-lane initial/partial/final/retry reports and histories.
It tests descriptor/key/type mutations, zero getter calls, safe counter bounds,
candidate rejection with unchanged report/state/next ordinal, creation failure
before publication followed by reuse, and foreign ledger ownership. Frozen
expectations are independent retained literals, never generated from reports.

The first translated run passed 28 literals then exposed a test-adapter issue:
ES module namespace exports are alphabetically ordered, whereas model object
keys preserved insertion order. The original test source and failure remain.
The correction checks the exact sorted export names and named function lengths.
The first inherited run passed seven E2a groups and failed the hard-link fixture
with EPERM; its complete output is retained. Neither failure changed production
behavior or weakened an assertion. No native build or probe suite is repeated;
212 passing records per lane, 71 static gates, and 60 blocked slots (19 feature /
41 profile) remain retained evidence, not new native claims.

Candidate stops for coordinator actual/independent second review. E2c storage,
anchors/reopen and E3 receipts/admission remain outside this implementation.

Final checks: acceptance-check.json records all successful suites. The complete
E2a24 traces and eleven fresh projections are retained in e2a-results/.
run-LVNrmY retains the initial E2a EPERM failure; run-CE9UsX retains the
successful elevated inherited run, source-copy identities and before/after
verifier transcripts. extended-publication.txt covers the final338 controls
and creation-publication failure/reuse checks. All sessions have completed.

Coordinator actual/second review identified two defensive schema omissions before
commit: a known slot under a mismatched requested revision, and empty host or
platform strings. The original root witness/source/results and pre-review ledger
source are retained here. The bounded correction requires the pinned revision
only when slots exist, and nonempty host/platform values. Three isolated actual
creation failures assert exact selection errors, successful reuse, and subsequent
consumption. A canonical wrong-revision all-null selection is still accepted, with
a complete independent 33-file incomplete report. review-correction.mjs reruns
new API/schema controls and preservation only; the unchanged inherited suites
above were already complete before this two-line production correction. Their
retained fresh selection hashes correctly describe that earlier candidate.
