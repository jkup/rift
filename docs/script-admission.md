# TS-035P: Script admission and transport checkpoint

Design candidate at `297f8e29cb9aa8d865e832291a9c8bf7df5cc06c`, 2026-11-04.
Requires actual and second independent review. Nothing below is implemented or
certified by this checkpoint. First implementable slice is **A: closed v2 data
contract and both decoders**, with synthetic records only. Each later slice
requires a new assignment; this document grants no successor ownership.

The accepted H7 bundle proves its literal controls, not corpus admission. Keep
all 60 variants per lane blocked, the 33-file selection, legacy CLI/profile,
observation v1, manifest, historical evidence and compiler pins unchanged.
Evidence and reproducible offline preservation audit: [TS-035P](validation/ts-035p/README.md).

## Actual interface closure

Paths in this document are relative to ``. `tools/test262/` is ignored
by ordinary ripgrep traversal; use `rg --no-ignore` when auditing it. The retained
caller listing includes tests as well as production consumers.

| Current producer/interface | Current consumers and exact consequence |
|---|---|
| `src/observation.ts`: `observe`, `projectThrow`, `ObservationResult` | `observation-driver.ts`, `observation-json.ts`, structured-outcomes, return-audit, observation-serialization, script-realm-bootstrap and harness-errors-b tests. Projection deliberately performs **zero guest property reads**; preserve this contract. |
| `src/observation-driver.ts` seven positional arguments | `tools/test262/observe.mjs:launchObservation`; build-native observation gate and observation.integration. Only parser/body observation, default legacy Realm. Do not append a mode or overload these arguments. |
| `observationJSONRecord` | Child `driverVersion:1`, nonce, mode, unit, stage, bodyEvaluated, location, observation. ASCII UTF-16 encoding is reusable; the v1 record shape is not. |
| `tools/test262/driver-result.mjs:parseDriverResult` | `composeObservation`, driver-result tests. Closed v1 child decoder accepts only test/driver, return certification, primitive absent/object unsupported constructor. `consistentOperation` ties runtime work to bodyEvaluated. |
| `result.mjs:parseEnvelope`, `inspectEnvelope`, `validateRecord`, `validateContext`, `assertContext`, `terminalRecord`, `classify` | driver-result composition; plan, ledger, observe; fixtures, result/boundary/ledger/driver tests. Closed outer schemaVersion 1 accepts more constructor outcomes and five reserved rules than child v1 can emit. This is **not** implementation evidence. `complete` requires evidence.unit=identity.path; `validateCore` forbids bodyEvaluated outside test. Both would misrepresent harness execution/foreign defining units if widened casually. |
| `observe.mjs:prepareObservation/validateLaunch/launchObservation` | observation.integration and exported CLI main. Clones input before await; WeakMap single-use plan; source/build recheck; fresh result path; parent-owned deadline/output/crash facts; archive. Its digest list and top-level-only source digest are explicit: a new Script path must hash its entire transitive build/source closure, including builtins. |
| `input.mjs:planCorpus/variants/transform/harnessPaths/blockers` | plan, observe, corpus/input tests. Verified manifest + bytes + metadata first; exact strict prefix; ordered non-deduplicated harness; hard-coded blockers including old capability debts. No capability registry currently exists. Do not remove these blockers in this task or treat stale descriptions as authorization. |
| `plan.mjs:prepareSelection/preflightRecords` | corpus integration and planner CLI. Always v1 blocked contexts; null build/capability identities. Adapter digest covers input/result/ledger/plan only. No guest launch path. |
| `ledger.mjs:newLedger/appendAttempt/report/persist` | planner, corpus integration, ledger/boundary/driver tests. Full selection precedes attempts; append binds trusted context/metadata/harness; blockers require not-run; first attempt headlines; retries retain denominator. No v2 record may enter this v1 ledger. |
| `parser.ts:parse/auditScriptReturns` | legacy interpreter/observation and return controls. Only return-outside-function emits through parse, after fresh whole-source audit. `parseStructuralPlan` is a different lexer/parser mode and does not call that emission wrapper. |
| `parseDeclarationPlan/parseBoundedScriptDeclarationPlan`, `collectDeclarationPlan` | prepareStrictScript/prepareBoundedScript. EOF + scope data exists, but conflict/unsupported/profile rejection is not certified SyntaxError. Duplicate parameter rejection can stop parsing before EOF. |
| `script-record.ts`, `script-execution.ts` facades | opaque prepare/evaluate/session APIs and internal host tests. `ScriptEvaluation` separates instantiation/body; inspect gives active and lastAbrupt snapshots. Neither is a transport or a trusted externally supplied AST. |
| `script-execution-internal.ts:runScript/#capture` | restores active frame/Realm/calls/depth in finally; shared steps survive. First propagation of the same throw retains its source; a caught later throw may replace it. Snapshot contains real record/Realm references, not serializable identities. |
| `runtime.ts:GuestObject.internalGet`, `Callable.realm`; Realm Error factories | Constructor inspection must use completion-aware internalGet with original receiver and engine-owned context; `.get` converts abrupt into host Error and is unsuitable. Callable has Script/builtin/legacy arms; no arbitrary object Realm can be guessed. |

