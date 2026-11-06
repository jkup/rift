# Request boundary revision — design candidate, not implementation permission

The unshipped E3b contract requires two dynamic operations with pinned scriptc.
The separately reviewed decimal guard resolves one; arbitrary own-key discovery
remains unresolved. This candidate explicitly revises the new host API rather
than omitting object checks on the native path. All production files still match
the original accepted four-file proposal. No native build or guest/child execution
was performed for this design.

## Alternatives and recommendation

| Alternative | Contract and consequence | Recommendation |
|---|---|---|
| Preserve arbitrary request-object validator and producer | Keep own-enumerable-string-key behavior, all old shape errors, one-argument producer, and public request types. Current Object.keys and tested equivalents require dynamic operations. Needs a separately resolved compiler capability; current pinned route cannot be accepted from this evidence. | Valid contract if the owner chooses to wait; not currently implementable under the zero-dynamic gate. |
| Add a host-only object adapter plus a separate native positional path | Adapter retains Object.keys semantics and must be clearly unavailable as a native contract. Creates two APIs, extra closure/fixtures, and an adapter no current caller needs. Never permit native to silently skip checks under the old API name/signature. | Not proposed. No adapter or adapter source is authorized. |
| Private request construction with public positional string controls | Co-locate parser/types and producer in the existing observation module. Remove new public request-object APIs/module; driver validates argv before IO, producer independently reconstructs a private record after IO. Same OS argv and child semantics; explicit breaking change to the unshipped host API. | Recommended smallest caller-supported change. |

This is an explicit scope/contract decision for root and independent review.
It is not a source workaround under the old request-object guarantee. The data
producer remains a public execution utility, not an admission/receipt API.

## Exact files and API surface

`proposal-manifest.json` freezes complete bytes and before/after SHA256 for:

1. Replacement `src/script-observation.ts`: private parser/types and source loader
   validation; old observation exports untouched; revised public positional APIs.
2. Replacement `src/script-observation-driver.ts`: validate positional controls,
   read every source, invoke the producer with argv and text vectors, exclusive
   result write. Old decimal/identifier helpers and observation tail byte-identical.
3. Replacement of the **new/unshipped** `tools/test262/script-producer.test.mjs`:
   retain all 66 full child literals, 114 checked-source negatives and eight late
   failures; migrate only the withdrawn object/parser imports and calls; add
   explicit new API surface/record rejection and eight future OS spoof controls.
4. Withdraw/remove the **new/unshipped** `src/script-producer-request.ts` entirely.
   No empty compatibility module, stale re-export, or host object adapter remains.

No pre-existing test file is amended. The original accepted proposals and test,
original native failures, old fixture literals, compiler/package/build scripts,
decoders, parent launcher, ledger, selection and semantic implementation stay
unchanged. The previous design document and verifier remain immutable historical
contracts; this candidate's verifier has its own explicit proposed-application mode.

Public runtime exports from `script-observation.ts` would be exactly:

| Export | Formal arity | Contract |
|---|---:|---|
| `observeScripts(request: ScriptObservationRequest): ChildV2` | 1 | Existing observation API, unchanged. |
| `observeScriptControl(request: ScriptObservationRequest, control: string, input: string): { child: ChildV2; report: ScriptControlReport }` | 3 | Existing control API, unchanged. |
| `validateConformanceScriptArguments(args: string[]): void` | 1 | Validate positional controls; no returned request, IO, Realm or token. |
| `produceConformanceScripts(args: string[], sourceTexts: string[]): ChildV2` | 2 | Revalidate controls, validate text vector, build a private request and fresh Attempt; return forgeable ChildV2 data only. |

Only existing exported types `ObservationUnit`, `ScriptObservationRequest` and
`ScriptControlReport` remain. `ProducerLimits`, `ProducerUnit`,
`ScriptProducerRequest`, `parseProducerArguments`, and `prepareProducerRequest`
are lexical and unexported. `ScriptProducerArguments` is removed. Public
`parseScriptProducerArguments` and `validateScriptProducerRequest` are removed.
`produceConformanceScripts(request)` is replaced, not retained as an overload.

There is no new function taking a record, callback, Realm, AST, constructor map,
session, inspection result, preflight verifier or authority handle. Calling the
old producer form with a record rejects `script-producer/arguments` before record
fields are inspected. The public validator returns void; it cannot furnish a
request to feed into the producer. Both APIs independently invoke private parsing.
No record escapes into a public API output; ChildV2 is the existing wire data.

## Positional contract and unchanged OS behavior

The exact 14-header-plus-triples argv layout is unchanged. Mode/variant/action,
nonce/hash/preflight/result-path, all seven decimal controls, all occurrence IDs,
roles and nonempty source paths retain their original error ordering. Decimal
has only the approved inline empty-string guard change. Leading zeroes remain
unbounded; safe integers and fixed source/parse/evaluation limits are unchanged.
Wrong fixed numeric limits follow triple validation; invalid decimal syntax
precedes it. Wall/output remain parent-enforced controls, not new child guards.

Driver order remains: validate all controls; read all source paths in order;
producer repeats control validation; validate every source string and strict
prefix; construct fresh Attempt; execute/inspect/serialize unchanged; `wx` write.
No eager parsing/evaluation or harness execution before later file reads is added.
Strict source still requires exact `"use strict";\n`; raw/non-strict bytes remain
unchanged. Source-priority, harness ordering, parse-only behavior and full ChildV2
are unchanged requirements, not established native execution results here.

The private parser creates exactly the previous typed record fields and limits
from validated positions. It creates one fresh unit record per triple. It does
not need to discover unknown object fields because no caller supplies that record.
The driver reads paths directly from validated argv slots. Re-parsing inside the
producer avoids exporting or trusting a mutable request object between modules.

