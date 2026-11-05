# D8-P dispatch refresh evidence

Accepted base `dbee9bd895a9d73fc4f588eaa1bceb863417117a`.
Read [the design](../../script-lexical-statement-dispatch.md). No production,
real old test, raw history, grammar, execution, codec or admission change is
applied. No full build/native run occurred. The inherited 212 records and 70
gates stay preserved; all 60 corpus variants remain blocked.

Replay from repository root (writes only this checkpoint):

```powershell
node typescript/docs/validation/ts-035d8-p/verify.mjs
node typescript/docs/validation/ts-035d8-p/probe.mjs
node typescript/docs/validation/ts-035d8-p/wire.mjs
node typescript/docs/validation/ts-035d8-p/controls.mjs
node typescript/docs/validation/ts-035d8-p/check.mjs
node typescript/docs/validation/ts-035d8-p/production-check.mjs
```

`refresh.mjs` and `proposals.mjs` are editorial generators, not future behavioral
oracles. Do not regenerate expected literals from future production. The source
matrix reuses accepted D7-P literals and checks actual D7 against every full
audit, not just kind/code. `probe.mjs` checks full current outputs and original
retention, 527 producer contexts, 564 inherited snapshots, 664 blocked-oracle
mutations and both runtime input orders. `inherited-audits.json` records the
actual D7 noneligibility of all 564 inherited sources.

`old-test-proposals.json` retains 952 complete original Git/checkout/result files;
`proposal-manifest.json` and `proposed/` freeze six future migrations, 946
identities. The added migration is D7's preparation-result validator. Production
manifest/proposals freeze five whole files; no proposed code was imported or
compiled. `source-consumers.json` refreshes tracked TS/MJS consumer locations.
`audit.json` freezes protected files, accepted Node artifact hashes and blockers.

`wire-matrix.json` holds 320 full binding/context/child/envelope/ASCII fixtures:
256 accepted existing-rule controls, 64 rejected future lexical controls and
95840 malformed checks at both decoders. The current serializer produces literal
bytes, but actual future producer/native emission is still unvalidated.
`--future` requires all five codes and must fail before implementation.

`future-controls.json` freezes prefix/budget/profile/metadata/history/ready and
880 full producer-oracle mutations. `control-audit.json` records actual current
state/identity and 180 invalid occurrence checks. Harmless prefixes, history seed
and ready controls are the only executed bodies. Nullable history after successful
prefixes matches the accepted D6/D7 behavior. Both hosts remain future obligations.

Original D7-P oracle corrections and D6-P failed occurrence/history proposals
remain untouched in their historical directories. The copied current fixtures
use their accepted corrected contracts. Any new failure is retained here.
`checks.json`, `probe-results.json`, `wire-audit.json` and production check results
are bounded offline evidence only. Actual and second independent review remain
required before implementation.