Additional registration closure: `tools/build-native.mjs`, `tsconfig.json`,
`tools/run-guests.mjs`, `package.json`; existing integration tests spawn current
driver directly. A new gate/entry is additive. Archived validation scripts also
import these interfaces: preservation hashes cover them, never rewrite them to
accept a new result. New versions are parallel entry points, not v1 migrations.

## Version boundary and exact v2 records

Use new files `src/script-observation-types.ts`, `src/script-observation-json.ts`,
`tools/test262/script-driver-result.mjs`, `tools/test262/script-result.mjs`.
No structural unions that silently allow v2 through a v1 decoder. v1 rejects v2;
v2 rejects v1. Unknown versions fail `host-fault/protocol`. No fallback/retry
through another version. Wire v2 uses closed records, all declared fields required
except the single `diagnostic?` property specified below,
explicit nulls, exact enumerations, finite nonnegative safe integers, duplicate
key rejection (including escaped-equivalent keys), fatal UTF-8 and 65536-byte
result limit as v1. Unknown/missing/extra fields at every depth are protocol
faults. Diagnostics follow the exact closed optional-property rule below and
never act as a discriminator. Encoder uses existing `jsonString`, including
lone surrogate escapes. Hashes lowercase SHA-256 (64) / blob SHA-1 (40).

The following is the complete proposed shape. References are definitions, not
extra fields. Paths retain `input.mjs:safePath` restrictions. ID strings are
nonempty ASCII identifiers assigned by parent; equality is exact.
`byteLength` counts original bytes; `sourceUnits` counts transformed UTF-16 units.

```ts
type Unit = { id: string; ordinal: number; role: "harness" | "test";
  path: string; blob: string; sourceSha256: string;
  transformedSha256: string; byteLength: number; sourceUnits: number };
type Site = { unitId: string; realmId: string;
  location: { line: number; column: number } };
type Operation = { stage: "harness" | "test";
  phase: "parse" | "instantiation" | "body";
  unitId: string; realmId: string };
type Secondary = { site: Site; valueKind: ValueKind;
  origin: "guest" | "engine-diagnostic" }; // never recursively inspect
type Constructor =
  { outcome: "available"; name: string; realmId: string; secondary: null } |
  { outcome: "absent"; name: null; realmId: null; secondary: null } |
  { outcome: "non-callable"; name: null; realmId: null; secondary: null } |
  { outcome: "non-string-name"; name: null; realmId: string; secondary: null } |
  { outcome: "foreign-profile"; name: null; realmId: null; secondary: null } |
  { outcome: "unregistered-realm"; name: null; realmId: null; secondary: null } |
  { outcome: "abrupt"; name: null; realmId: null; secondary: Secondary };
type OriginalThrow = { valueKind: ValueKind;
  origin: "guest" | "engine-diagnostic"; site: Site };
type NonNormalResult =
  { kind: "throw"; phase: "runtime"; original: OriginalThrow;
    constructor: Constructor } |
  { kind: "syntax-error"; phase: "parse"; constructorName: "SyntaxError";
    ruleCode: "return-outside-function" } |
  { kind: "unsupported-syntax"; capabilityCode: string } |
  { kind: "unsupported-operation"; phase: "runtime";
    capabilityCode: "runtime.object-to-number" | "runtime.object-to-string" |
      "runtime.map-species" } |
  { kind: "unsupported-profile"; reasonCode: "strict" | "realm" } |
  { kind: "resource-limit"; guardCode: Guard; count: number; limit: number };
type Result = { kind: "normal" } |
  (NonNormalResult & { diagnostic?: string });
type Inspection = { original: OriginalThrow; operation: Operation } | null;
type ChildV2 = { driverVersion: 2; nonce: string; requestSha256: string;
  mode: "script-observation" | "conformance";
  operation: Operation; source: Site | null;
  testBodyEvaluated: boolean; harnessValidated: boolean;
  preflightId: string | null; completedUnits: string[];
  inspection: Inspection; result: Result };
```

`ValueKind` is exactly undefined/null/boolean/number/string/symbol/object. `Guard`
is the existing five engine guards. `available.name` may be empty (a real
callable can have empty name); negative metadata still requires nonempty type.
`unsupported-syntax.capabilityCode` permits exactly the SyntaxCapability union
in outcomes.ts plus `script.uncertified-conflict`, at operation.phase=parse only.
Runtime codes use only the explicit unsupported-operation arm shown above,
at operation.phase=instantiation or body; never encode them as unsupported-syntax.
Constructor foreign-profile/unregistered-realm are Constructor outcomes, not
additional capability codes. New codes require both decoders and tests.
No five-rule wildcard: v2 starts with the sole accepted return rule.
Strict-rule emission requires a later schema allowlist change and review.

`diagnostic?` is the only optional wire property. It may occur directly on any
NonNormalResult arm: throw, syntax-error, unsupported-syntax,
unsupported-operation, unsupported-profile or resource-limit. If present it
must be a nonempty string (no null, number, object or empty string); if absent
the encoder omits it, never emits undefined/null. Normal forbids diagnostic.
Parent-only timeout, host-fault, not-run and output resource-limit allow this
same optional property directly on observation. No other record, including
ChildV2, evidence, OriginalThrow, Constructor, Secondary or Inspection, permits
diagnostic. Preserve a permitted diagnostic exactly through encode/decode and
roundtrip; adding/removing/changing it cannot change classification. Required
fields remain required regardless of diagnostic presence.

