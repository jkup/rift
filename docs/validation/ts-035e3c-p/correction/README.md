# E3c-P capture-oracle correction

`55ffc90` was not accepted. Actual and independent review found that constant
unit IDs (`id:'u0'`) still passed all 94 original controls. The root's original
mutation script/log and passing process result are retained under `original/`.
All original 170 candidate artifacts/proposals remain unchanged, as do all 7,480
protected original files. The original design document is retained separately.

Only the **new/unshipped test proposal and design documentation** change. The
input implementation proposal remains SHA256
`4fc40ed011acacc56f217d06949c9b9790f9cd1ffb2412294a0d6258e67d0547`.
No production API, source, old test, registry, receipt or deferred certification
contract changes. The new `proposal-manifest.json` supersedes the original test
mapping; it does not authorize implementation.

## Independent oracle

`freeze-capture-literals.mjs` is a one-shot authoring tool importing only Node
builtins. It reads the unchanged frozen manifest and exact local pinned bytes,
independently verifies git blobs, and uses the manifest's explicit variants and
defaultIncludes/includes lists. It never reads returned captures, E2 selections
or the input/capture/planner/transform modules.

- `capture-occurrence-tables.json`: complete explicit ordered tables for both
  33-file/60-slot lanes, with every unit ID, ordinal, role, path, blob and strict
  prefix. Module remains Module.
- `pinned-byte-identities.json`: all 36 verified original test/harness byte records
  with full base64, SHA256, git blob and byte length.
- `expected-captures.json.gz`: eight full capture arrays (normal, wrong revision,
  missing include, first file unavailable in each lane) and five explicit
  synthetic repeated/reordered/raw/non-strict/strict cases. No expected field is
  derived from the code under test or supplied as a default during comparison.

The corrected complete test performs whole-array `assert.deepEqual` checks on
all fields, not selected summaries. Repeated/zero-limit captures are also checked
against the independent normal literal. Original E2 anchor and full report
assertions remain. A first-file blob failure separately asserts original E2
slots=null and exact input error; include failure retains known slots.

Five synthetic cases call the actual lexical `capture` function in a freshly
written test copy with a test-only export. The public module's three exports
remain unchanged; this copy is not installed and cannot mint any selection or
receipt. These cases are input-contract probes, not admitted executions.

## Measured results

| Retained run | Result |
|---|---|
| `run-8ompSu` | Complete corrected test exit0. All 94 previous controls, six actual records, four input-fault records, seventeen full capture comparisons. Both public lanes remain 60 blocked, 19 feature/41 profile, executed0/body0. |
| `root-mutant-frAC7u` | Same full test with only root's constant-ID source substitution: exit1 at `capture-literal/node/success`, before alias operations. Expected failure; setup and capture succeed. |
| `mutations-j5pMXq` | Thirteen unmutated whole-capture baselines pass. Fifty-five actual isolated source mutants produce 110 completed captures across both lanes, all rejected by whole independent literals. |

The mutation matrix corrupts and deletes every unit/slot/file field; additionally
reorders/omits files, slots and units, duplicates units, relabels Module, removes
strict prefix while keeping bytes/hashes/lengths internally consistent, changes
unknown null slots to empty arrays and corrupts partial-input state. A setup,
IO, syntax or capture exception is a failing harness, never a killed mutant.
`mutation-contracts.json` retains every exact guarded source change;
`results.json` indexes full mutated captures retained in gzip, their lane/case
and independent expected-literal identity. The exact root source mutation is
also tested through the full corrected public-API test above.

## Review commands

From `typescript`:

```powershell
node docs/validation/ts-035e3c-p/correction/verify.mjs
node docs/validation/ts-035e3c-p/correction/probe.mjs
node docs/validation/ts-035e3c-p/correction/probe.mjs --root-mutant
node docs/validation/ts-035e3c-p/correction/mutations.mjs
```

The normal probe requires hardlink access inside its fresh output directory;
run with the same access used for the accepted setup of the original alias test.
Missing/denied setup fails, never skips. Root-mutant and mutation probes need no
link creation. All use the existing pinned local export and exclusive fresh
outputs. No guest, preflight, full suite or native build is launched. Native lane
means host policy/input data for that lane, not fresh native engine execution.

`verify.mjs` is read-only and checks original artifacts, full byte preservation,
unchanged implementation proposal, exact corrected test/design/literals, full
recorded successful captures, all mutation results and both-lane denial reports.
Its `--implemented` mode permits only the exact two proposed production additions.
The original verifier and manifests remain immutable historical contracts: their
old design hash intentionally refers to the saved original design. Use the
correction verifier for this candidate.

The literal authoring and freeze scripts use exclusive one-shot output files;
do not overwrite them to regenerate expected data during review. Tests consume
the frozen literals. No updated hash can substitute for an independent oracle.

Stop after the corrected design commit for actual/root affected checks and
independent second review. No publication or successor work.
