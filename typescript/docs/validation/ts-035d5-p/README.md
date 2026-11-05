# TS-035D5-P evidence

Candidate based on `267e4e8`; see [design](../../script-assignment-target-rule.md).
No production or real old-test changes. The first proposed slice is non-emitting;
all 873 complete D5 old-file results are identities. Three separately rendered
future emission proposals require later acceptance. No full build, native run,
guest execution, harness execution, admission or reference-engine execution.

Reproduce from repository root:

```
node typescript/docs/validation/ts-035d5-p/verify.mjs
node typescript/docs/validation/ts-035d5-p/probe.mjs
node typescript/docs/validation/ts-035d5-p/wire.mjs
node typescript/docs/validation/ts-035d5-p/check.mjs
```

`freeze.mjs` authors snapshots against existing Node artifacts; it is not an
implementation of the future audit. `cases.mjs` authors expected semantics;
`probe.mjs` checks 56 explicit valid-reference neighbors and 193 accepted D4
preparation snapshots. `make-wire.mjs` derives a new fixture runner from the
accepted D4 design runner without modifying or loading changed decoders.
`proposals.mjs` renders full old-file bytes/hash manifests. These editorial
generators are not acceptance substitutes for the future implementation.

102 literal source rows, two runtime input files, 128 future wire controls.
Review correction freezes full Diagnostic and rejection objects for all 56
blocked rows, including resource count/limit. Future drivers must deep-equal
complete results. `blocked-expectations.json` cites explicit same-width neighbors
and authored block-veto diagnostics; `oracle-controls.mjs` rejects 342 wrong-field
mutations. Six original coarse-oracle files and their hashes are retained under
`original-blocked-oracle/`. All 16 corrected offline checks pass. The initial
evidence import-name collision, resulting stale-matrix rejection, exact-CRLF
staging failure and unset Git identity failure are retained separately.

Current actual Node encoder / both current decoders: 96 accepted old-code rows,
32 numeric-code rejections, 39296 malformed/structural/binding checks. Host labels
are future obligations, not native measurements; malformed numeric controls use
a disclosed known-code surrogate. No numeric producer exists yet.

Preservation covers 4971 tracked paths outside task/coordination ownership, current
Node artifact hashes and all 60 selected variants blocked. 212 guest records per
host and 67 gates are inherited, not rerun. Exact S18 Git blob is verified; pinned
V8 excerpts and spec links document read-only source inspection. Source fetching
is separate from offline probes. Historical validation outputs remain unchanged.

`verify.mjs --audit-implemented` checks only exact D5 old-file/fixture closure;
`--emission-applied` checks the three separately proposed migrations. Neither
flag grants implementation authority or replaces future scoped preservation.
Retain failures in this directory if any check fails; never overwrite a failed
record with a successful retry. Stop after the candidate commit for actual and
independent second review.