Parent `ScriptContextV2` has exactly `{identity, inputs, expectedNegative,
blockers}`. Identity retains all v1 identity fields with schemaVersion=2 and
mode replaced by script-observation/conformance; goal is Script only. Inputs
retains v1 fields except `harness` becomes ordered `units: Unit[]`, and adds
`requestSha256`, `preflightId` (nullable), `realms: {id,profile:"script"}[]`,
`ruleRegistrySha256` (nullable). These are parent commitments made before child
launch. Existing transformedSourceSha256 must equal the test Unit transform.
Observation mode has capabilityLedgerSha256=null and no classification; synthetic
conformance tests cannot be appended to the actual corpus ledger.

Parent v2 terminal record is exactly `{identity,inputs,evidence,observation}`
and, only for conformance, `classification` with the existing six classification
fields. Evidence retains v1 process/stdout/stderr/elapsedMs fields and has
`stage:input|preflight|harness|test|driver`, `operation:Operation|null`,
`source:Site|null`, `testBodyEvaluated:boolean`, `harnessValidated:boolean`,
`preflightId:string|null`, `completedUnits:string[]`, `inspection:Inspection`.
It drops v1 unit/location/bodyEvaluated; those must not appear as aliases.
Observation is Result or existing closed timeout/host-fault/not-run alternatives
and parent-only output guard. Classifier derives observedPhase from Result,
not operation phase: **instantiation throws are runtime**, with body false.

The parent request is an immutable host plan (not child JSON instructions):
`{requestVersion:2,nonce,mode,units,realms,limits,preflightId,action}` where action
is parse-only or execute. Hash UTF-8 JSON of this fixed field order using compact
JSON.stringify and Unit field order shown above. Source bytes are separately
verified against units; no guest AST, expected negative or expected outcome is
sent. Child arguments are a distinct new entry's positional manifest format:
`MODE ACTION NONCE REQUEST_HASH PREFLIGHT_ID RESULT_PATH STEPS CALLS`, followed
by triples `UNIT_ID ROLE SOURCE_PATH` in request order; PREFLIGHT_ID is `-` for
none. Child validates count/domains before reading; parent owns full hash/byte
binding. It cannot independently authenticate a supplied hash: this is a trusted
driver protocol, not a cryptographic proof against a hostile engine. Parent
protects and rehashes artifacts before launch, and binds returned fields to its
saved plan. Build/source/policy hashes cover all transitive imports and registries.
The initial production entry creates exactly Realm `test` for its reload/test
attempt. Preflight controls run in separate attempts with the same local ID;
equal local IDs across requests never imply shared objects. Additional Realm
IDs are permitted only in registered host controls with deterministic creation
order and registry included in policy identity. The argv does not grant a guest
createRealm service. The codec validates such controls without activating them.

The trusted decoder argument has one exact closed shape (not a wire record):

```ts
type ScriptDecoderBinding = {
  nonce: string; requestSha256: string;
  mode: "script-observation" | "conformance";
  units: Unit[]; realms: { id: string; profile: "script" }[];
  preflightId: string | null; action: "parse-only" | "execute";
  limits: { sourceUnits: number; parseDepth: number; steps: number;
    calls: number; evaluationDepth: number; wallMs: number; outputBytes: number };
  sources: { unitId: string; transformedText: string }[];
};
```

All fields including limits and sources are required; limits are nonnegative
safe integers, with the same fixed engine caps as the launch policy. Sources
has exactly one entry per Unit in identical order, including distinct repeated
occurrences; no absent/extra/duplicate unit ID. Parent derives transformedText
by fatal decoding of verified transformed bytes, retaining BOM and exact code
units. Its UTF-16 length must equal Unit.sourceUnits; its UTF-8 encoding hash
must equal Unit.transformedSha256. No caller-provided length or hash substitutes
for text. Binding mode matches context.identity.mode; units/realms/limits/
preflightId/requestSha256 match context.inputs. Nonce/action are bound by
recomputing the fixed request hash with requestVersion=2 and binding fields.
Both decoders validate binding before using text for coordinates or guard limits.

Exact APIs: `parseScriptDriverResult(bytes,binding:ScriptDecoderBinding)`;
`validateScriptRecord(value,binding:ScriptDecoderBinding|null)`;
`parseScriptEnvelope(json,binding:ScriptDecoderBinding|null)`;
`assertScriptContext(value,context,binding:ScriptDecoderBinding|null)`;
`inspectScriptEnvelope(json,context,transport,binding:ScriptDecoderBinding|null)`.
A non-null binding is mandatory for a launched record or any operation/site,
constructor evidence, body entry, harness validation or pass/fail classification.
Null is permitted only for unlaunched input/preflight not-run records with no
operation/source/inspection, empty completedUnits and both booleans false.
The immutable saved parent plan retains binding alongside context; sources are
not added to wire Inputs or argv. Full-envelope replay needs saved binding and
transport facts, not received JSON alone. A's tests and C's launcher use the
same binding contract.

Shape is insufficient. Both decoder layers enforce the same operation table:

