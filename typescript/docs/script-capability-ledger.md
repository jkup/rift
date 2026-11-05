# TS-035E-P: capability authority and selection ledger

Design candidate against accepted `1e2f072`, 2026-11-05. This is not an
implementation or an admission certificate. Actual and independent second
review are required. Scope is this document, `validation/ts-035e-p/`, and the
TS-035E-P status. No publication, successor dispatch, or registry activation.

## Decision and first implementable slice

Split tentative E into E1 (empty authority and debt reconstruction), E2 (trusted
selection and ledger), and E3 (transport receipt integration). E1 is the only
implementation surface frozen for a possible next assignment. A reviewer must
accept it explicitly before implementation. E2/E3 remain design proposals.
Conformance launch and nonempty real runtime entries remain separate F work.

E1 owns exactly these new files, with no existing-file migration:

| File | Contract |
|---|---|
| `tools/test262/script-capabilities.mjs` | `readScriptCapabilities(): Promise<Readonly<EmptyRuntimeRegistry>>`; `reconstructScriptDebts(metadata, variant, manifestId): readonly Debt[]` |
| `tools/test262/script-capabilities.json` | Exact UTF-8 bytes `{"registryVersion":1,"kind":"script-runtime-capabilities","entries":[]}\n` |
| `tools/test262/script-capabilities.test.mjs` | Offline literal registry/debt tests, all frozen 60 variants; no engine launch |
| `docs/validation/ts-035e1/` | New evidence only |

`EmptyRuntimeRegistry` has exactly registryVersion:1,
kind:"script-runtime-capabilities", entries:[]; no optional keys. The reader
accepts **only the exact bytes above**, including one final LF: no BOM, CRLF,
alternate whitespace/property order/key escape, or trailing bytes. Equality to
that ASCII byte sequence already rejects malformed UTF-8, duplicate keys
(including escaped-equivalent keys), versions, extras and nonempty entries;
there is no shape-valid alternate JSON acceptance path or need to parse
untrusted JSON first. It returns a fresh object and fresh empty array each
call, both frozen. Equality does not grant a capability: entries is always [].

The only read target is `new URL('./script-capabilities.json', import.meta.url)`.
`readScriptCapabilities` accepts zero arguments; **any** supplied argument,
including explicit undefined/null, a path, registry, options or verifier,
rejects before file IO. It reads no environment variables and therefore an
environment variable purporting to override the path has no effect (it is not
a supported option and does not itself cause rejection). Read failures reject
with a native `Error` whose exact message is `script-capabilities/read`;
noncanonical bytes reject with `script-capabilities/registry-bytes`;
argument rejection is `script-capabilities/arguments`. No custom class,
reasonCode property, fallback, cache, or partial result. Because the API is
async these are promise rejections. A failure never returns an empty-success
registry. This is smaller than a general certificate loader.

### Exact metadata projection and failure contract (E1 correction)

The first argument of `reconstructScriptDebts` is **not** the full metadata
object returned by `metadata(source)`. It is exactly the five-field projection
`{flags,features,includes,locale,negative}`. All five keys are required; no other
own keys, including description, blockers, manifestId or symbols, are allowed.
Callers explicitly pick these fields from validated metadata and copy arrays
and the negative record. No defaults, coercion, YAML parsing or full-metadata
compatibility are performed here. `metadata(source)` remains the full source
YAML validator requiring description; it is not an object validator that E1
can reuse. E1 adds a private validator for this deliberately smaller contract.
Passing its projection validator never proves original source/manifest validity.

Inputs are ordinary non-Proxy data objects with Object.prototype, own data
properties (no accessors), and ordinary dense Array.prototype arrays. Frozen
data objects are accepted. Reject null-prototype/class instances, accessors,
sparse arrays, symbols and extra array properties. Proxies are outside the
trusted host-data API contract; no claim of avoiding Proxy traps. Do not read
accessor field values while checking a rejected ordinary object.

* flags/features/includes/locale are dense arrays of nonempty strings. Preserve
  order and duplicates; no trimming or deduplication. Features and locale strings
  are otherwise unrestricted, exactly as the normalized input contract permits.
* Allowed flags are onlyStrict, noStrict, raw, module, async, generated,
  CanBlockIsTrue, CanBlockIsFalse, non-deterministic. Reject any combination
  containing both members of: onlyStrict/noStrict, raw/onlyStrict, raw/module,
  module/noStrict, module/onlyStrict, raw/async, CanBlockIsTrue/CanBlockIsFalse.
  Do not add a new raw/noStrict prohibition absent from input.mjs.
