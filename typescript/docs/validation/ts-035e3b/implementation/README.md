# TS-035E3b tested implementation candidate

The coordinator-approved request-boundary amendment is applied exactly. Required
implementation validation is complete; coordinator actual/independent review and
second acceptance remain pending. No publication, successor, receipt authority,
admission grant, or registry activation is included.

The accepted amendment is frozen in
[`../request-boundary/proposal-manifest.json`](../request-boundary/proposal-manifest.json).
It replaces the two existing producer/driver files and the new producer test,
and withdraws the exact unshipped request module after its hash was checked.
Request records are private; the new public APIs take positional string arrays.
The explicit withdrawn object-key guarantees and revised array semantics remain
documented in the reviewed boundary design. Existing observation APIs and their
source prefix are unchanged. All original proposals, reductions and failures remain.

## Fresh validation

`run-location.json` identifies the ordinary-file sandbox:
`typescript/build/ts035e3b-implementation-jB4vTS`.
Its Node/native output directories began empty; no old binaries were copied.
All required helper executables were checked against the unchanged 71 build gates.
Use these fresh artifacts for review; the checkout's pre-existing build outputs
are not the artifacts used for this validation.

`final-stages.json` retains 40 successful stages, composed from the three initial
successful build/producer stages and 37 resumed stages. The failed initial Node
guest attempt remains separately retained rather than overwritten or counted as
a pass. No successful build or producer suite was repeated.

| Check | Result |
|---|---|
| Fresh Node build and final typecheck | Pass |
| Native static-only build plus independently parsed coverage | All 71 gates pass; driver 4,443/4,443 static, zero dynamic |
| Full guest suite | 212/212 in Node and 212/212 native; no skips |
| Producer | 66 full literal child comparisons across both hosts, 114 checked-source driver negatives, eight late failures |
| Revised boundary | Actual Node exports/arities and record/source-vector controls; four exact pure JSON-spoof errors and eight checked-source OS spoof rejections |
| A serializers and decoders | Four fresh lane/input streams, 77 records each; 21 decoder tests |
| E3a constructor | Four tests |
| C | Three codec tests, 172 transport records, two live-codec tests, 16 remaining host tests |
| D1–D8 | All affected source matrices, wire, mutation/oracle and extra controls pass; D8 2,062 source runs and D7 2,816 source runs |
| B/H7 | Throw-inspection, boundary and harness-bundle controls pass |
| Host/observation/runner | 73/22/20 tests pass |
| Compiler probes | All ten pass, both executions and static/coverage gates |
| Actual policy selections | Both lane labels retain empty registry, 60 blocked slots: 19 feature/41 profile, executed0/body0 |

`producer-artifacts/` retains actual generated source/result files from the frozen
test. `producer-artifacts.json` independently matches the multiset of 66 complete
raw child records to the frozen literals. Its compatible IDs can be nonunique
for identical records across lanes; lane-specific execution and exact process
assertions are established by the unchanged frozen test loop and its passing log.
All 114 negative and eight spoof result paths remain absent. The eight late cases
retain their absence, directory-write failure, or original-file-preservation
requirements. Generic70 is not promoted to a measured zero-read/zero-Realm or exact
native precedence claim.

`inherited/` contains 31 fresh inherited outputs. Deterministic serializer and
matrix outputs are retained even when they reproduce historical bytes exactly.
The complete isolated run and C transport archives remain in the sandbox. No old
history was restored, deleted, or rewritten. `completion.json` verifies all
15,207 original copied input identities, the additional protected counter fixture,
the absence of source and generated request modules, and all 71 fresh binary
hashes after the suites.

## Retained failures and bounded corrections

1. Earlier original-proposal failure: the first sandboxed full build had 71 Zig
   installation-access failures. Its coverage separately exposed two dynamic
   operations. The original logs/reductions remain in the parent evidence folder.
   Root and second review approved the explicit contract revision before applying
   it. The successful full build used the pinned Zig 0.17.0 PATH with approved
   access; scriptc/compiler pins and gates were not changed.
2. Fresh sandbox dependency omission: the initial Node guest run passed 211/212.
   Only `examples/counter.js` was missing from the copy, yielding the expected CLI
   read error/exit66. `initial-guest-node-results.json` and `guest-node.txt` retain
   that complete run. `repair-sandbox-input.mjs` verified the original fixture
   against the protected baseline, copied only those exact bytes, and ran the
   reduced case successfully. The complete Node suite was then rerun successfully;
   native and all later suites ran once. No expected result or original fixture
   changed. The initial preparation script is retained unchanged.
3. Post-suite collection initially overconstrained the copied scriptc verification
   cache to byte identity. `collection-failure.json`, the original `collect.mjs`,
   and `cache-inspection/before.json`/`after.json` retain the failure and inputs.
   The only changes are 54 `ino` values identifying copied runtime files. All 98
   artifact paths/content hashes/sizes/timestamps and both original/copied object
   bytes were checked; the changed inode values match the copied files. No compiler
   code, pin, package metadata or original cache was modified. The bounded
   `finish-collection.mjs` verifies that exact cache difference and all remaining
   identities; it does not regenerate any historical hash or rerun suites.

The earlier bounded design authoring failures and decimal probe command correction
remain documented in their original evidence directories.

## Preservation and review

Run from the repository root:

```text
node typescript/docs/validation/ts-035e3b/request-boundary/verify.mjs --implemented
node typescript/docs/validation/ts-035e3b/implementation/verify.mjs
```

The boundary verifier is the approved replacement mapping: 6,790 protected
baseline files with exactly the approved source exceptions, 175 original proposal
artifacts, 54 earlier E3b evidence identities and 51 boundary-design artifacts.
The old four-file verifier intentionally remains immutable and describes the
withdrawn contract; it is not rewritten to silently accept the amendment.

Implementation verification adds complete current artifact identities and measured
counts. Outputs are retained and exact; avoid rerunning authoring or initial
collection scripts over them. Independent review should use new output directories.

Sessions 95899 (initial build/producer/guest attempt), 26342 (remaining suites),
and 28058 (initial collection) have finished. No running session remains.
Stop for final actual/independent and second acceptance. COORDINATION is root-owned.