| Operation/result | Required relationship |
|---|---|
| parse normal/error | testBodyEvaluated=false; source null for normal, matching operation unit/Realm for error; no inspection. Parse-only normal is a valid observation and later expected-parse-error fail, never run body. |
| instantiation throw | testBodyEvaluated=false for test entry; runtime result; original source equals captured first-abrupt site, not guessed operation unit. |
| body normal/throw | testBodyEvaluated=true iff test body was entered; normal has source=null. Harness body alone never sets it. |
| resource/unsupported | matching phase and guard/capability domain, no invented throw; body flag records entry, not success. Inspection limits keep original throw under inspection. |
| unsupported-operation | phase=runtime; operation phase instantiation/body; code is one of the three runtime codes; source is the actual unsupported operation site. Direct runtime failure has inspection=null. Secondary inspection failure retains inspection.original and inspection.operation from the original throw/entry, and source is the secondary site. Neither form carries a Constructor or becomes a throw. |
| constructor result | only object original may have non-absent constructor; inspection is non-null only for secondary resource-limit or unsupported-operation. Every throw Result, including constructor.outcome=abrupt, carries original and constructor with inspection=null. Its secondary guest throw site is constructor.secondary.site. |
| harness operation | operation unit has harness role; stage harness; testBodyEvaluated=false. All source sites may reference earlier loaded defining units. Test calling harness function remains test. |
| test operation | test unit role; non-raw conformance requires parent-validated preflight ID and harnessValidated=true; completedUnits equals exactly the successful ordered reload prefix. |

All referenced unit/Realm IDs must exist in parent context. Reject duplicate IDs,
reordered/omitted successful prefixes, source sites from unloaded occurrences,
out-of-source locations, raw with harness units, test before harness completion,
foreign-profile or unregistered available constructor Realm, forged preflight ID, or any
child process facts/classification. Line/column are one-based UTF-16 coordinates
in the transformed unit, including strict prefix; parent retains bytes to validate
the line extent. Source and operation Realm may differ on cross-Realm callbacks.
`completedUnits` lists only successfully evaluated harness occurrences, never
the test or merely parsed units. A failing harness occurrence is not included.
During secondary resource-limit or unsupported-operation, `source` is the
secondary site and `inspection` retains the original site/operation. On every
throw Result, including constructor.outcome=abrupt, `source` equals
result.original.site; the secondary guest throw site is constructor.secondary.site.
Neither site is reconstructed from diagnostic.name.
The child decoder binding also includes limits and the retained transformed
source text for coordinate/guard checks. It must not trust lengths alone for
line/column validation.
An available constructor Realm is valid if it is any registered Script Realm,
including a different Realm from operation.realmId or original.site.realmId.
Equality with the active Realm is not required. A legacy Realm is foreign-profile
and cannot appear in the Script registry; an unknown ID cannot be available.
The explicit foreign-profile/unregistered-realm Constructor outcomes (null name,
Realm and secondary) are valid records and classify unsupported-feature, while
a forged available outcome using such an ID is host-fault/protocol.

## Constructor inspection without losing the original completion

This requires a separate engine slice; codecs alone cannot implement it. Do not
call projectThrow with extra flags, expose ExecutionEngine.context, use `.get`,
call arbitrary closures after evaluateScript, or seed a new unlimited evaluator.

Proposed new internal facade `src/script-throw-inspection.ts` reexports only
`evaluateScriptObserved(session, record): ObservedScriptEvaluation` from
script-execution-internal. Ordinary evaluateScript is unchanged. The observed
entry delegates to the same runScript, optionally performs the following fixed
operation before its outer finally, and returns `{evaluation,source,inspection}`.
`evaluation` retains the exact original ScriptEvaluation and ThrowCompletion
references; `source` is its detached original snapshot; inspection is a tagged
constructor result or resource/unsupported secondary plus its own snapshot.
No callback argument, caller-supplied completion/frame/AST/context/Realm map, or
general property inspection API. Session private state owns the operation and
rejects reentrant observed entry while active. No new writable public slots.

1. Only inspect a guest or engine-diagnostic throw. Resource/unsupported origin
   wins immediately, even with RangeError-shaped value/diagnostic. Primitive
   (including null and symbol) returns absent without property access.
2. Capture original completion **and** first-abrupt snapshot before inspection.
   Use the test entry frame's Realm/context, retaining original defining source
   separately. Read actual thrown object's `constructor` once by internalGet,
   receiver=original value; null/undefined is absent, other non-callable values
   are non-callable. Callable identity is its actual `callable` arm, not a name,
   constructorSlot, instanceof, Error brand or prototype shortcut.
3. Validate callable Realm is Script; legacy callable => foreign-profile. Retain
   its actual Realm reference in the internal inspection result. Read callable's
   `name` once by internalGet, receiver=that callable. String (even empty) is
   available; no coercion, primitive boxing or fallback to initialName/name on
   thrown value. Non-string => non-string-name with constructor Realm retained.
   At projection, map the actual Realm reference through the adapter registry;
   unknown => unregistered-realm. Different registered Script Realm is valid
   evidence with its different ID. No registry/callback enters the engine. A
   failing name read retains its abrupt/resource/host outcome before projection.
