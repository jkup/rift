# TS-035E3c-P design evidence

Base `1feb9e95278c34927278ae5be5960cb0a52a57db`; accepted E3b `b6f9896`.
Read [the design](../../script-execution-selection.md). The candidate deliberately
freezes only two new host input-snapshot files. Complete execution selection v3,
source/build/toolchain certification, host-services/preflight descriptors, archive
and parent receipt authority remain unresolved separate designs. No production
file or old test was changed; no grant, guest launch, full suite or build occurred.

## Reproduce and review

From `typescript`:

```powershell
node docs/validation/ts-035e3c-p/verify.mjs
node docs/validation/ts-035e3c-p/probe.mjs
node docs/validation/ts-035e3c-p/context-probe.mjs
```

The last two create fresh exclusive output directories; they never overwrite
old evidence. They require the existing local pinned export
`C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075`. The alias tests
need filesystem access for hardlinks/junctions; the first sandboxed run retained
EPERM. Missing corpus or denied alias setup is a failing probe, never a skip.
The scripts launch only bounded Node host tests, not guest execution, preflight,
producer, launcher, native compiler or a full test suite. `verify.mjs` is read-only.
The archive/audit/dependencies/requirements/freeze scripts are one-shot authoring
tools with exclusive outputs; do not overwrite their frozen evidence to rerun.

`proposal-manifest.json` freezes exact complete additions:

- `tools/test262/script-execution-inputs.mjs`: three exports, descriptor checks,
  original E2 anchor, explicit seven limits, exact source/transform snapshots,
  input/policy rechecks, detached inspection, no execution binding or authority.
- `tools/test262/script-execution-inputs.test.mjs`: complete future host test;
  both lanes, original full report-literal comparisons, copy-before-await,
  detachment/foreign-token/error precedence, limits, stale inputs and aliases.

There are zero existing replacements or old-test migrations. The separate
preservation manifest is the complete unchanged-file identity contract, including
old test bytes, C++, compiler/pins and historical failures. The verifier permits
only the exact two additions when later run with `--implemented`; this option
does not authorize their installation.

## Evidence and limits

| Evidence | Result |
|---|---|
| `run-10mCaM` | Final exact proposed module and test, with import paths rewritten only to actual E2 dependencies and the isolated proposal. Process exit0. 94 exact rejection/unchanged-snapshot controls; actual full initial/final policy reports match retained complete literals in both lanes. |
| `run-10mCaM/results/actual.json.gz` | Six complete records: both real lanes plus wrong-revision and missing-root denominator witnesses per lane. Full original anchors, stable data, original/transformed bytes, limits, history and reports. Each successful corpus lane is 60blocked/19feature/41profile/executed0/body0. |
| `run-10mCaM/results/errors.json.gz` | Full before/after snapshots for identity, detachment and recheck rejects; exact error strings, including both-lane hardlinks and stale inputs. Repeated full snapshots are intentionally retained losslessly. |
| `run-10mCaM/results/input-faults.json.gz` | Both-lane include failure retains original planned variants/debts and complete report. Capture marks unavailable input; no denominator deletion. Repairing that input makes the old snapshot stale. |
| `context-Loyegv/results.json.gz` | Ten full rows: both lanes stale E2 closure; simultaneous authority/closure failure; policy-before-missing-root; root junction; and the explicit unclosed-helper reduction. Changing the helper's isolated disk bytes does not trip E2: input-current is not execution-current. |
| `requirements-results.json`, `retained-report-literals.json` | 13 complete retained reports independently recalculated, including synthetic admitted/all-status/retry/cancel/unknown-metadata cases; six direct metadata/include-order controls and three exact BOM/Unicode/raw/non-strict/strict transformations. Synthetic positives are arithmetic/input requirements, not production admission. |
| `closure-audit.json` | All 170 tracked source/test/tool TS/MJS/CJS files with hashes/imports/exports/references; 515 historical consumer scripts with hashes/references. |
| `consumer-addendum.json` | All 373 other tracked JS/PowerShell/Python/shell files, including zero-reference rows; one matching historical producer capture script. |
| `native-entrypoints.json` | All 71 native entries retained, no builds run. |
| `dependency-members.json` | Actual read-only C closure members: 66 source, 237 adapter excluding separately listed Node, 53 Node built excluding Node, two native files; 656 compiler/YAML package members. Existing binaries are inventory, not fresh build or source-provenance proof. |
| `preservation.json` | 7,480 original tracked files, excluding only TASKS/COORDINATION; whole-byte preservation, not a new historical baseline. |

Complete JSON artifacts use gzip to avoid hundreds of megabytes of repeated
snapshots in Git. `compressed-evidence.json` binds the earlier raw byte lengths/
SHA256 to their lossless gzip bytes; raw authoring copies remain local and ignored.
The final run wrote gzip directly. `artifact-manifest.json` covers all retained
candidate evidence, including failure runs and all compressed literals. No raw
transport history was recompressed or changed; these are new host design outputs.

## Retained failure and design corrections

`run-daH3CG/process.json` records EPERM at the first isolated hardlink creation.
Its exact original proposal/test and import rewrite are retained; it is not a
passing alias result. `run-UMAWQO` subsequently passed with filesystem access;
the final `run-10mCaM` additionally compares full initial/final reports against
retained literals and emits lossless gzip directly.

The initial draft allowed JavaScript negative zero as a nonnegative limit, while
JSON.stringify canonicalizes it to zero. Before the passing probe, the proposal
was tightened to reject negative zero with `script-execution-inputs/limits` and
an explicit control was added. Original draft bytes remain in `run-daH3CG`.
This is a new input-API design choice, not a change to E3b's positional decimal
contract. No compiler workaround, old-test edit or pin change was made.

The main scope reduction is substantive: E2 and C lack a complete execution
closure and conformance host-services/preflight schema. The source audit and
unclosed-helper reduction demonstrate that deficiency. This candidate retains it
explicitly instead of freezing a deceptively complete v3 schema. Root actual
review and independent second review must decide whether to accept this first
input slice; complete execution-selection remains unimplemented/unfrozen.

All initiated sessions have finished. Stop at the design commit: no publication,
production installation, F entry, receipt owner or successor work by this writer.
