# TS-034H6-MP design/evidence handoff

Base `18011eee8954b35723f53262e9a5cc2555a3c940`, shared branch
`codex/test262-classification`, 2026-11-04. Candidate only; actual and independent
second review required. C remains blocked. No production, old tests, historical
evidence, compiler, pins, observer, admission or coordinator file edited here.

The contract is [harness-map-default.md](../../harness-map-default.md). Proposed
production ownership is exactly array-map.ts and symbols.ts; the internal API,
allocation path, loop and OperationContext stay unchanged. Script selection gets
canonical species and distinguishes invalid selected values from unsupported
custom constructors. Legacy selection stays unchanged by running Realm profile.
No Object exception, constructor shadow, invented Array intrinsic, construction
permit/seam or public API. The absent foreign Array intrinsic is explicitly
unrepresentable, never claimed tested.

`replacement-manifest.json`, `proposed.patch` and `proposed/test/harness-errors-b.ts`
render **one exact replacement in one old file**, not applied. E24/E25's numeric
constructor negative becomes a branded Script TypeError with exact message and
zero callback assertion using the existing error helper. The helper verifies
GuestError, TypeError prototype, name and engine-diagnostic origin. The new MP
matrix retains separate custom-constructor unsupported controls. Every other
byte is preserved. `baseline/test/` is the base Git blob, not a live test copy.
CP's five formatting replacements remain unaccepted/unapplied history.

## Offline verification

Run from repository root:

```powershell
node typescript/docs/validation/ts-034h6-mp/verify.mjs
git diff --check
```

The audit checks all4089 protected base blobs, unchanged tracked content outside
ownership, all140 existing test files, the exact one-file proposed reconstruction,
`git apply --check` without application, 16 direct consumer paths, 54 semantic
rows,14 literal traces,308 step-prefix controls (both inputs/seeds combined),
224 call controls, and12 rejected oracle mutations. It also checks that TASKS
edits begin only at the assigned MP entry. COORDINATION is coordinator-owned and
excluded; concurrent coordinator edits are never staged by this writer.

`freeze.mjs` generated design data from source-derived literal vectors and base
Git objects, never runtime output. `verify.mjs` has an independent literal table.
Initial generator execution exceeded its256MiB child-output buffer while reading
historical blobs; increasing only that offline reader buffer to1GiB completed.
This is not a compiler/semantic failure or a production workaround.

Git-normalized content preservation is established by exact base blob hashes and
the changed-path allowlist; worktree CRLF normalization is not reported as a
semantic edit. The complete proposed file preserves the base blob's byte layout.
Do not run freeze to adjust expectations to future implementation results.

All MP semantics are **UNEXECUTED**. Prefix counts cover the machine tables only;
the additional exact parsed-getter and independent-session reentry schedules in
the contract are not inflated into those counts. There was no native build,
typecheck, runtime probe, suite rerun or C implementation in this assignment.
Inherited accepted evidence883648b remains80executed rows/3779static/zero dynamic;
it demonstrates the regression, not the proposed fix.

## Review focus

- Running Script profile chooses the extension; object provenance does not.
- Constructor=null is invalid; species=null defaults; an object constructor may
  default even when itself nonconstructible. A selected object never recursively
  looks up its own species.
- Every object constructor undergoes canonical Get, including foreign functions
  and values named Object or Array. Only a real foreign intrinsic Array could be
  exempt; none exists in current interfaces.
- Result allocation/error Realm is the restored map Realm. Nested mapping from
  a foreign getter operates in that getter's Realm, shares counters, and cannot
  allocate the outer result early. Independent Script sessions retain independent
  counters and abrupt histories; their completion identity can cross unchanged.
- The exact B negative migration and legacy preservation policy require review
  before implementation. No historical verifier is edited to hide a migration.

Source evidence: ECMA-262 edition16/2025 ArraySpeciesCreate, ArrayCreate, map;
engine262 revision d553e7b52501fbc47eae981c8d0fa7a5c26d0171 ArraySpeciesCreate and
ArrayProto_map were read through the GitHub connector. Direct links and adopted
versus excluded choices are in the contract. Actual runtime/Realm/accessor,
constructor-slot, dispatcher/finally and consumer interfaces were read at base.
No upstream code copied and no model implementation executed as an oracle.

Stop after coherent design commit for actual and independent second review.
No successor, branch switch, merge or publication is authorized by this handoff.