* For each include, `harness/` + include must end in `.js`, contain no backslash,
  colon or NUL, and no empty, `.` or `..` path component. No filesystem read
  occurs here; actual pin/include verification remains planCorpus's duty.
* negative is null or an ordinary exact `{phase,type}` data object. phase is
  parse/runtime/resolution, type is a string with nonempty trim() result; retain
  its original string. resolution requires the module flag. No extra key.
* variant must be a string member of unchanged `input.mjs:variants(projection)`:
  module -> [module], else raw -> [raw], else onlyStrict -> [strict], else
  noStrict -> [non-strict], otherwise [non-strict,strict]. Module is accepted
  only as a blocked debt input, never as a v2 Script wire variant.
* manifestId is explicitly null for synthetic/non-manifest debt reconstruction,
  suppressing only the existing ID-specific legacy additions. Undefined,
  nonstring/non-null, empty and unknown strings reject. A known ID is exactly
  an entry ID in the pinned frozenManifest().entries; its five-field projection
  must deeply equal the input, including array order/duplicates and negative.
  Thus U-specific debts cannot be requested using unrelated metadata. This
  equality is still not proof of path/blob/source: the future planner must pass
  the verified file's own ID. Do not infer an ID by matching metadata.

The module obtains the known-ID table once at initialization using unchanged
`frozenManifest()` (its fixed manifest path and canonical pin check), copies only
IDs and five fields, and freezes the private table. Defaults for absent manifest
fields are [] for the four arrays and null for negative; these defaults apply
only while projecting the manifest, never to a caller argument. Import rejects
with `Error('script-capabilities/manifest')` if this load/verification fails.
No new export, caller-provided table or path override is introduced. This makes
the synchronous debt API possible without changing input.mjs.

`reconstructScriptDebts` requires exactly three arguments; it throws a native
Error, with no extra fields, in this precedence: argument count ->
`script-capabilities/arguments`; projection shape/types/flag/include/negative
checks -> `script-capabilities/metadata`; invalid or nonmember variant ->
`script-capabilities/variant`; malformed/unknown ID ->
`script-capabilities/manifest-id`; known-ID projection mismatch ->
`script-capabilities/manifest-metadata`. No partial result on failure. A missing
third argument differs from an explicitly supplied undefined ID: arguments
versus manifest-id. The function never mutates or freezes caller objects.

`Debt` is exactly `{id,status,reasonCode,authority}`; status is
unsupported-feature or unsupported-profile; authority is `runtime` or `never`.
E1 validates the exact projection contract above, calls unchanged
`input.mjs:blockers(projection,variant,manifestId)`, and maps every
ordered occurrence to `id="legacy:"+ordinal+":"+reasonCode`, without sorting,
deduplicating, or removing anything. Then append
`{id:"runtime:coverage",status:"unsupported-feature",reasonCode:"runtime-capabilities",authority:"runtime"}`.
The appended debt is mandatory even for parse negatives. Existing debt
precedence, hence actual 19/41 first-status counts, stays unchanged.
The exhaustive runtime reason allowlist is asi, RegExp, return-asi,
error-objects, strict-script-contract, directive-script, global-script,
harness-capabilities. Every other reason has authority never, including module,
module-profile, async, async-functions, unrecognized-feature, environment,
nondeterministic-policy, sloppy-script, and any future unknown reason. Compare
case-sensitively. No prefix or default-runtime rule. Do not filter unknown
reasons or deduplicate identical reasons: each keeps its status, reason and
distinct original ordinal ID. A frozen unknown-reason internal mapping witness
tests this policy without making production blockers injectable. An unchanged
blockers result is an internal precondition (its status/reason shape is already
fixed); new unsupported internal shapes require review, never capability grants.

Return a freshly allocated array of freshly allocated exact Debt objects,
deep-frozen before return, with no references to caller or prior-result objects.
Mutating the caller later cannot alter a result; attempted writes to result
array or records fail in strict-mode tests. All arrays, including an otherwise
empty legacy list, end with the mandatory runtime:coverage object exactly once.
E1 never discharges any debt. This mapping is eligibility policy, not proof of
support; no rule-authority arm can remove runtime debt.

The production caller of debt reconstruction must eventually obtain metadata
from verified bytes via `planCorpus`, not accept a claimed blocker array. E1's
pure function is useful for tests but confers no launch token. The registry
reader has no production consumer until a separately reviewed E2 assignment.
There is no native gate for this host-only slice and no full build required.

