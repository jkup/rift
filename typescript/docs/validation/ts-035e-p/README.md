# TS-035E-P evidence

Candidate design only, accepted base `1e2f072`. See ../../script-capability-ledger.md.

Run from typescript:

```
node docs/validation/ts-035e-p/audit.mjs
node docs/validation/ts-035e-p/model.mjs
node docs/validation/ts-035e-p/e1-controls.mjs
```

The audit checks 5,227 unchanged existing whole files, replays 154 frozen A
records through actual child/full decoders, rejects 1,232 context/classification
mutations and both version directions, and retains a concrete executed-but-
blocked unsupported witness. Module boundary witness rejects Module in wire v2.
Actual manifest debt reconstruction preserves 33 files/60 blocked variants,
19 unsupported-feature and 41 unsupported-profile first outcomes. No upstream
byte retrieval or engine execution is claimed. Historical D8 212 guest records
per host and 71 gates are checked as retained evidence, not freshly rerun.

The model writes 38 full synthetic admission literals and 13 ledger oracle
cases. It is deliberately separate from production and cannot confer authority.
It is not a complete future E2 schema/validator. Full missing controls and the
module-slot decision remain explicit review blockers for E2, not E1.

preservation.json is the whole-file identity proposal manifest: zero old-test
migrations. Do not rerun `--freeze` during review; ordinary audit detects drift.
callsites.txt and interface-closure.txt are textual ownership/callsite evidence.
Initial probe error is retained in initial-failure.txt.

No registry file or production/old-test/history/compiler/profile/manifest/CLI
change; no build, launcher activation, publication or successor dispatch.

## E1 review correction

Candidate 9562032 was not accepted. Its design/README are retained under
initial-candidate/; all original executable/literal evidence is unchanged.
The corrected contract defines the exact five-field metadata projection,
known/null/unknown manifest ID handling, variant membership, failure precedence,
fresh frozen outputs, and exact-canonical-byte reader acceptance. E2 remains
deferred; no extra E2 implementation or schema work is claimed.

e1-literals.json contains 130 debt cases (including FULL four-field arrays for
all 60 variants) and 33 byte/argument/IO reader cases. e1-controls.mjs replays
those frozen expectations, never rewriting them in ordinary mode. It also tests
non-JSON argument controls, unknown repeated legacy reason mapping, detachment
and deep freeze. e1-results.json retains totals and exact extra witnesses.
The IO/evidence models are not production APIs. Do not run --freeze in review.

Second review found that the fbf4b64 evidence model called caller array.keys()
before rejecting extra keys. array-accessor-root-witness.json retains the root
reproduction (getter called once instead of zero); initial-candidate retains
that model and its results. The corrected list validator uses own length/index
descriptors and numeric enumeration, with no caller array methods or iterator.
Sixteen new controls cover own keys/every/Symbol.iterator/index accessors on
each of flags/features/includes/locale and assert exact rejection with zero
getter calls. The frozen 130 debt/33 reader literals and E1 contract are unchanged.
