# TS-035D7 — non-emitting lexical Statement audit

Accepted design base: `a8acfb9`; implementation candidate awaits actual and
independent second acceptance. This is the two-production-file audit slice of
`docs/script-lexical-statement-rule.md`. It adds no preparation dispatch,
syntax-error emission, executable authority, codec rule, admission or grammar.

## Implementation boundary

`src/parser.ts` adds an exclusive private purpose with bounded parsing, null
retention and actual full EOF. The four `branch` callsites supply their exact
contexts. Only actual `let` in that purpose bypasses the existing branch guard;
the same statement parser must finish its supported binding, initializer and
semicolon before recording a candidate. Function guards and every ordinary
purpose retain their behavior.

`src/script-declarations.ts` constructs one ordinary bounded collector with null
retention. Its existing global veto wins before selection; eligible block pairs
become the same full other-conflict diagnostic used by D5. Invalid lexical
bindings remain in their containing scope for conservative conflict refusal.
Keyword tokens, raw spans/locations and the existing binding-map entry establish
provenance; the parser callsite alone establishes Statement context. Returned
candidate/site/location objects are copied and sorted by source offset. The
disposable continuation AST never leaves the internal handoff.

## Frozen expectations and driver

`validate.mjs` reads the accepted D7-P semantic matrix without regenerating any
expectation. The 140 rows are 44 eligible, 85 blocked and 11 none. Every complete
audit object is compared, including reason, full Diagnostic and full rejection.
664 mutations of blocked-oracle fields must fail comparison with the actual
production result. There are also 564 inherited D2–D6 snapshots, each comparing
eight ordinary entry points and preparation retention against its frozen object.

Every host runs all 704 sources twice, passing the two actual CRLF disk inputs in
both orders: 2,816 total source processes. The alpha input contains a non-BMP
prefix. The driver reads the files through argv/file I/O, repeats audits in both
orders, compares ordinary results before/after audit, checks retained node/name
map identities, and mutates returned candidate arrays, contexts, keyword text
and nested locations before requiring fresh independent evidence. Runtime audit
objects are compared against their frozen rows. Full structural equality also
rejects extra AST/completeness fields. Source/depth neighbors come directly from
the accepted matrix.

`matrix-results-node.json.gz` retains the initial 1,408 Node-only runs.
`matrix-results.json.gz` is the final both-host record, retaining complete stdout,
stderr, exit status, host and order without truncation. Gzip is lossless storage,
not an abbreviated result. The two fixture files exactly copy the accepted raw
bytes; their local `.gitattributes` fixes CRLF checkout behavior.

## Reproduction and historical preservation

From `typescript/`, with the pinned Node/scriptc and Zig on PATH:

```
node docs/validation/ts-035d7/run.mjs
```

The runner builds Node and all 70 native entries, then freezes the current source
closure, runs the new matrix and all 45 inherited required stages, and checks
preservation. `--built` consumes the already completed current full build. It
does not use historical fixed-gate-count orchestrators. Native builds use
`--tier static-only`; `probeVerdict` separately parses every coverage report and
requires zero dynamic statements.

`required-suites.mjs` recursively backs up all historical validation directories
before replay. `capture-history.mjs` snapshots every fresh write by stage, even
when its bytes equal historical output. The inherited bounded UNKNOWN/open I/O
retry handles evidence writes only. The finally path retains changed/new outputs,
removes newly created historical files, restores every prior byte and asserts
restoration. Stage snapshots include the D6 source/wire outputs, all other
inherited evidence and fresh build-result files. Old validation scripts and raw
history remain unchanged.

`preserve.mjs` verifies the exact two-file production scope, one additive build
gate, source closure, restored historical hashes, all 927 frozen old-test byte
identities, the unchanged 212 guest names/expectations on both hosts, all 45
inherited stage names, and all 60 corpus variants still blocked. The five future
dispatch migrations are explicitly not applied.

## Acceptance record

All implementation validation passed in one full native sweep and one full
validation pipeline. No compiler workaround or substantive test failure occurred.
The existing pipeline completed during the chat capacity interruption and was
recovered by polling its original session; no build or stage was duplicated.

| Check | Result |
|---|---|
| Static-only builds and separate zero-dynamic gates | 70/70; new driver 1,102/1,102 static |
| Guest records | Node 212/212; native 212/212; no skips |
| D7 complete source runs | 2,816; 140 frozen rows and 564 inherited snapshots, both orders/hosts |
| Full blocked oracle controls | 664 altered fields rejected |
| D6 | 1,248 source runs; 256 actual wires; 77,184 malformed; 512 producer negatives |
| D5 | 408 source runs; 56 full blocked literals; 342 negatives |
| D4 / D3 / D2 / D1 | All inherited complete literal, wire and control stages passed |
| A/B/C, H1–H7, M/E4 | All required replay stages passed; C transport172 and host21; A21 |
| Typecheck / runner / host / observations / probes | PASS / 20 / 73 / 22 / 10 |
| History | All 4,587 prior files restored and byte-asserted |
| Scope | 927 old-test identities; zero migrations; all 60 variants still blocked |

The 46 successful stages are the new D7 matrix plus all 45 inherited stages,
with exact inherited stage-name identity checked by preservation. Measured
records are in `run-results.json`, `required-suite-results.json`,
`restoration.json`, `preservation.json` and their retained logs.
Actual and independent second acceptance remain the coordinator's responsibility.
No successor or publication is authorized by this implementation handoff.