## Actual closure and constraints

The machine preservation manifest hashes 5,227 existing tracked TypeScript
files, excluding only TASKS/COORDINATION. `callsites.txt` records production and
test references. No old-test proposal is necessary: all existing files are
identity proposals with unchanged whole-file SHA-256. `audit.mjs` verifies the
whole files, not selected assertion lines. New closure inventory in this
directory records exports and imports from all source/host modules. C++ is
outside this work and the final Git diff must contain only the owned paths.

| Actual surface | Consequence for E |
|---|---|
| `input.mjs:planCorpus`, `frozenManifest`, `metadata`, `compareMetadata`, `variants`, `transform`, `harnessPaths`, `blockers` | Verify pinned revision/blob/UTF-8/YAML/manifest and every include first. Strict transformation is the exact prefix. Includes preserve repeated occurrences. An include failure after metadata retains both variants. E must call this path and recompute debts rather than trust edited selection.blockers. |
| `plan.mjs:prepareSelection`, `preflightRecords`, `main` | v1 only, null build/capability identity, blocked contexts, full selection persisted first; untouched. Its four-file adapter hash cannot describe a future v2 adapter. |
| `ledger.mjs:newLedger`, `appendAttempt`, `report`, `persist` | v1 validator and context equality; metadata/ordered harness/planned identity bound. Retry keeps first headline and denominator. Persistence flushes a fresh temporary file then renames. These are reference semantics, not v2 APIs. |
| `script-driver-result.mjs:parseScriptDriverResult(bytes,binding)` | Independent closed child v2 validation; no classification, admission or host fact authentication. |
| `script-result.mjs:validateScriptRecord`, `parseScriptEnvelope`, `assertScriptContext`, `inspectScriptEnvelope` | Already has private `classification(v)`; no exported classify/compose API. Context equality alone does not establish who minted the context. Transport facts must be parent-owned. No changes authorized by E1. |
| `script-observe.mjs:prepareScriptObservation`, `validateScriptLaunch`, `launchScriptObservation` | Observation-only WeakMap plans, immutable snapshots, one-use launch, rehash source/build/adapter, fresh artifacts and archived parent facts. Mode and capabilityLedgerSha256 cannot be switched to conformance by E. Private `closure`, `bind`, `contextFor`, `compose` are not reusable public authority APIs. |
| `src/script-observation.ts:observeScripts`, `observeScriptControl` | Ordered harness execution and test action; prepareBoundedScript then operation/source projection. Ordinary preparation and legacy return fallback are not runtime capability evidence. |
| `script-throw-inspection.ts`, `script-execution-internal.ts` | B preserves original throw/history and active/defining Realm semantics, including synthetic source anchor. None exposes a certificate. |
| `script-record.ts`, `script-execution.ts` | Opaque preparation/evaluation/session facade; no externally supplied AST or admission token. |
| `parser.ts`, `script-declarations.ts` D1–D8 | Full-source bounded audits and rejection-only dispatch. Original failures/nodes survive ineligible/blocked audits; global mixed/grammar/resource vetoes remain. C propagates five closed rules. No planner calls an audit to authorize runtime. |
| `script-observation-types.ts`, `script-observation-json.ts` | Closed ChildV2/ScriptResult and actual serializer; E does not change either. |
| `result.mjs`, `driver-result.mjs`, `observe.mjs` | Independent v1 records, classifier, launcher and historical byte contract; no fallback or normalization to v2. |
| `package.json`, lockfile, tsconfig, `tools/build-native.mjs`, `tools/run-guests.mjs`, manifest and test registration | E1 has no required edits. 212 existing records and 71 static gates remain intact. |

C's source digest covers all src .ts files, Script observation control fixtures,
harness bundle, package/lock/tsconfig, build-native/probe verdict. Adapter digest
covers its four modules, Node executable and YAML package tree. Built digest
covers all Node source JS plus control and executable, or native driver/control.
Future E closure must additionally include capabilities, selection, ledger,
certificate policy, reporting, and their validators. Merely reusing C's digest
would omit E authority. Do not invent an engineCommit from dirty sources: bind
both commit and complete current source closure, plus actual built artifacts.

## Separate authorities and exact binding

