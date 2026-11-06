# TS-035E3b-P retained design evidence

Candidate against `61f7493`, accepted E3a `ce87f62`; see
[`../../script-execution-producer.md`](../../script-execution-producer.md).
Only new design/evidence and this task's TASKS status are owned. COORDINATION is
coordinator-owned and may change concurrently. No production/test/C++ bytes,
registry, launcher, profile, package, compiler pins or prior evidence were edited.

## Reproduce safely

From repository root:

```text
node typescript/docs/validation/ts-035e3b-p/verify.mjs
node typescript/docs/validation/ts-035e3b-p/probe.mjs
node typescript/docs/validation/ts-035e3b-p/supplement.mjs
node typescript/docs/validation/ts-035e3b-p/io-probe.mjs
```

The last three create fresh exclusive `run-*`, `supplement-*`, `io-*` directories.
They never import the proposed engine producer, execute guest source, spawn a
conformance child, compile native code, run a suite, or modify a registry.
`probe.mjs` strips types from only the pure request validator into fresh MJS and
imports that data-only module. This is host validation, not guest eval/Function/vm.
Node's experimental type-stripping warning is retained as a limitation; this is
not scriptc evidence. Actual E2 planning reads the existing pinned corpus at
`C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075`; no corpus launch.

Do not run `freeze.mjs`, `literals.mjs`, `boundaries.mjs` or
`complete-fixtures.mjs` over existing evidence: they are retained authoring tools
using exclusive output, not replay verifiers. The two proposal manifests are
the final authority for bytes; drafts in `initial-candidate` are superseded.
`freeze.mjs` initially captured the accepted baseline and proposals. Later
review corrections, the new test, and complete wire authoring are documented
below. The new-file manifest has both final additions.

`verify.mjs --implemented` is only for a separately authorized future
implementation. It expects exactly the two old-file replacements and two new
files. Normal verification asserts they have NOT been installed. The historical
source/hash tests are unchanged; their snapshots are not regenerated.

## Retained measured results

| Artifact | Meaning |
|---|---|
| `preservation.json` | 6,790 tracked baseline identities excluding TASKS/COORDINATION. Includes C++, history, old tests and all production. |
| `closure.json` | 169 source/test/tool files: whole-file SHA256/import/export/reference inventory. Inventory is not a certification digest. |
| `historical-consumers.json` | 322 historical validation-script consumers with hashes and numbered references; not silently migrated or rerun as current-source tests. |
| `proposal-manifest.json` | Two complete replacements, before/after hashes: producer and driver. |
| `new-file-manifest.json` | New pure request module and implementation-only test, exact full hashes. |
| `run-URuHAc/summary.json` | Corrected offline results: 20 request positives, 57 argv negatives, 21 shape negatives, 154 retained codec positives, 5,976 real Buffer structural negatives, four priority cases, two actual blocked lanes. |
| `run-URuHAc/malformed-literals.json` | Full mutated child/binding pairs, exact paths/keys and protocol expectation. Optional diagnostic deletion excluded because valid. Binding mutations pass through both independent child and full-envelope decoders. |
| `run-URuHAc/actual-denied.json` | Full fresh E2 selections, initial/final reports and complete policy histories for both hosts; 60 blocked/19 feature/41 profile/executed0/body0; four rejected foreign fourth arguments per lane leave prior ledger exact. |
| `supplement-MWiH5C` | 66 full synthetic future wire positives, 693 complete value-neighbor negatives, seven exact Base64 malformed byte inputs. |
| `io-0ujSHr/result.json` | Actual bounded host exclusive-output probe: EEXIST/open, original bytes preserved. Arithmetic streaming example: total10 vs retained8 at cap5; hashes intentionally differ. Not real transport. |

`artifacts.json` hashes every retained evidence/proposal/script file other than
itself and final verification output. `verify.mjs` additionally compares the
unchanged producer prefix after reversing only the authorized private edits.
Local `.gitattributes` preserves exact evidence/proposal bytes under Git's
`core.autocrlf=input`; it does not alter production attributes.
Copied TS proposals retain CRLF; generated `run-*/*.mjs` retain Node's
type-erasure spaces. Their local whitespace attributes preserve those exact
bytes rather than rewriting the retained probes to satisfy a formatting check.
No live output directories were restored/deleted to make verification pass.

## Future requirements, not completed tests

`future-wire-literals.json` contains 66 complete requests/argv/expected children,
bindings, contexts and envelopes: both hosts, both modes, three variants, both
actions, harness/test normal cases and 26 source/step priority cases. They have
valid synthetic canonical request hashes and exact source strings, original
blob/SHA, transformed SHA, UTF16 and byte lengths. Host/platform/build IDs remain
explicitly synthetic. Changing lane labels is not fresh host execution evidence.