4. Gets may call guest getters through existing captured-owner dispatch/permits.
   Same session steps/calls/depth and fixed limits apply. Original throw cannot
   be caught/replaced by inspector code. Secondary guest throw yields abrupt,
   with secondary value kind/origin/site, never recursive constructor inspection.
   Resource during inspection becomes resource-limit; an unsupported-operation
   origin becomes `{kind:"unsupported-operation",phase:"runtime",capabilityCode}`
   using its exact code, plus Inspection containing original and operation.
   The same origin before inspection uses that Result with inspection=null.
   Neither projection reads Diagnostic.name. Host exception
   escapes, becomes parent host-fault, never an abrupt guest result.
5. Save/restore private first-abrupt bookkeeping around inspection, preserving
   original `session.inspect().lastAbrupt` after return; expose secondary only in
   the detached inspection result. Existing finally still restores frame, Realm,
   calls and depth on every exit; steps remain monotonic, including inspection.
   No restoration of step count to hide work. Returned records/snapshots cannot
   mutate internal state. A later ordinary session evaluation still works.

Negative metadata matches the extracted **name**, as the accepted classifier
contract specifies. An object deliberately referring to a callable named
ReferenceError can match; this is not a claim of intrinsic Error branding.
Harness assert.throws instead compares exact constructor object identity: its
cross-Realm same-name negative must continue to fail. These contracts must not
be conflated. absent/non-callable/non-string-name are type-mismatch; abrupt is
constructor-inspection-abrupt; foreign-profile/unregistered-realm are explicit
unsupported-feature, never a negative match. Original throw is never replaced
by the secondary exception for expected-negative matching.

## Ordered units, preflight and classification

Parent verifies full pinned blobs and fatal UTF-8 first, parses metadata from
original bytes, then applies only the existing strict prefix to test units.
Harness bytes never change. Assign ordinal 0..N across assert, sta, includes
including repeated occurrences, then test. ID is `u` + decimal ordinal; identical
path/hash twice still has two IDs. SHA-256 request identity includes the entire
ordered Unit array, original/transform hashes, byte lengths and UTF-16 lengths.
No deduplication, concatenation, shims, AST/body substitution or cache by path.

Preflight evidence is keyed by engine source/build, adapter, profile, policy,
rule/capability registry, limits, lane, corpus pin, complete ordered harness
identity and the exact H7 control-set digest. No successful-preflight cache in
the initial implementation. Each control uses fresh Realm; shared session budgets
are monotonic across ordered units and Realms within that attempt. Separate
control subprocesses have their own explicitly recorded limits/deadlines; no
budget reset inside a session. Failed preflight reports stage=harness,
harnessValidated=false, including host/resource/unsupported/timeout failures.

Only parent verified complete positive **and deliberate negative** H7 outcomes
can mint preflightId. Dispose all preflight records/Realms; no function/object
transfer. Reload verified bytes into a fresh per-row test Realm, with distinct
registered Realm ID and fresh per-attempt session; parse and evaluate each
ordered harness unit separately. Reload failure cannot borrow preflight success
to pass: retain stage=harness, preflightId evidence, no test body. Parse-negative
tests are then parsed in full without evaluating or instantiating their test
record, even when syntax is valid. H7 validation doesn't authorize dormant
compareArray/map helpers, arbitrary sloppy tests, async, modules or host services.

Primary precedence is explicit, shared by composition, decoding and ledger:
parent deadline -> independent abnormal termination/host fault -> parent output
limit -> malformed/missing/stale protocol -> child resource -> child unsupported
-> harness failure -> test positive/negative comparison. Preserve v1's distinction
between crash-before-cap and termination requested by cap: cap-kill is output
resource, not crash. Full-envelope inspection must consume the same recorded
cap facts, otherwise a valid composed resource record would become crash when
round-tripped. Cancellation remains unfinished with artifacts, not a timeout or
terminal pass. Normal envelope followed by exit70 is host-fault. stdout can
never supply protocol. Infrastructure faults cannot satisfy a negative.
`inspectScriptEnvelope(json,context,transport,binding)` takes the v1 transport fields
plus `capCount:number|null`, `capKilled:boolean`, `crashBeforeCap:boolean`.
These extra facts are persisted in a trusted transport artifact, never accepted
from child or envelope. Roundtrip requires this artifact; without it an archive
cannot authenticate cap termination. Validate capCount>outputLimit and
capCount<=outputBytes; capKilled requires capCount. Deadline always wins.
After those overrides, test normal is pass only for a positive with body entered;
parse-only normal against a parse negative is fail/expected-parse-error. A
runtime negative can match an instantiation throw without body entry. Phase
mismatch is fail/phase-mismatch; no error against runtime negative is
fail/expected-throw; positive throw is fail/uncaught-throw; unexpected certified
parse error is fail/unexpected-parse-error. Unsupported-profile is its own
status; harness ordinary normal is internal evidence, never a terminal corpus
pass. Complete verified identity/inputs/context and empty blockers are mandatory
before any test pass/fail. Schema/invariant/context failures are host-fault/protocol.
Both unsupported-syntax and unsupported-operation classify unsupported-feature
with reasonCode equal to capabilityCode, before harness/negative matching.
For unsupported-operation, observedPhase is runtime and observedConstructorName
is null; for unsupported-syntax both are null. For secondary unsupported-operation
the original throw is evidence only, never the matching candidate. Both decoders
reject a runtime code in unsupported-syntax, a syntax code in unsupported-operation,
phase=parse on unsupported-operation, and any inspection during parse-only action.