Source-rule authority is an immutable reviewed description of the five exact
accepted production rules: return-outside-function, duplicate-block-lexical-function,
duplicate-strict-parameter, assignment-target, lexical-declaration-statement.
It describes the emitter implementation, scope and validation closure; it is
not a per-test runtime grant. Only actual source-produced syntax-error records
can match a parse negative. Registry membership cannot manufacture that result.
Do not add a rule registry loader in E1 or reinterpret the decoder allowlist as
an admission table. D1/D3/D5/D7 audits and D2/D4/D6/D8 dispatch are complementary
evidence, not eight independently admitted capabilities. H7 preflight is a
separate harness control authority, never a runtime registry entry.

A future runtime certificate must name a reviewed required-behavior list and
both-host literal evidence, not an expected pass. Its exact key includes:

* pinned corpus revision, manifest hash, path, blob SHA-1, original SHA-256 and
  byte length, transformed SHA-256 and UTF-16 length, exact variant and goal;
* lane, engine commit, source closure, built artifact closure, adapter closure,
  policy hash, profile ID, Node/native host identity, platform and toolchain;
* every ordered Unit field (sequential uN ID, ordinal, role, path, blob, source
  and transformed hashes, lengths), including duplicate harness paths;
* all seven limits: sourceUnits, parseDepth, steps, calls, evaluationDepth,
  wallMs, outputBytes; exact ordered host-services descriptors, initially [];
* exact source-rule authority digest and harness control authority digest.

Run ID, nonce, request hash and successful preflight ID are attempt-specific,
not reusable certificate keys. The planner derives a new attempt binding from
the exact certified stable key and trusted fresh preflight; append also binds
those attempt-specific identities. Certificate key mismatch is a pre-launch
rejection, including cross-host reuse; no subset or greater-limit matching.
Hash strings in an envelope are evidence identities, not signatures. Trusted
loading must pin reviewed authority bytes in the adapter and recheck all
referenced files. Caller-supplied matching hashes cannot authorize anything.

The planner must reconstruct every debt from verified source metadata and
policy, then remove only debt IDs named by a matching reviewed certificate.
Unknown, duplicate, stale or missing evidence rejects; an unmatched debt stays.
An entry discharging just profile debt leaves runtime/harness/error debts.
No wildcard, inferred Symbol support, parser-success shortcut, passing
observation, or negative-metadata shortcut. Raw is not automatically strict;
non-strict is not raw even when bytes are identical. Modules and async remain
non-admissible. Profile transitions require separate review.

## E2/E3 proposal and substantive review boundary

Actual v2 `identityShape` permits goal Script and variant strict/non-strict/raw;
negative metadata permits only parse/runtime. The actual corpus includes a
module slot. A single v2 envelope for every selected variant is therefore
impossible without either losing denominator or widening A. Neither is allowed.
Proposed resolution: selectionVersion:2 is an outer ledger format, not the wire
schema. Keep a Module slot with a parent-owned blocked policy terminal and no
wire record/binding. Its status contributes to the same full denominator. Never
cast Module as Script or insert a v1 envelope into a v2 ledger. This design
choice requires explicit actual and second review; E1 avoids depending on it.

Proposed E2 new files are `script-plan.mjs`, `script-ledger.mjs` and corresponding
new tests only. Their final edit permission and exact persistent schema are
**not** granted here. Proposed API boundaries:

* `prepareScriptSelection({root,revision,lane,paths})` retrieves/validates bytes
  itself, reads only fixed empty authority, recomputes debts and snapshots full
  selection. No caller selection, blocker list, build identity or grant argument.
  Return an opaque WeakMap-associated token plus detached read-only inspection.
* `newScriptLedger(selectionToken)` snapshots all slots before any attempt.
  Duplicate slot IDs, mixed lanes or unsupported selection versions reject.
* `appendScriptAttempt(ledgerToken,slotId,receiptToken,retryReason=null)` consumes
  a trusted one-use parent receipt, never arbitrary record/context JSON. It checks
  complete selected identity, metadata, debts, exact binding and parent facts.
* `reportScriptLedger(ledgerToken)` reports all eight statuses, first outcomes,
  explicit retries, unfinished entries, file totals, full denominator and exit.
* `persistScriptLedger(path,ledgerToken)` writes an atomic detached snapshot.
  Resume/import requires a separate validating API; JSON roundtrip does not mint
  WeakMap authority. Unknown/mixed versions and tampered history reject.

