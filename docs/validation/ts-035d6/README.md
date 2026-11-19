# TS-035D6 numeric assignment rejection dispatch

Implementation base: `2d794e5`, branch `codex/test262-classification`.
This candidate is limited to preparation rejection and the closed fourth v2 rule.
No grammar, execution, serializer, facade, admission, registry, ledger, C++, pins,
CLI, profile or conformance-launch expansion is included.

## Implementation and literal oracles

The five production files are byte-identical to the accepted D6-P proposals.
Only an original `unsupported-syntax` / `parse.assignment-target` failure triggers
one unchanged D5 whole-source numeric audit. Only eligible audit results become
`assignment-target` syntax-error rejections; vetoes return the original failure.
The literal diagnostic uses the selected numeric token's original location.
The original retained nodes, independent legacy return fallback and D1–D5 audits
remain unchanged. Both independent decoders accept the same fourth closed code.

Four old-test files are the exact accepted whole-file migrations. The proposal
verifier checks 898 complete old files: four migrations and 894 identities.
The additive native driver is not registered as a guest record, preserving the
212-record denominator. `source-closure.json` hashes the current source, tests,
tools and configuration. `frozen-inputs.json` hashes the immutable proposal input
matrices and CRLF runtime inputs, without regenerating their expectations.

`validate.mjs` compares complete future preparations and actual full children,
including ASCII serialization, across both hosts. The fixed counts are 102 source
rows, 366 contexts, eight profile cases, 24 prefix cases, 12 no-effects cases,
36 metadata/source-copy cases, 72 budget cases and two ready cases. The 512 wrong
known-rule/location children are compared against actual matched producer results.
Both independent runtime files are read from argv/file I/O in both orders.
The state driver also checks successful prefixes, both Realms, empty/seeded
history, keys/descriptors, sentinel binding identity, active=null and budgets.
Rejected occurrences retain sequential uN IDs and never join completedUnits.

The 256 wire rows compare actual bytes from both hosts with frozen literals, then
feed those bytes to both decoders and compare complete child/envelope values.
Conformance mode, optional diagnostic strings and return execute/harness rows are
explicit synthetic codec controls. Numeric producer rows emit only observation
mode with no diagnostic string; synthetic rows do not grant launch authority.

## Approved history correction and compiler evidence

The original combined prefix/history test failure and reduction are retained in
`history-failure.log`, `history-reduction.mjs`, `history-reduction.json` and the
original `checkpoint-review.md`. The coordinator independently reproduced the
API behavior and a second source review approved this precise new-test correction:
successful prefixes clear lastAbrupt before rejected preparation. Seeded cases
with no prefix still require the exact seed record, Realm, unitId and location
1:20. Unseeded or nonempty-prefix cases explicitly require null history before
rejection. All cases preserve the actual nullable before/after history, budgets
and active state; every seeded case retains seed completion/value and sentinel
binding identities. The frozen 12 no-prefix no-effects literals are unchanged.
No reseeding or production inspection API change was made.

The initial full native build passed all 68 inherited gates, but the new driver
had one dynamic Number(argv) conversion despite a successful static-only build.
`native-dynamic-results.json`, `dispatch-dynamic.log` and `typing-reduction/` retain
that failure, the unsuccessful bare typed-helper reduction, and the successful
existing validated-decimal pattern from the production observation drivers.
The new driver reuses that exact typed validation boundary. `dispatch-gate.json`
records its fresh static-only build and independently parsed zero-dynamic
coverage. `rebuild-dispatch.mjs` combines this gate with the 68 unaffected gates
from this D6 full build, never with accepted historical build results.
Missing-PATH, sandbox-Zig and the earlier interrupted build logs are also retained.
These are not final acceptance evidence.

## Validation and historical preservation

`required-suites.mjs` asserts the exact 68 inherited entries plus the new gate,
then runs nine current/additional stages and all 36 inherited D5 stages in their
original order. It recursively snapshots historical validation files, captures
fresh outputs by stage (including build result writes), archives changed/new
outputs, restores original bytes in finally and asserts restoration.
`historical-inventory.json` and `restoration.json` record this boundary.
Old orchestrators and raw historical producer evidence are not rewritten.

Final results belong in `required-suite-results.json`, `native-build-results.json`,
`guest-{node,native}-results.json`, `source-results.json`, `wire-results.json` and
`preservation.json`. The earlier `source-results-node.json` is pre-correction
partial evidence, not the final driver run.

All 45 stages passed: nine current/additional stages plus all 36 inherited stages.
The final preservation audit passed, including the exact production proposals,
four whole-file migrations/894 identities, 272 source/test/tool/config hashes,
4,415 restored historical files and all 60 corpus variants still blocked.

| Validation | Current result |
|---|---|
| Native static-only + independently parsed coverage | 69/69; D6 driver 4,449/4,449 static, zero dynamic |
| Guest records | Node 212/212; native 212/212; no skips or changed expectations |
| D6 source/state/metadata/budget/ready runs | 1,248; all complete literals and in-process identities pass |
| D6 wire | 256 actual both-host byte literals; both decoders; 77,184 malformed controls |
| Producer oracle mutations | 512 wrong known-rule/location children rejected by full equality |
| D5 | 408 source runs, 102 complete literals, 56 blocked, 342 oracle negatives |
| D4 | 772 source runs, 96 wire, 48 metadata, 384 controls |
| D3 | 154 runs, 77 rows, 30 literal pairs, 26 grammar diagnostics |
| D2 / D1 | 360/64/14 and 124+24 respectively |
| Transport / C host / A codec | 172 records / 21 checks / 21 checks |
| Runner / host / observations / probes | 20 / 73 / 22 / 10 |
| Scope and preservation | PASS; four exact migrations; all protected history restored |

Reproduce from the TypeScript directory with the pinned toolchain and Zig on PATH:
run typecheck, build-native, freeze-source.mjs, required-suites.mjs and preserve.mjs.
The final full-build command will compile all 69 final entries directly; the
retained rebuild script documents the one driver-only repair during this run.

Candidate is ready for actual and second independent acceptance. Publication
remains the coordinator's responsibility; no successor is authorized.