Child has no terminal timeout/host-fault arm: host fault exits70, deadline belongs
to parent. On such failures without valid child evidence use stage=driver,
operation/source=null; do not infer test entry from marker text. Preflight parent
may retain known stage=harness but cannot invent phase/source/body entry.
Bounded timeout controls need the accepted guarded first-iteration marker to
prove loop entry in tests; that marker does not authenticate a production result.

## Rule certification and runtime capabilities are separate registries

New strict early-error certification is **not ready**. Return's accepted legacy
audit does not automatically certify the bounded Script parser. A new parse-only
adapter may call source-only `parse` to obtain its existing return evidence; if
the Script structural parser has a different result, retain unsupported rather
than upgrade a structural rejection by message. General parse success must come
from the actual Script plan and scope checks; legacy parse success is insufficient.
Uncertified conflict maps script.uncertified-conflict, not SyntaxError.
Normative basis is the retained ECMA-262 2025 and engine-source audit in
[syntax-certification](syntax-certification.md), plus accepted
[Script integration](script-execution-integration.md) and
[harness contract](harness-prerequisites.md). No new language semantics or fresh
upstream measurement is introduced here. Future strict-rule work must revisit
the fixed clauses against its actual grammar and whole-source evidence.

A later rule assignment must audit every function body and full source through
EOF under the actual Script grammar, including strict directives/inheritance,
formals and correct block/catch/switch/function scope. Record candidates while
continuing the same parse; later unsupported token/grammar/resource vetoes
certification. No skipping tokens, source repair, metadata-directed error tags,
caller-provided complete=true, or executable AST from the audit. Duplicate
strict parameter and duplicate block lexical function each need separate
valid/invalid and late-tail controls. Numeric assignment and lexical-in-Statement
need their own production audits; scope data alone does not certify them.

Runtime capability evidence is per exact pin/path/blob/source/transform/variant,
engine/build/profile, ordered harness key, host services and limits. Its entry
lists required behavior and linked literal both-host tests, not expected pass.
No entry can be inferred from rule certification, parser coverage, H7 success,
old manifest readiness text or a passing body-observation. A later registry
reader fails closed on missing/stale/unknown evidence, and cannot grant module,
async or arbitrary sloppy profile. Once explicitly admitted, runtime mismatch
is fail, never retroactive skip. New v2 ledger preserves first attempt, retries,
all statuses and the entire original denominator; v1 historical records remain
v1. Mixed-version ledgers are rejected, not normalized into one percentage.

## Ordered assignments and ownership

| Slice | Exact owned implementation surface, API and acceptance boundary |
|---|---|
| **A first** | New four codec/schema files named above; new `test/script-observation-serialization.ts`, `tools/test262/script-result.test.mjs`, `script-driver-result.test.mjs`; one additive build-native gate and new evidence only. Export `scriptObservationJSONRecord(value:ChildV2):string`, `parseScriptDriverResult(bytes,binding)`, `validateScriptRecord`, `parseScriptEnvelope`, `assertScriptContext`, `inspectScriptEnvelope`. Use the exact ScriptDecoderBinding and API signatures above, including required limits and ordered transformed sources, in both decoder paths. Validate all cross-field invariants; synthetic literals only. New host modules do not import/alter v1 classifier or launcher. v2 test fixtures include a classification, and decoder independently verifies its literal derivation; no corpus registry or execution. Static-only+separate coverage and two-input serializer Node/native gate, malformed/roundtrip host tests. Stop for review. |
| B | New script-throw-inspection facade, bounded changes in script-execution-internal only, new test/script-throw-inspection.ts + fixture and gate. Exact observed entry above; actual guest objects/getters/Realm outcomes, original/secondary identity and cleanup matrix. Codec A unchanged unless concrete reviewed incompatibility. No launcher/admission. |
| C | New src/script-observation.ts + script-observation-driver.ts, tools/test262/script-observe.mjs, new integration tests/gate. `prepareScriptObservation`, `validateScriptLaunch`, `launchScriptObservation`; action parse-only/execute, mode script-observation only. Parent-owned plans/artifacts/digests/preflight lifecycle; v2 production roundtrip, two runtime-read inputs, H7 fault/reload controls. Map preparation outcomes explicitly. No conformance ledger append/CLI migration. |
| D independent | Rule-specific source audit first, then separately reviewed emission and both v2 allowlists. Own exact parser/declaration/outcomes changes only when assigned; tests use valid/invalid/tail/guard controls. No capability grant. May remain deferred while observation C is useful. |
| E | New tools/test262/script-capabilities.mjs, script-plan.mjs, script-ledger.mjs; reviewed v2 classifier in script-result.mjs and bounded new tests. Exports prepareScriptSelection/appendScriptAttempt/reportScriptLedger; add empty versioned registry only. No old manifest/input.blockers changes; trusted v2 planner must reconstruct all blockers then remove only specifically evidenced debts. Synthetic admission/context mutation tests; real registry empty, actual 60 blocked. |
| F separate activation | Explicit per-file/variant capability review, then exact new registry entries and conformance launch in script-observe. Coordinator freezes owned files and expected corpus controls first. Full 60-record ledger per lane, no promised passes or automatic certification. Not authorized by A–E or this checkpoint. |