E3 would need a parent receipt bridge and conformance composition. Today C
returns observation mode only, so there is no genuine conformance receipt.
E1/E2 may create only blocked terminals; synthetic admitted controls use a
private test authority that is absent from production exports. No hidden CLI
flag or injectable verifier. A later bridge must authenticate inspectScriptEnvelope
results against saved parent facts; a fault summary is not a terminal envelope.
Classification construction must be designed alongside that bridge rather than
copying private classifier logic into plan/ledger. An export or refactor of
script-result.mjs requires exact future proposals and whole-file old-test closure.

Append must validate the ledger itself, not trust mutable serialized attempts.
It rejects replayed receipts across slots/runs, duplicate ordinal attempts,
reordered attempts, gaps, changed first attempts, an unreasoned retry or a reason
on the first attempt. Per-slot attempt numbers are 1..N in append order; one
receipt is spent once only after successful append. A rejected append leaves
bytes/state and receipt unchanged. A cancelled launch produces no terminal and
leaves its slot unfinished, never pass or skip. Recovery retains the previous
persisted snapshot and all attempts; overwriting a run directory is forbidden.

Report retains v1's useful semantics: completed counts first terminal per slot;
retry outcomes never replace first status or add denominator entries. Include
selectedFiles, plannedVariants, executedVariants, unplannedInputErrors, completed,
missing, attempts, all status counts, passedFiles, per-file statuses,
excludedFixtures, complete, passOverPlanned, conditionalPass and exitCode.
Unplanned metadata failures retain selectedFiles and make complete=false;
include failures after metadata retain every variant. A Module blocked terminal
has executed=false. A parsed test-stage result is not proof of body entry;
retain testBodyEvaluated separately. No combined Node/native percentage.
Full pass ratio exists only when complete; conditional pass is explicitly
pass/(pass+fail), never a substitute denominator. Exit 2 unfinished/input failure,
1 complete with any nonpass, 0 complete all pass. Empty selection is rejected.

## Current classifier, not a proposed replacement

The 154 frozen A literals were replayed through both actual decoder entry paths
and context validation; full records are in decoder-literals.json and exact
classifications in actual-classifier.json. No guest execution was needed.
Current priority is deadline, crash (except output termination), host fault,
resource, unsupported syntax/operation/profile, not-run, foreign/unregistered
constructor, process protocol, harness, incomplete/blockers protocol, then
positive/negative matching. This matters: resource and unsupported outcomes can
structurally validate even when classification.blockers is nonempty. The ledger
must independently reject **any executed result** for a blocked slot, rather
than rely on decoder classification to enforce admission.

Normal positive => pass/normal; wrong or absent negative => fail; name matching
uses available constructor data, not diagnostics. Instantiation throw can match
runtime negative without test body entry. A later admitted mismatch remains
fail; it is never retroactively removed from the denominator. Explicit engine
unsupported/resource/timeout/host faults retain those statuses. Do not rewrite
them to fail merely to improve a pass/fail denominator. Constructor abrupt
matches neither original name nor diagnostic. Harness failure cannot pass a
test negative. Parse-only test inspection remains forbidden; parse-only harness
runtime inspection remains allowed by C's amendment.

## Literal evidence and required next tests

E1 correction after review of candidate `9562032`: `e1-literals.json` freezes
130 full debt-call input/output or error cases, including all 60 corpus arrays
with all four Debt fields, final runtime:coverage, duplicate reasons and ordinal
IDs. The file is checked in; replay never rewrites it. `e1-controls.mjs` compares
the frozen arrays to unchanged actual blockers plus the exact E1 mapping, and
checks malformed projection/variant/ID cases against literal errors. Additional
in-code non-JSON controls cover accessor rejection without invocation, symbols,
null prototypes, sparse arrays, explicit undefined, frozen caller data and
argument-priority rejection. Unknown repeated future reasons have two distinct
never-authority records plus runtime:coverage, frozen literally in the control
and results. Fresh frozen arrays/records and later caller mutations are checked.

The same literal file freezes 33 registry-byte/argument/read-failure cases with
base64 exact bytes. Only canonical LF-terminated bytes succeed; shape-valid
alternate formatting/order/escapes, BOM/CRLF, trailing/duplicate records,
escaped-equivalent duplicates, invalid UTF-8, malformed keys/types/version,
nonempty entries and overrides reject. Read errors and argument precedence have
separate exact error expectations. Registry output and its entries array are
fresh and frozen each call. The reader evidence is an IO model confined to the
evidence directory, not a public injectable production loader. The environment
witness records the no-lookup contract, not a newly executed production reader.
The original design and README are retained in initial-candidate/; original
audit/model/literal evidence remains unchanged. These E1 cases supplement, not
replace, the initial candidate's E2 proposal controls below.

