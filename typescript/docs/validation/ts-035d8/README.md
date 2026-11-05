# TS-035D8 lexical Statement rejection dispatch

Tested implementation candidate against accepted base `ff2117e`. All 50 stages,
212 guest cases in each host, and 71 static-only/separate zero-dynamic gates pass.
The new driver is 4,508/4,508 static statements. Preservation verification passes
for 952 whole files, six exact migrations, 946 identities, 4,744 restored historical
files and all 60 blocked corpus variants. Actual and second acceptance are pending. The five production
files match the accepted D8-P full-file proposals. Only the six authorized old-test
migrations are applied; the other 946 files remain identical. The D7 migration
changes only preparation expectations, retaining every other assertion.

Preparation retries only an original declaration-in-Statement rejection through
the unchanged full D7 audit. Only eligible evidence becomes the fifth closed rule,
using the first source-ordered keyword. All other results, retained nodes,
profile/legacy priority and global vetoes remain. Serializer, execution, grammar,
compiler pins, admission and C++ are unchanged.

## Evidence and reproduction

Run commands from `typescript/`. `required-suites.mjs` uses existing freshly built
Node/native artifacts; it does not rebuild unchanged gates. Before running it,
use `npm run build:node`, `npm run build:native` and `freeze-source.mjs`. The native
lane requires installed Zig access. Then run:

```
node docs/validation/ts-035d8/required-suites.mjs
node docs/validation/ts-035d8/preserve.mjs
node docs/validation/ts-035d8-p/verify.mjs --dispatch-applied
```

The new runner validates exactly the 70 inherited gate names plus the new driver,
using static-only build results and separately parsed zero-dynamic coverage.
It runs four D8 stages and all 46 inherited D7 stages. Historical evidence is
recursively backed up, every fresh write/copy is captured under `inherited/`, and
original bytes are restored and asserted in `finally`, including on failure.
`historical-inventory.json`, `restoration.json`, `source-closure.json` and
`preservation.json` describe those checks. Historical scripts and raw results
retain their original meanings; captured current replays are separate artifacts.

The D8 matrix compares 140 full source results, 527 producer contexts, 12 profile,
24 prefix, 72 budget, 36 metadata, 36 history and two ready controls. It includes
880 full producer mutations, both real CRLF files in both orders, exact saved
completion/value and record/Realm identities, copied locations, nullable history,
all budgets and no rejected effects. Both hosts reject 180 malformed occurrence
sequences. The combined matrix has 2,062 subprocess results. The wire host test
checks 320 actual producer/serializer byte fixtures through both independent
decoders; the future-wire stage checks 95,840 malformed controls. Conformance
mode, optional diagnostics and return execute/harness variants remain explicitly
synthetic codec controls; production continues to emit script-observation.

The inherited D7 matrix retains 2,816 runs, 140 full audits, 564 inherited
snapshots, eight ordinary APIs, retained-node checks and 664 blocked mutations.
D6–D1, A/B/C, H1–H7, M/E4, A21, C172/host21, runner20, host73, observations22,
probes10 and typecheck remain required. Each guest host retains all 212 cases;
all 60 corpus variants remain blocked. Full acceptance remains subject to actual
and independent second review; no publication or successor is authorized here.

## Reviewed nine-row fixture amendment

The original Node matrix failed because nine ready metadata requests use ID
`same`, while their frozen expected complete plans use `valid-ready`.
`reduce-metadata.mjs`, `metadata-reduction.json`, `node-matrix.log` and
`metadata-matrix-failure-results.json` retain that initial failure/reduction.
The coordinator approved only these nine expected IDs in the new D8 validator.
`metadata-amendment.json` contains complete original/amended rows. Guards require
count nine, the exact ready source, request ID and old expected ID; full equality
and negative old-ID controls run in both hosts. Every other field and all 27
other metadata rows remain unchanged. No D8-P fixture or production API changed.
Inspection snapshots and locations are copies; record/Realm identities are
retained. The caller's unit object is not required to retain reference identity.

## Other retained attempts

`native-build-sandbox-failure.log` records the documented Zig installation-access
failure; the completed native rerun used normal library access. The host sandbox
rename failure is retained in `host-sandbox-failure.log`; the normal-access rerun
passes 73 tests. `wire-initial-failure.log` records a new-test property-name typo
(`requestSha320`); restoring the intended `requestSha256` field made the exact
320-row comparison pass without changing expectations. No compiler workaround,
coverage relaxation or original assertion weakening was introduced.

The first outer restoration encountered the previously documented transient
`UNKNOWN/open` error after all 45 pre-restoration stages passed. The initial log
is retained in `restoration-initial-failure.log`. `recover-history.mjs` restored
three remaining files from Git only after each candidate matched its saved
SHA-256; it verified all 4,744 historical files. `restoration.json` records the
exact paths. The existing bounded I/O retry now also covers the outer runner.
`finish.mjs` resumed only the five unfinished standard checks, preserving their
fresh output and rechecking historical bytes. No successful suite was replaced
with stale output or weakened to accommodate the filesystem failure.