All slices retain existing 212 guest records, 59 native gates and old tests;
required affected tests and gates come from their concrete assignment. Do not
rerun full suites for this documentation task. Native feasibility of new getter
inspection and new codec is **unmeasured**, not assumed from H7. If static/dynamic
coverage exposes a new pattern, retain a minimal reduction and request review
before a workaround or ownership expansion. No public Construct API, compiler
pin/default profile change, publication or successor dispatch is part of TS-035P.

## Literal acceptance controls (future, not executed here)

Each engine row runs Node-hosted Rift and freshly compiled native Rift with
separate zero-dynamic coverage and two runtime-read inputs. Freeze literal
expected values before launch; parity alone is insufficient. Transport mutation
rows are applied to bytes from **both** lanes, then both child and full-envelope
decoders and ledger-context validation. No guest eval in host Node.

| ID | Literal input/control | Expected |
|---|---|---|
| T01 | serializer runtime input `alpha`, then `beta`; string field also `\u0000`, quote, backslash, lone `\ud800` | exact ASCII JSON escapes and decoded UTF-16 equality; version2; one complete record. v1 decoder rejects it, v2 rejects literal version1. |
| T02 | `{}`, truncated JSON, concatenated records, duplicate nonce and `\u006eonce`, unknown version3, extra nested field, invalid UTF-8, 65537 bytes, NaN/fraction/negative counts | host-fault/protocol; no classification pass. |
| T03 | mutate nonce/request hash/mode/unit ordinal/Realm/preflight ID; available constructor with null Realm; primitive with available constructor; missing original site | reject at both layers against saved parent context; source/build/registry/hash drift rejects before spawn. |
| T04 | valid complete v2 child -> parent composition -> stringify -> parseScriptEnvelope -> inspectScriptEnvelope -> appendScriptAttempt on synthetic context | exact field preservation and same status; forged classification rejected; actual blocked ledger refuses executed record. Output-cap kill remains resource-limit on roundtrip. |
| X01 | `"use strict"; missing;` / `"use strict"; otherMissing;` | body, test, runtime throw, real ReferenceError constructor/name and current Realm ID; original completion unchanged. |
| X02 | `"use strict"; throw 'ReferenceError';` / `throw 7;` in strict source | absent constructor; runtime ReferenceError negative => type-mismatch, diagnostic name irrelevant. |
| X03 | object constructor getter returns ReferenceError; name getter counter returns `'ReferenceError'` | exactly constructor then name, each once; actual receiver values; available name. Null constructor=>absent; number=>non-callable; callable name7=>non-string-name. |
| X04 | constructor getter throws sentinel; separately name getter throws sentinel | original throw retained, exact secondary identity/site, abrupt => fail constructor-inspection-abrupt; no recursive inspection. |
| X05 | registered other Script Realm ReferenceError; legacy Realm callable; unregistered Script Realm callable | available with other ID; foreign-profile unsupported; unregistered-realm unsupported, respectively. H7 assert.throws same-name other-Realm remains Test262Error. |
| X06 | getter exhausts steps / host throws / unsupported operation; origin resource with diagnostic RangeError | resource / host-fault / unsupported; none matches runtime-negative RangeError. Finally active=null, calls/depth restored; original lastAbrupt unchanged and steps not reset; later session reuse succeeds. |
| S01 | `"use strict"; let a=1; observe(a);` versus `"use strict"; let a=2; observe(a);` | New control driver seeds a guarded observer which captures the numeric guest argument in a host-owned array. Literal arrays `[1]` and `[2]` are asserted by that host control after execution in both lanes. The wire Result is exactly `{kind:"normal"}` for both, with no value/output field. The host control result is separate evidence, never protocol parsed from stdout. Same complete transport path. |
| S02 | seeded global declaration conflict at instantiation | runtime throw, phase instantiation, testBodyEvaluated=false; successful negative does not require body entry. Parsed source conflict without certified rule => unsupported. |
| S03 | `return 1;` / `return 2;` parse-only; valid `"use strict"; 1;`; `return 1; class C {}` | accepted return rule where whole-source legacy audit applies / expected-parse-error fail with zero test effects / unsupported, respectively. No new strict rule. |
| H01 | original assert.js, sta.js, same include twice, strict test `assert(false);` | repeated occurrences distinct IDs; test stage despite assert defining source; Test262Error uncaught-throw, not harness error. |
| H02 | successful preflight then reload byte/hash/order substitution; stale build/control digest; duplicate/missing occurrence | input/context rejection before test; no borrowed success. A permitted runtime reload failure is harness-error, body false. |
| H03 | positive/negative H7 controls, preflight parse/instantiation/body fault | only complete verified control bundle mints preflightId; failure stage harness, harnessValidated=false; all later rows blocked. |
| P01 | valid normal child + exit70; missing child + deadline; cap-requested kill; crash before cap; cancel | host-fault; timeout; output resource; host-fault; unfinished. stdout forged JSON cannot change any result. |
| C01 | strict duplicate formals plus own/inherited directive; sloppy simple duplicate neighbor; late class/token/depth blocker | no new certified SyntaxError until separate whole-source rule audit; late blocker always vetoes. D's matrix must include block duplicates and distinct-name neighbors separately. |
| U01 | A literal direct `{kind:"unsupported-operation",phase:"runtime",capabilityCode:"runtime.map-species"}` at test/body, inspection=null; later engine control reaches actual custom-species rejection | Both decoders accept the structured outcome; classifier yields unsupported-feature/runtime.map-species, observedPhase=runtime, constructor=null, even against negative runtime/TypeError. Mutate to unsupported-syntax or phase=parse or syntax code => protocol. No custom-species implementation is authorized. |
| U02 | Same literal runtime.map-species result from constructor/name getter, source=secondary site, inspection retains original ReferenceError throw and entry operation | Both decoders accept; classifier remains unsupported-feature/runtime.map-species, never negative-match for original ReferenceError. Roundtrip preserves original/secondary sites. Remove original, use parse-only action, add constructor to Result or forge unknown site => protocol. |
| R01 | Constructor available/name=ReferenceError/realmId=other, where other is a registered Script Realm; then explicit foreign-profile and unregistered-realm outcomes | Both decoders accept all three valid shapes. With runtime/ReferenceError negative, registered other matches by name; latter two classify unsupported-feature with constructor.foreign-profile / constructor.unregistered-realm. Unknown available ID or registry entry profile=legacy => protocol. H7 identity assertion still rejects other Realm. |
| B01 | Complete ScriptDecoderBinding; then omit limits, omit sources, change text without hash, reorder/repeat source IDs, change limit without request hash, forge in-range-length but nonexistent line/column | Valid binding roundtrips; each mutation rejected by both decoder entry paths. Adding sources to child or wire Inputs is also protocol. |
| D01 | Every non-normal child Result and parent-only alternative with diagnostic absent and then diagnostic=`TypeError: text only`; normal without diagnostic | Valid variants roundtrip exactly and keep classification unchanged. For every arm, null/empty/number diagnostic, nested/misplaced diagnostic, unknown field or missing required field => protocol. Normal with any diagnostic => protocol. |

