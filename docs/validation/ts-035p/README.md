# TS-035P design evidence

Design candidate at `297f8e29cb9aa8d865e832291a9c8bf7df5cc06c`, shared branch
`codex/test262-classification`, 2026-11-04. Await actual and second independent
review. No implementation, admission, publication or successor.

Deliverable: [script-admission.md](../../script-admission.md). First bounded slice
is the parallel v2 types/encoder and both child/full-envelope decoders, synthetic
literal tests and one additive native serializer gate. Constructor inspection
is a separate engine slice: current evaluation unwinds its active frame before
returning, so guest getters require a narrowly owned observed entry.

Read AGENTS, project goals, compiler contract, current coordination and exact
TS-035P; inspected accepted P6, E4 provenance and H7 contracts. Read the actual
driver/encoder, both decoders, classifier, planner, manifest/blocker policy,
ledger, parser certification and Script/session/Realm/property APIs. The retained
`callers.txt` is the no-ignore caller search across src/test/tools, including
incidental same-name matches; the design closure table distinguishes actual
protocol callers. Historical evidence was not rewritten.

Run from repository root:

```powershell
node typescript/docs/validation/ts-035p/audit.mjs
node typescript/docs/validation/ts-035p/contract-check.mjs
git diff --check
```

`audit.json` records inspected source hashes, base/head/branch, preservation,
all manifest-derived variant blockers, and bounded checks of **existing** v1
decoders. Literal valid v1 child and outer records are accepted; changing their
version to 2 is rejected by both. This proves the need for a distinct version
boundary, not implementation of v2. All 33 selected files still produce 60
variants per lane: 30 strict, 28 non-strict, one raw, one module, all blocked.
This uses current variants/blockers with manifest metadata; it is not fresh
corpus retrieval/hash verification or an executed conformance ledger.

No network, build, guest execution or full suite was run. Existing 212 records
per host and 59 native gates are inherited H7 acceptance, not rerun measurements.
New codecs, getter inspection and driver native feasibility remain unmeasured;
the design's both-host matrix is future acceptance, not claimed results.

Preservation compares tracked changed paths against base, excluding only owned
task/design/evidence and coordinator-owned COORDINATION changes (recorded, never
edited here). Audit reports 4396 protected tracked files at this base. No source,
old test, manifest, pin or historical evidence changed. Inspect new untracked
files separately with `git status --short --untracked-files=all`; tracked diff
does not prove absence of untracked files. Only TS-035P status in TASKS is owned.

Review decisions: separate v2 protocol/ledger family; actual constructor names
for negative metadata versus exact identity for assert.throws; instantiation
is runtime with no test-body entry; parent cap facts survive roundtrip; strict
whole-source rule certification stays independent of runtime file/variant
capability. All 60 remain blocked until a separate reviewed activation. Stop at
this coherent design handoff for actual and second independent review.

## First review correction

The actual and second reviews found five implementation-contract gaps, now
corrected in the owned design: an explicit runtime unsupported-operation Result
with direct/secondary mapping and classifier precedence; registered other
Script Realm versus foreign-profile/unregistered outcomes; an exact
ScriptDecoderBinding with all limits and ordered verified transformed source
texts, shared by both decoder APIs; S01's `[1]`/`[2]` asserted only in host-control
evidence while both wire Results remain normal; and a single closed optional
diagnostic rule on specified non-normal alternatives only.

U01/U02/R01/B01/D01 freeze future both-host positive, negative, malformed and
roundtrip controls. They have not been executed. `contract-check.mjs` checks six
document relationships and rejects six deliberate document omissions or
contradictions; `contract-check.json` binds that lint to the design hash. It is
text/shape consistency evidence, explicitly not a prototype decoder or a native
feasibility claim. Existing offline preservation/60-blocked audit is rerun.
Candidate remains unaccepted and stops for actual/second re-review, with A's
synthetic codec-only scope unchanged.