`future-producer-literals.json` (40 rows) and `future-resource-literals.json`
(26 rows) are the original seed requirements. Their placeholder request hash is
not authority. The implementation test uses the complete `future-wire` rows.
`argv-negatives.json` contains 57 exact pure-parser rejections, reused in both
future driver lanes (114 cases). `future-late-failures.json` has eight complete
driver failure requirements: late missing source, strict-prefix mismatch,
result-directory write failure and existing-result preservation, each host.
The new test consumes these full fixtures without projection to two status fields.

`retained-codec-literals.json` copies all 154 frozen A serializer contracts with
original source SHA. Full objects retain original/secondary/inspection/source
and Realm identity fields, all limits and result kinds. These are synthetic
codec contracts; control-only Realm/callback outcomes are not claimed reachable
through the new normal producer. Both-host unchanged control/inspection tests
remain required after implementation.

The unchanged classifier deliberately returns host-fault/protocol for normal
parse-only conformance with no parse-negative expectation. No synthetic parse-only
normal fixture is relabeled as a pass. Normal execute fixtures can classify pass
as data; they are **not admitted results**, transport receipts or ledger authority.

## Corrections and retained failures

1. The initial pure request validator accepted a strict label with `0;` source.
   `initial-candidate/script-producer-request.ts` and its manifest retain those
   bytes. `run-URuHAc/strict-transform-reduction.json` demonstrates initial
   acceptance and corrected `script-producer/strict-transform`, with no guest
   run. Final validation separates metadata-before-read from text-before-Realm.
2. `run-49nZq4` is the original run. Its **5,976 malformed count is invalid as
   structural evidence**: the harness supplied strings, and the decoder requires
   Buffer. Other checks completed, but none of that run's structural-negative
   claims is used for acceptance. The exact defective source is retained as
   `initial-candidate/probe-string-defect.mjs`.
3. First complete-wire authoring failed at `script-driver-result.mjs:146` with
   `Error: protocol` for the same string/Buffer mistake. No output file was
   published. `initial-candidate/complete-fixtures-string-defect.mjs` retains
   source; `retained-failures.json` retains the failure and fix. Corrected input
   is Buffer, not a relaxed decoder. `run-URuHAc` and `supplement-MWiH5C` are fresh
   corrected evidence; original run remains untouched.
4. First driver proposal used ordinary writeFileSync for new conformance output.
   `initial-candidate/script-observation-driver-overwrite.ts` and its manifest
   preserve it. Final new branch uses `wx`; old observation branch is unchanged.
   Exact host no-overwrite probe succeeds; future native support remains unproved.
5. Read-only discovery initially looked for three nonexistent filenames and the
   unavailable Windows Python alias. No source was modified by those failures.
   Inventory/actual paths and .NET archive reading resolved discovery; no guest,
   compiler, failed native build, or suppressed test result was involved.

All newly discovered substantive limitations are retained rather than hidden:
actual native lowering, actual future producer children, conformance control
preflight, stable certification, exclusive archive aliases/partial-write handling,
parent receipt owner and execution ledger/persistence remain unimplemented and
unproved. No private positive is called production admission. Prior 212 records
per lane/71 native gates and all old failure evidence remain intact.

Stop for coordinator actual audit and independent second review. No publication
or successor work. An accepted design is not a claim that implementation passed.

## Bounded review correction after f873278 (not yet accepted)

The original future negative-driver test could pass via ENOENT if validation
were skipped: it supplied nonexistent files for every malformed case. Retain
the original candidate commit and `correction/original/` (complete test, new-file
manifest and artifact manifest); all prior outputs are unchanged.

Only the proposed new test changes. It now consumes complete frozen
`correction/driver-negative-cases.json`: 52 ordinary existing-file controls,
four malformed-layout controls and one explicit missing-path compound per host.
Every ordinary source contains exactly `"use strict";\n0;`, including cases whose
variant itself is invalid. All supplied SOURCE paths in layout cases exist too.
The late-role compound alone declares the two MISSING paths absent. The test
asserts source bytes, declarations, exact argv mapping and result absence before
spawn. The three source proposals retain their original hashes.

Generic exit70/nochild cannot prove zero reads, zero Realm creation, or exact
precedence: producer validation may reject after IO. Pure parser errors and
source inspection are separate evidence. Malformed-layout cases can still fail
through IO if validation is omitted; this limitation is explicit. The retained
argv seeds' zero-read/Realm fields are requirements, never measured claims.

Reproduce the new bounded offline audit:

```text
node typescript/docs/validation/ts-035e3b-p/correction/probe.mjs
```

`correction/run-7ki2Nd` retains exact extracted helper bytes, all 114 concrete
setups/args/files, 416 successful mutation rejections (removed file retained by
rename, wrong argv path, unauthorized absence, removed strict-prefix fixture),
52 exact-helper omit-write mutant rejections and one removed-assertion mutation.
Its 51 original artifact identities pass. No producer/driver imported, no child
launched, no guest/native build or production seam. The new cases are future
requirements; lane labels on offline setup checks are not engine runs.

Original f873278 remains unaccepted until actual/second re-review and root
affected audit. Earlier measured decoder/parser results are retained, not rerun.