The new array boundary is explicit:

- `args` must satisfy Array.isArray and every indexed value must be a string;
  otherwise `script-producer/arguments`, before the existing argc/header checks.
- `sourceTexts` must be an array of exactly the private unit count, with a string
  at every indexed position; otherwise `script-producer/source-texts`. Controls
  are validated first; source-vector validation precedes strict-prefix validation.
- Extra own properties, symbols and nonenumerable properties on arrays are ignored.
  Indexed access may read inherited string values. There is **no own-index or
  own-enumerable-key guarantee for arrays**. Holes without inherited strings fail.
  The OS driver constructs ordinary arrays from process.argv and file reads.
- Array-prototype impostors remain non-arrays and reject. A real array decorated
  with request fields only supplies its validated indexed strings; those fields
  cannot replace controls or a private request. This is not a hostile Proxy/getter
  API, consistent with the prior ordinary-host-data trust boundary.

These are revised input semantics, not preservation of the old object API under
a different implementation. No overload promises record validation or silently
accepts the former object form in either host.

## Explicit mapping of old guarantees and tests

`probe-mtFaNl/results.json` records every one of the 21 old missing/extra-field
shape literals, its old error, and its new rejection as a non-array argument.
Those records can no longer enter the producer as request records. `fields`,
`limit-fields` and `unit-fields` errors are withdrawn with that object API, not
advertised as checks still performed. Private records/limits/units are created
with fixed own fields by source construction. Wrong record primitive values and
inherited/nonenumerable record keys likewise have no accepted record-input path.

Semantic values still have external positional tests: existing 57 exact parser
errors, 20 parser positives, all seven limits, fixed/wall constraints, role/order,
raw/preflight requirements, and strict text. The private offline extraction checks
all 20 complete constructed records and 46 conformance wire-fixture requests,
including original ordered texts. That extraction exposes private helpers only
in its isolated test module, never in a proposed production module.

The proposed implementation test retains the original checked-source negative
setup helper verbatim. It adds Node module-export/arity assertions; six record,
array-spoof and sparse-argument negatives; six source-vector negatives; one strict
prefix negative; and decorated-array acceptance for validation. Four full frozen
JSON-record-as-positional-control rows add four exact pure errors and eight future
both-host driver invocations, all with checked existing harmless source files.
These are in `positional-record-spoofs.json`. No request JSON parser is introduced.

Generic exit70/no child still cannot prove zero reads, zero Realm creation or
exact native error priority. The old 66/114/8 fixtures and new eight driver spoofs
are **unexecuted future requirements** in this design, not passing native evidence.

## Caller, export and native-entry audit

`audit-kOePqF/audit.json` inventories 171 actual TS/MJS source/test/tool files with
whole-file hashes. References to the current new producer/request APIs occur only
in four files: observer, driver, the withdrawn request module, and new producer
test. No other live caller requires an object adapter. Existing observation/control
callers use untouched APIs. Historical consumers are preservation evidence; none
is rewritten to accept the new proposal.

The audit freezes all 71 unchanged native build entrypoints. The external native
entry is the existing executable's string argv path; no request-object IPC, JSON
request decoder, FFI interface or native object ingress is added. Internal TS
exports are not receipt authority. Direct Node import callers must use the new
arrays and cannot call an exported request parser/validator or inject a record.
No claim is made about maliciously recompiling source or unchecked caller casts.

The byte audit verifies the complete old observation prefix (through both existing
public functions), original driver helpers and original observation tail. Only the
new conformance branch/API region changes relative to the accepted E3b proposal.
All existing evaluation, throw inspection, Realm identity and observation semantics
remain under their existing tests and later required both-host regression runs.

## Measured evidence and remaining acceptance

- Corrected offline probe: 20 full private request positives, 57 exact argv errors,
  21 explicit old-shape mappings, 13 spoof/source/prefix controls, 46 full request
  records from wire fixtures, eight late metadata cases including both exact strict
  failures. No IO or execution in this pure extraction.
- Eight offline checked-source setups for the new OS spoof literals pass, along
  with their exact pure parser errors. No child is launched.
- Isolated copied-source no-emit typecheck passes. Targeted full-driver coverage
  reports 4,443/4,443 static and zero dynamic (`source-check.json`). This is **not**
  a static-only native build or a native behavior result. New array guards and
  revised integration still require actual native validation after approval.
- No full 71-entry build, engine execution, registry activation or receipt work.

After root and second review approve a concrete revised contract, implementation
must apply exact complete proposals and use the new preservation mode. All original
required fresh native71/zero-dynamic, 212 records per host, producer66/114/8 plus
new API/spoof controls, A/C/E3a/D/B/H7/host73/observation22/runner20/probes10 checks
remain required. No denominator, gate, pin, old test or authority relaxation follows
from this design. Current public policy remains the previously measured empty
registry/all 60 blocked; no new admission grant exists.

## Retained authoring corrections

The first offline probe used a wrong scenario spelling for the two strict late
rows. Its source and `probe-LJiriL` output remain; `probe-mtFaNl` corrects the name
and asserts exactly two late strict failures. The first probe had already checked
the separate strict invalid-source control but did not test these two late rows.
The first driver draft normalized line endings outside the conformance branch;
`initial/` preserves it and its manifest. The final driver restores untouched
helpers/observation bytes exactly. Two authoring/audit script extra-parenthesis
syntax errors are retained as `initial-preserve-driver-syntax.mjs` and
`initial-audit-syntax.mjs`; neither executed writes. No production correction or
historical evidence rewrite occurred.

All launched commands are complete. Stop for actual and independent review before
applying this contract revision or starting implementation validation.
