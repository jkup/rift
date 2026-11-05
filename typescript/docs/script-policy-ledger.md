# In-memory blocked policy ledger: E2b review contract

Design candidate, 2026-11-05, against cbdf4fc / accepted E2a44f6530. This
refresh supersedes only the deferred E2b paragraphs of script-selection-ledger.md.
It authorizes no implementation. E2c storage, live anchors, reopen, restart and
power-loss behavior and E3 receipts/admission require separate assignments.

## Ownership and closure

The implementation slice would add tools/test262/script-ledger.mjs and
script-ledger.test.mjs, with new docs/validation/ts-035e2b/ evidence. The only
existing production edit is the complete script-plan.mjs proposal: add
tools/test262/script-ledger.mjs to the byte closure and change policy.id from
rift-script-blocked-v2 to rift-script-blocked-v3. selectionVersion stays 2;
ledgerVersion is 2. The policy revision identifies the enlarged semantics;
it does not upgrade any v1 container. No circular imports: script-ledger imports
inspectScriptSelection from script-plan; script-plan hashes ledger bytes but
never imports it. Ledger needs no other local production import. Keeping v2
would mislabel the new policy; including tests/evidence in closure would make
policy depend on outputs and create an unnecessary hash cycle.

Two existing test consumers require exact proposals: script-plan.test.mjs and
docs/validation/ts-035e2a/support.mjs. The support copier must include the new
ledger file even though its isolated planner never imports it. The test must
compare all six selection literals and five input literals after a tightly
guarded closure-only transformation. Historical JSON is never rewritten. The
transformation verifies the old policy ID, 241 entries, old planner hash and
old aggregate hash, retains the other 240 entries, pins the new planner hash,
adds exactly one ledger hash from actual bytes, sorts, and recomputes the digest.
Its ledger hash is a byte-closure expectation, not proof of correct ledger code;
new semantic tests and actual/second source review provide that proof. It never
reads the observed Selection to derive expectations. Every old behavioral
assertion remains. Complete original/proposed files, hashes and verifier are
in ts-035e2b-p/proposals and proposal-manifest.json. No other old edit is proposed.

The E2a freeze script and initial/fresh/failed/raw snapshots are historical
producers, not migrations. Do not run freeze.mjs to replace expectations.
E2a run-new-tests/validate are retained historical runners; the new E2b runner
must execute inherited tests in an isolated copy with new output destinations,
preserving all old evidence. E1 is unchanged. v1 ledger.mjs retains newLedger,
appendAttempt, report and persist; its consumers plan/observe/corpus.integration,
boundary/driver-result/ledger tests and adapter hashes are unchanged. v1 mutable
JSON and stage=test execution counting are not reused for E2. No new CLI caller,
package registration, result classifier or conformance launcher is introduced.

## Exact public boundary

Only four named exports exist (no default, class, load, validator or test hook):

| Function | Accepted call arity | Function.length | Result |
|---|---|---|---|
| newScriptLedger(selectionToken) | 1 | 1 | LedgerToken |
| appendScriptPolicy(ledgerToken, slotId, retryReason = null) | 2 or 3 | 2 | undefined |
| inspectScriptLedger(ledgerToken) | 1 | 1 | Ledger |
| reportScriptLedger(ledgerToken) | 1 | 1 | Report |

All are synchronous. Explicit undefined third argument means null, as does
omission. No argument is coerced. A slot ID must be a nonempty primitive string;
retryReason must be null or a primitive string. Empty/whitespace strings are
well-typed but fail retry-policy. Numbers, symbols, boxed strings, arrays,
objects, functions and accessors are never inspected/coerced as slot/reason.
Token authentication uses WeakMap membership without caller property access.
Proxies/objects around tokens do not authenticate. Arbitrary token types are
token errors, not argument-type errors. Wrong arity and malformed slot/reason
types are arguments errors before authentication. Native Error.prototype,
message exactly script-ledger/<code>, no custom fields/cause; standard own
stack/message are allowed. No underlying script-plan error escapes.

Creation order: arguments -> token -> already-used-selection -> selection.
Authenticate with imported inspectScriptSelection; map its token rejection to
token. Keep consumption in a module-private WeakSet. Obtain a detached selection,
validate the complete closed schema/invariants below, construct/freeze initial
private state and token, then publish state and consume selection in the same
non-reentrant synchronous operation. Failure before publication consumes
nothing. Inspection of a consumed selection remains valid; only creation in
this ledger module instance is one-use. A second ledger module instance has
its own consumption set and may independently consume the same authentic
selection from the shared canonical planner. Tokens from a separate planner
instance fail authentication; tokens from a separate ledger instance fail
ledger authentication. This is process-local ownership, not global durable
single-writer protection. Do not add runId deduplication or a public bridge.