These are required controls, not measured results. Admission remains blocked if
any exact decoder, inspection, source provenance or native control is missing.

## A binding amendment — 2026-11-04

Actual information-flow witness in validation/ts-035a/binding-review.mjs and independent second review show raw/non-strict may have identical bytes while requiring opposite preflight decisions. This amendment supersedes the earlier exact request/binding field lists only as follows: required `variant: "strict" | "non-strict" | "raw"` immediately after `mode` in ScriptDecoderBinding and in the fixed ordered hashed request. Request order is requestVersion,nonce,mode,variant,units,realms,limits,preflightId,action. Binding variant must equal context.identity.variant; unknown/module variants reject. No variant is added to ChildV2: requestSha256 binds it. Both layers reject raw with any harness Unit/completedUnits,nonnull preflightId or harnessValidated=true. Non-raw conformance retains required preflight checks. Test paired raw/non-strict same source with corrected distinct request hashes,missing/unknown variant,stale hash,changed context variant,raw harness/preflight/validation and nonraw absent preflight mutations. Original indistinguishable-input witness remains unchanged. No admission or launcher implementation authorized.

### TS035B synthetic inspection source amendment (2026-11-05)

Reviewed cross-record witness shows that post-evaluation constructor/name Gets have no new guest AST site: pairing the original diagnostic location with the entry record can be out of bounds. Synthetic inspection Gets therefore retain the original throw snapshot's record/unit/location as a private source anchor, while capture retains the actual active execution Realm. Entry context/frame/lexical environment/strictness remain unchanged. Pre-dispatch failures use the entry Realm; builtin execution uses its defining Realm. Actual Script function execution, including allocation and instantiation, suspends this anchor and restores it in finally, so genuine getter source wins even when its record equals the entry record. First-capture completion identity preserves that genuine source through outer builtin unwinding. Inspection restores the anchor and original abrupt history on every exit. No registry, public context, caller-provided source or codec relaxation is introduced. Exact five-edit proposal and P01-P09 literals are retained in ts-035b; implementation and both-host validation remain required before acceptance.

### TS035C parse-only harness inspection amendment (2026-11-05)

The action parse-only constrains the test unit, not required harness reload execution. Actual B evidence shows a harness getter can exhaust resources during constructor inspection before the test is prepared. Both decoder predicates therefore permit non-null inspection when `(binding.action === "execute" || operation.stage === "harness")`, still requiring non-parse phase, resource-limit or unsupported-operation, and every existing source/Realm/original/prefix invariant. The earlier blanket prohibition on inspection during parse-only action and U02's parse-only mutation prohibition mean **test-stage** parse-only inspection; those remain rejected. Harness parse-phase inspection, test body/instantiation under parse-only, mismatched role/prefix/inspection operation and raw harness remain invalid. Exactly this predicate in each parallel v2 decoder may change; no engine/schema/API/v1 change. Add new C-scoped both-decoder steps/calls/unsupported positives and all negative neighbors, preserving prior A tests and original witness.
