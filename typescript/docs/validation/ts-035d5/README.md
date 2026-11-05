# D5 non-emitting numeric assignment audit

The only production changes are `src/parser.ts` and `src/script-declarations.ts`.
A private bounded parser purpose records number-token/Expr associations and
continues only the six frozen numeric assignment failures after successful RHS
parsing. It requires actual full EOF and null retention. The existing collector
walks the continued tree once; all scope restrictions and conflicts, including
otherwise eligible block pairs, veto numeric certification. Returned token and
operator sites are copied and sorted by operator then target position.

The API returns evidence only. Preparation, executable state, evaluator,
observation, codecs and all historical tests remain unchanged. Parentheses retain
the numeric expression identity; unary, binary, call, update and other targets do
not acquire it. There is no parameter or return continuation in this purpose.

`freeze.mjs` was run before the production edits and verified all 102 accepted
seven-output and retained-node snapshots. `baseline.json` records tracked checkout
hashes, the 67 existing native gates and 212 existing guest records.
`validate.mjs` compares complete audit objects against the accepted design literals
(56 blocked including complete diagnostics and resource fields), seven ordinary
outputs and retained nodes. Both hosts read both CRLF/non-BMP runtime files through
argv/file I/O in both orders. The driver checks fresh source identities, assignment
node identity and grouping-sensitive name eligibility, candidate/site/location/
array detachment and call-order isolation. Source/depth boundaries and nested,
late, mixed-rule veto cases are part of the accepted literal matrix.

`required-suites.mjs` adds D4's 772 source runs, 96 wire rows, 48 metadata controls
and 384 state/history assertions, plus the 342 blocked-oracle mutations, to the
32 inherited D4 stages. It replays D1/D2/D3, A/B/C, H1-H7, M/E4, A21, C172/host21,
typecheck, runner20, host73, observations22 and probes10. The capture hook snapshots
every fresh historical output (including nested replay writes); the outer runner
recursively restores original evidence bytes even on failure. `preserve.mjs`
checks exact old file bytes, C++, the 60 blocked variants, 212 guest records per
host and all 67 old plus one new static-only/independently zero-dynamic gates.

The implementation stops at review. Future emission proposals are not applied.

Validated core results: Node/native each pass all 212 existing guest records;
68 native builds pass their static-only and separately parsed coverage checks.
The new driver is 1054/1054 static. The new matrix passes 408 runs (102 literals,
two hosts, two orders); the standalone Node run also passes 204. D4 source replay
passes 772 runs, D3 154, D2 360 and D1 124. The fresh raw outputs and inherited
stage transcripts are retained here; `preservation.json` is the final acceptance
check for completed inherited suites and exact historical restoration.

Final preservation passed: all 36 inherited stages, 873 old-file identities,
4971 design-protected paths (except the explicitly owned D5 changes), exact
scoped production/build edits, all 60 blocked variants and recursive historical
restoration. No new compiler failure or compiler workaround was required.
Candidate awaits actual and independent second acceptance; no publication.