`admission-literals.json` has 38 full synthetic input/expected rows: empty,
exact private authority, every current synthetic key field mutation, each of
seven limits, forged/missing/stale/duplicate authority, partial debt removal,
and ordered repeated harness substitution. The model is a deliberately small
equality oracle, not a registry implementation, proof of authentication, or
exhaustive validator. Its synthetic key is a subset of the full production key
above; E2 must freeze all additional fields before implementation.

`ledger-literals.json` freezes 13 full oracle cases. Nine planned slots have
first statuses pass/fail/unsupported-feature/unsupported-profile/harness-error/
resource-limit/timeout/host-fault plus one pending Module. Partial totals are
9 planned, 8 completed, 1 missing, 8 attempts; each status count 1; full ratio
null, conditional 1/2, exit 2. A fail->pass retry with a reason gives 9 attempts
and unchanged headlines. The module policy terminal gives 9 completed, 0
missing, 10 attempts, unsupported-feature=2, every other count=1, full ratio
1/9, conditional 1/2, exit 1. Replay/unknown slot/missing reason/blank reason/
reason-on-first all reject atomically. These are future ledger expectations,
not tests of an existing v2 append API.

Actual 33-file manifest reconstruction yields 60 slots, all blocked, first
counts 19 unsupported-feature/41 unsupported-profile, zero execution/pass/fail.
That is metadata/policy replay, not fresh byte retrieval. Existing accepted D8
evidence remains the upstream/both-host evidence. E1's appended runtime debt
does not change those first-status totals. Final E2 real ledger must retain
33 files/60 slots per lane, completed60/missing0/attempts60, passedFiles0,
passOverPlanned0/60, conditionalPass null, exit1, including the module slot.

| Prior controls | E-specific obligation |
|---|---|
| T01/T02 | Preserve exact A serializer bytes; both decoders still reject v1/v3, duplicates (including escapes), malformed UTF-8, oversized/truncated/concatenated records and nested extra/missing keys. Existing snapshots are identity proposals. |
| T03/B01 | All identities and seven limits, exact transformed text/locations, source count/order/uN roles/Realm and request hash; add registry/host-services/build/source-closure mutation before admission. Parent context must be saved, never reconstructed from the received record. |
| T04 | Future trusted receipt -> append -> persist -> validated reopen -> report must preserve every field and status. Executed blocked results reject even where the actual classifier returns unsupported/resource. No v1 append accepts v2 or reverse. |
| U01/U02 | runtime.map-species stays unsupported-feature/runtime.map-species with runtime phase and no constructor. Secondary inspection provenance survives; remove original/forge site/test parse-only inspection rejects. No runtime capability inferred. |
| R01 | Registered foreign Script Realm name may match; foreign-profile/unregistered are unsupported. Unknown available Realm or legacy registered profile rejects. No H7 identity weakening. |
| D01 | Diagnostic text preserved on allowed nonnormal arms only, never affects matching; malformed/null/empty/misplaced diagnostic rejects. |
| D1–D8 | Five closed codes only; exact source audit/dispatch evidence stays separate. Unknown/stale rule authority cannot clear runtime or harness debt; late grammar/resource/mixed veto still precludes certification. |

Before E2 is ready, freeze complete persistent selection/receipt/ledger schemas,
full additional key mutations, both directions of version rejection, tampered
serialized histories (reorder/gap/duplicate), all status append/report paths,
both-host actual transported bytes, partial metadata/include failures, and
exact file-level report fields. Neither this small oracle nor parity alone
satisfies those future gates. Retain new ambiguity and request review instead
of widening codec, production ownership or authority to force completion.

## Reproduction and limits

From typescript: `node docs/validation/ts-035e-p/audit.mjs` and
`node docs/validation/ts-035e-p/model.mjs`, plus
`node docs/validation/ts-035e-p/e1-controls.mjs`. First command checks every preserved
whole file, 154 actual decoder literals, 1,232 context/classification negatives,
manifest debt totals and retained 212-per-lane/71-gate evidence. Second checks
38 admission and 13 ledger design cases. Third checks 130 debt cases, 33 reader
cases and non-JSON/freeze/detachment controls. No full builds, native reruns,
external retrieval, production/old-test/history edits or capability grants.
Initial probe failure and correction are retained in initial-failure.txt.