Append order: arguments -> token -> selection -> history -> slot -> retry-policy.
Inspect/report: arguments -> token -> selection -> history. Selection and history
failures are defensive corruption checks, normally unreachable through authentic
public calls. Unknown well-typed slot ID is slot, even with a bad reason policy.
A duplicate first append (omitted/null/undefined reason) is retry-policy. First
attempt requires null; subsequent attempts require a nonblank trim() string.
Store the original string, including surrounding whitespace, unmodified.
Creation used-selection wins over any subsequent defensive selection defect.
Malformed arity/type wins even with a forged token. Error tests must assert both
message and zero state/consumption change, not merely that something throws.

Each token is a distinct frozen ordinary empty object. Each inspection/report
is a fresh recursively frozen detached tree, including nested selection policy,
metadata, debts, attempts, terminals, file statuses and ratio objects. Never
freeze, mutate or retain caller objects. No writable data is exposed. No IO,
await, callback, receipt, engine, wire codec, runtime capability read or closure
rehash occurs in ledger operations: the saved authenticated E2a selection is
the policy snapshot. Later disk drift does not rewrite this non-executing
snapshot. A new selection performs the normal two full checks. No E2c freshness
or persistence claim follows from ledger creation.

## Closed schemas and invariants

Selection is the complete exact E2a Selection/SelectedFile/Slot/Metadata/Debt
schema in script-selection-ledger.md, except policy.id=v3 and closure includes
exactly the new ledger entry (242 files in the pinned current host). Preserve
arbitrary nonempty requested revision; IDs remain pinned, not requested-revision
derived. Validate kind/version, UUID, lowercase hashes, exact empty authority
registryVersion1/canonical hash/entries[], execution=null, cache=false,
host/platform strings, sorted unique closure paths/hash/digest, required closure
labels and fixed policy ID. No loader/import exists. Validation checks the
saved values; it does not reconstruct selection from caller JSON or current IO.
No empty selected-file set, duplicate paths/manifest IDs/slot IDs, ordinal gaps,
lane mismatches or extra keys. Dense ordinary arrays/objects only, own data
properties, no symbol/extra keys, no accessors. Hashes/metadata/harness/debts and
all path/variant/ID/goal relationships follow E2a/E1; every slot is blocked with
nonempty original ordered debts, including runtime:coverage exactly once.
Module remains an outer module slot with goal Module and first module debt;
it never acquires a Script context/wire. Null slots require exact input error;
non-null slots are nonempty, retain metadata/hashes/debts on include failure,
and use input-failed with empty harness; otherwise verified. Preserve repeated
ordered harness occurrences. A schema-valid authentic all-null-slot selection
is allowed and produces an incomplete ledger with no appendable IDs.

For clarity, the closed selection key sets are reproduced here. Bracketed types
are dense arrays; all integer lengths/ordinals are nonnegative safe integers.

```text
Selection = {selectionVersion:2,kind:'script-blocked-selection',runId:UUID,
 revision:nonempty string,manifestSha256:Hash64,lane:'node'|'native',cache:false,
 authority:{registryVersion:1,registrySha256:Hash64,entries:[]},
 policy:{id:'rift-script-blocked-v3',closureSha256:Hash64,
   files:[{path:nonempty string,sha256:Hash64}],host:string,platform:string},
 execution:null,files:[SelectedFile],excludedFixtures:[]}
SelectedFile = {ordinal:integer,path:string,manifestId:string,
 inputError:null|InputError,slots:null|[Slot]}
InputError = {status:'harness-error',stage:'input',reasonCode:nonempty string}
Slot = {id:string,ordinal:integer,fileOrdinal:integer,path:string,
 manifestId:string,lane:'node'|'native',variant:'strict'|'non-strict'|'raw'|'module',
 goal:'Script'|'Module',blob:Hash40,sourceSha256:Hash64,byteLength:integer,
 transformedSourceSha256:Hash64,metadata:Metadata,
 harness:[{path:string,blob:Hash40,sha256:Hash64}],
 harnessState:'verified'|'input-failed',debts:[Debt],admission:'blocked'}
Metadata = {flags:[string],features:[string],includes:[string],locale:[string],
 negative:null|{phase:'parse'|'runtime'|'resolution',type:nonblank string}}
Debt = {id:string,status:'unsupported-feature'|'unsupported-profile',
 reasonCode:nonempty string,authority:'runtime'|'never'}
```

E1 debt order/ordinal legacy IDs and mandatory final runtime:coverage are
preserved, with no filtering or debt reconstruction in E2b. Authentic E2a
ownership establishes pinned manifest/metadata/source provenance. Defensive
shape validation is not a second manifest loader or a duplicate implementation
of blockers. A proposed implementation that needs another local dependency or
new public validator requires review before widening this ownership.

