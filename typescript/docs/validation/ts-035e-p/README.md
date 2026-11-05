# TS-035E-P evidence

Candidate design only, accepted base `1e2f072`. See ../../script-capability-ledger.md.

Run from typescript:

```
node docs/validation/ts-035e-p/audit.mjs
node docs/validation/ts-035e-p/model.mjs
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