Ledger = {ledgerVersion:2, kind:'script-policy-ledger', selection:Selection,
attempts:Attempt[]}. Attempt = {sequence:positive safe integer, slotId:string,
attempt:positive safe integer, retryReason:null|string, terminal:PolicyTerminal}.
PolicyTerminal = {kind:'policy', stage:'input'|'preflight', status:'harness-error'|
'unsupported-feature'|'unsupported-profile', reasonCode:nonempty string,
executed:false, testBodyEvaluated:false}. No omitted/extra fields or alternate
terminal kinds. Global sequence is exactly array index+1; per-slot attempt is
exactly its subsequence index+1. No gaps, duplicate first, unknown slot or
terminal unequal to derived policy is valid. No public history input exists:
copies, including reordered-and-renumbered histories or changed nonblank retry
text, cannot replace saved history because they are not tokens. A generic
schema check alone cannot distinguish two otherwise valid histories; it must
not claim the live-anchor guarantees deferred to E2c. Corruption tests use only
isolated private evidence models or copied-module faults.

Derive each terminal from the saved file: inputError first, yielding its exact
harness-error/input/reasonCode; otherwise first debt's status/reasonCode at
preflight. All remaining debts stay on selection. Never accept caller status,
reasonCode, ordinal, lane, nonce, record or receipt. A Module include failure
therefore gets input error before module debt. Null-slot files receive no
attempt. All actual policy attempts are nonpass and unexecuted.

Construct the whole candidate attempt and candidate history; validate all
selection/history invariants and safe integer counters before one private state
replacement. On failure, inspect/report bytes are identical, the next valid
attempt uses the original next ordinal, and the ledger remains usable. Native
allocation failures are not stable API error codes and must not be converted to
success; no partial state publication. With no await or user callbacks, calls
serialize in actual invocation order; different slots may appear in any order.
Cancellation means no call/no terminal/no consumed ordinal. No cancel API,
skip status, synthetic receipt or inferred success is added.

## Report, exactly

Own keys, in serialization order: lane, selectedFiles, plannedVariants,
executedVariants, testBodyEvaluatedVariants, unplannedInputErrors, completed,
missing, attempts, counts, passedFiles, files, excludedFixtures, complete,
passOverPlanned, conditionalPass, exitCode. counts keys, in order: pass, fail,
unsupported-feature, unsupported-profile, harness-error, resource-limit, timeout,
host-fault. Every key is always present. Every file has {path,manifestId,statuses,
inputError,passed}; statuses is null for null slots, otherwise ordered
{slotId,variant,status}, where missing status is null. inputError is always null
or its full exact input record. excludedFixtures remains [].

Count selectedFiles including null-slot files, plannedVariants all known slots,
unplannedInputErrors all null-slot files, completed slots with any attempt,
missing=planned-completed. Count only first attempt statuses/flags; attempts
counts all attempts. Neither retries nor reordered completion alter file/slot
report order or headline. executedVariants and testBodyEvaluatedVariants are
always zero here. passedFiles requires nonempty slots, no input error and all
first-pass; hence zero here. complete iff unplannedInputErrors=0 and missing=0.
passOverPlanned is null until complete, then {numerator:counts.pass,
denominator:plannedVariants}. conditionalPass is null if pass+fail=0, otherwise
{numerator:counts.pass,denominator:counts.pass+counts.fail}. No rounding/string
percentages. Exit 2 incomplete; 1 complete with any nonpass; 0 complete all-pass
(unreachable E2). No complete zero-slot selection, 0/0 or merged-lane ratio.

Each actual lane: initial 33 files/60 planned/0 completed/60 missing/0 attempts,
all counts0/complete false/full null/conditional null/exit2. Final 60 completed/
0 missing/60 attempts, feature19/profile41/all other counts0/complete true/
full0/60/conditional null/exit1. Partial reverse/order/retry sequences and every
file/status/ID are literal evidence, not totals alone. Input-error fixtures
retain full denominator and demonstrate both complete harness-error and
incomplete null-slot cases. E3's all-status and fail-then-pass first-headline
examples remain requirements only; E2 has no way to make those records.

## Evidence and acceptance boundary

New evidence separates actual existing APIs (both current E2a plans, v1 boundary,
retained host records) from the private proposed E2b state model. No model token
is production authority. Full immutable literals, malformed operations and
schema mutations, retry/out-of-order histories and fresh-frozen checks must be
translated into real public API tests in E2b. A successful model does not
validate a missing production module. Actual failed-creation and internal
atomic-failure paths require isolated copied-module fault controls without any
public injectable inspector/state accessor. Cross-instance controls must include
both planner and ledger distinctions described above.

The future host-only validation runs new E2b tests, migrated E2a eight groups/24
traces and complete projections in isolation, E1 unchanged133, affected v1
host73, Script decoders21, observations22, runner20 and typecheck. No unchanged
native rebuild/probes. Preserve retained212 both lanes/71 static gates/full60
blocked/C++; actual/independent audit and second review before implementation
or acceptance. This candidate stops after a coherent design/evidence commit.
