# TS-035E3-P: execution receipts and admission ownership

Design candidate against `3cbb301`, 2026-11-05. This document is not an execution
grant. Only E3a below has exact implementation proposals. E3b and F require new
assignments and review. E1 remains byte-exact empty; both actual lane selections
still contain 60 blocked variants (19 unsupported-feature, 41 unsupported-profile).
212 guest records per lane and 71 native gates are retained prior evidence,
not rerun here. C++, old tests, historical evidence and production are unchanged.

## Decision and smallest slice

Keep classification in `tools/test262/script-result.mjs`. Add a data constructor
there, using its existing private `classification` function. Do not export the
classifier or reproduce it in a launcher/ledger. A complete, valid conformance
envelope is still forgeable data; it never establishes admission or transport.

**E3a proposed assignment:** exactly two whole-file replacements in
`validation/ts-035e3-p/proposal-manifest.json`, one new
`tools/test262/script-compose.test.mjs` (complete bytes in `proposals/`), new
evidence and task status. The replacements are `script-result.mjs` and
`script-observe-codec.test.mjs`. No other migration is authorized. The latter
currently asserts the entire old source, not merely the C/D predicate. Its
replacement keeps that complete prefix comparison and checks the complete new
suffix literally and by SHA256. The driver decoder is still compared in full.

`composeScriptEnvelope(json, context, binding)` takes exactly three arguments.
`json` is string/Buffer, fatal UTF8, at most 65536 bytes, strict JSON without
duplicate/unknown keys. It contains exactly `{identity,inputs,evidence,observation}`,
with the existing A schema; identity.mode must be conformance. Context and binding
have the existing trusted-host data contract of `assertScriptContext`; they are
not an opaque capability or a new untrusted-object interface. There is no claim
that existing validators refuse all getters or Proxy traps. The JSON argument
cannot execute getters. Binding may be null only where existing not-run rules
allow it. Caller-supplied classification is rejected, including a correct one.

Order: arity; context shape; JSON decode/duplicate/size; exact draft shape;
conformance mode; copy expectedNegative/blockers into an internal provisional
classification; existing `checkCore`; existing `classification`; complete wire
serialization and existing `parseScriptEnvelope` (including the final 65536-byte
limit); existing `assertScriptContext`. The provisional values are never returned. Failure throws
under the existing codec contract (no new error-code promise). Success returns a
new full envelope; identity/inputs/evidence/observation are JSON-owned, classification
metadata is detached from context. It is not a frozen authority token. No IO,
registration, token, spawn, state, admission decision or classifier copy.

E3a acceptance: exact proposal hashes; new literal/negative/all-status tests;
unchanged A decoder tests and C codec/live-codec tests, in isolated output areas
if a test writes evidence; new construction output equals frozen full literals;
original prefix/classifier unchanged; preservation verifier. Existing A test
`serialized()` launches retained binaries, so it was deliberately not invoked
for this design. Its required implementation validation is distinct from the
offline fixture decode reported here. No full native build is needed for E3a.

## Actual ownership and callsite closure

The 108-file source/import/export inventory is `validation/ts-035e3-p/closure.json`.
`preservation.json` pins 6703 tracked files excluding this task's own outputs,
TASKS and coordinator-owned COORDINATION. This inventory is review evidence,
not the future execution closure hash. Relevant actual paths are:

| Owner | Current callers / facts / authority boundary |
|---|---|
| `input.mjs` | planCorpus verifies manifest/pin/bytes/metadata/ordered includes; E1, E2a and C call it. Includes can fail after variants exist; retain inputError, null slots versus empty failed harness. Module slots are never forced into Script codec. |
| `script-capabilities.mjs` | readScriptCapabilities accepts only canonical empty bytes; reconstructScriptDebts delegates existing blockers and always appends runtime:coverage. H7, D rules and observation controls cannot clear this debt. |
| `script-plan.mjs` | three exports prepare/inspect/assertCurrent; lexical selections WeakMap; E2 policy v4 has exactly 242 closure files and execution:null. Closure covers input, E1, E2, manifest, package/lock, Node and YAML. It does **not** cover the C adapter or compiled engine. |
| `script-ledger.mjs` | lexical ledgers/consumed/stores/checkpoints/ownership; eight exports; E2 policy-only kind/version exact validation. Only appendScriptPolicy mutates attempts. Checkpoint/reopen transfers policy owner and revokes old handle. No receipt map exists. |
| `script-observe.mjs` | prepare/validate/launch observation exports; private plans, closure, bind, contextFor, artifacts, preflight, processAttempt, compose. Public plan/result copies expose data, not receipt authority. Closure covers source/build/C/decoders/input/Node/YAML, but omits E1/E2. |
| `script-result.mjs` | private classification, shape/core/binding checks; parse/validate/assert/inspect exports. inspect can return a two-field fault summary. E3a adds construction only; every existing predicate remains byte-identical. |
| `script-driver-result.mjs` | independent binding/request/source/operation/inspection decoder; no classification or receipt minting. Both decoder paths remain required. |
| `src/script-observation-driver.ts` | rejects argv mode other than script-observation before reading source; validates triples, reads files, calls observeScripts, writes child JSON; faults exit70. A parent-only mode switch cannot produce a conformance child. |
| `src/script-observation.ts` | ObservationState envelope hardcodes mode script-observation; observeScripts uses bounded Script preparation/session/throw-inspection and serializer types. No conformance owner exists here. |
| `script-throw-inspection.ts` / execution internals | actual original completion, active Realm and source anchor ownership. Preserve original/secondary sites and finally restoration; no host reconstruction from names or messages. |
| `src/script-observation-json.ts` / types | ChildV2 supports a mode union but actual producer does not expose conformance. Seven limits are closed by both decoders; steps/calls come via argv, sourceUnits=100000/parseDepth=128/evaluationDepth=256 fixed, wall/output parent-owned. |

Direct host consumers include A decoder tests, C observation integration and
input/preflight/launch/live-codec/codec tests, all four D dispatch tests, and E2
ledger/checkpoint tests. The exact-source comparison in C codec is the only
old-test byte migration for E3a. E2's 242-file policy does not include result;
therefore E3a neither changes its ID nor rewrites its selection literals. C's
adapter digest does include result: any old C plan becomes stale after E3a,
and a newly prepared observation gets the changed digest naturally. Never
overwrite old observations to make their provenance look current.

The child producer restriction is a material dependency, not a reason to widen
E1 or change C's mode in this task. Before any authentic conformance path exists,
a separately reviewed producer assignment must cover both driver and producer,
its full test/native-gate closure and profile semantics. Exact proposals for
those files are intentionally **not frozen** here. No synthetic positive in
this evidence claims that path exists today.

## Parent owner and private lifecycle (E3b target, not E3a permission)

Choose co-location in `script-observe.mjs` for future execution-session,
transport-receipt and admitted-ledger WeakMaps. Keep its observation API and
maps separate. This gives the function that observed spawn/data/exit/close
events direct lexical access to mint and append. E2 policy maps remain in
`script-ledger.mjs`; they are not reused or widened. Do not move privileged
minting into a publicly importable helper. Reject a callback registration,
injected verifier, exported mint/register/import/loadReceipt, test-only export,
symbol constructor or JSON credential. A different module split requires a new
ownership review; conventionally named “internal” exports are not private.

Intended public operation shape is a single parent-owned execute-and-record
operation on an opaque execution owner plus a slot ID and optional retry reason;
it returns a detached report, never an unspent receipt. Receipt production and
append are lexical steps. This avoids a public append accepting foreign
envelopes. Exact export names/argument schemas are deferred until F selection
and producer closure are reviewed; they are not an assignment hidden in this
document. The state/ordering below is mandatory regardless of spelling.

1. Validate descriptor-only ordinary arguments before reading values; reject
   accessors/symbols/extras/sparse arrays. Do not promise to detect arbitrary
   Proxies; no guest objects cross this host API. Authenticate owner, check
   revoked/busy/pending, resolve slot, reject input-error/Module/blocked/debts.
   Validate retry policy and reserve owner synchronously before the first await.
2. Resolve fixed reviewed registry entries, reread E1/input/complete closure and
   stable binding; no caller supplies entries, certificates, source or verifier.
   Recheck after preflight, before spawn and before append. Any drift fails
   closed. Reserve next attempt but do not add a terminal on cancellation.
3. Allocate fresh nonce/request/preflight and exclusive artifact paths. The
   parent owns argv, exact units/source snapshots, hashes, process events and
   streams. Refuse symlink/junction/hardlink aliases and preexisting results.
4. Decode actual child with saved binding, construct the full envelope through
   the shared constructor, assert full saved context and independently inspect
   saved transport. Require the returned object to equal the full envelope.
   A summary `{status,reasonCode}` is never wrapped into a receipt. Parent
   timeout/crash/output/protocol observations are built from private facts and
   then pass the same full-envelope checks; they do not borrow child provenance.
5. Finish and verify mandatory parent artifacts, reread final ownership/closure,
   privately mint a receipt and synchronously validate/append/spend without an
   await, callback, caller getter or externally visible intermediate state.
6. Publish detached inspection/report. Persisting the ledger is separate from
   spending. Failure cannot refund, delete or replay a committed receipt.

Only one reserved operation per owner; different slots on that owner serialize.
Parallel owners have distinct run IDs and receipt maps/owner links. Cancellation
before spawn or after a kill leaves an unfinished attempt record in the archive,
no terminal and no receipt; retry gets a fresh execution nonce. A retry reason
is required only after a committed first terminal. Archive execution IDs remain
unique even if an uncommitted terminal attempt number is reused.

## Exact data that must survive

Use a new `ledgerVersion:3, kind:"script-execution-ledger"`. A policy v2 ledger
cannot be cast or upgraded in place. A future selection uses
`selectionVersion:3, kind:"script-execution-selection"`; it must retain every
original selected file and variant, original metadata, debt provenance and
explicit per-slot decision. Original E2 selection bytes/hash remain an anchor,
not a new execution grant. Its full schema/registry decision format belongs to
the deferred admission assignment. This version choice prevents accidental
mixing now; it does not authorize a reader that accepts arbitrary version3 JSON.

An execution attempt is exactly `{sequence,slotId,attempt,retryReason,terminal}`.
Sequence is global contiguous append order; attempt is contiguous per slot.
First retryReason=null; later nonempty non-whitespace string. A transport terminal
has `{kind:"transport",status,reasonCode,processStarted,testBodyEvaluated,receipt}`.
Status/reason come from receipt.envelope.classification, not caller input.
Policy terminals retain the E2 policy fields and false execution flags; they
may count blocked slots but may never contain receipt/context/binding/child.

Receipt evidence retains the previously required exact payload:
`{receiptId,runId,slotId,attempt,selectionSha256,context,binding,transport,artifactHashes,envelope}`.
The lexical receipt entry additionally holds its owner identity, execution ID,
processStarted, spent state, stable binding and complete artifact manifest.
These private anchors cannot be restored from the payload. All hashes below
are SHA256 except upstream git blobs/revision/engine commit, which are 40hex.

| Component | Closed fields / comparison |
|---|---|
| context | identity, inputs, expectedNegative, blockers. Entire nested structures equal the saved context. Metadata and admission decision additionally match selected slot; empty blockers alone is insufficient. |
| identity | schemaVersion, runId, mode, corpusRevision, manifestSha256, path, blob, sourceSha256, variant, goal, lane, engineCommit, engineBuildSha256, adapterSha256, policySha256, dirtySourceSha256. Preserve nullable dirty source exactly. |
| inputs | units, transformedSourceSha256, profileId, capabilityLedgerSha256, host, platform, toolchain, limits, requestSha256, preflightId, realms, ruleRegistrySha256. No inferred null replacement. |
| binding | nonce, requestSha256, mode, variant, units, realms, preflightId, action, limits, sources. Exactly the existing decoder shape. Canonical request order remains requestVersion,nonce,mode,variant,units,realms,limits,preflightId,action. |
| limits | sourceUnits,parseDepth,steps,calls,evaluationDepth,wallMs,outputBytes; zero remains a value, not defaulting. Fixed limits and wall upper bound retain existing checks. |
| each Unit | id,ordinal,role,path,blob,sourceSha256,transformedSha256,byteLength,sourceUnits; exact ordered occurrences, even repeated includes. UTF16 length is not byte length. |
| each source / Realm | {unitId,transformedText}; {id,profile:"script"}. Preserve full text for hash/location checks, all registered Realm descriptors and exact IDs. |
| transport | process:{exitCode,signal,deadlineExpired}, outputBytes,outputLimit,capCount,capKilled,crashBeforeCap. All six inspect arguments, not a summary. |
| evidence | stage,operation,source,testBodyEvaluated,harnessValidated,preflightId,completedUnits,inspection,process,stdoutSha256,stderrSha256,elapsedMs. Preserve actual operation phase separately from throw phase. |
| observation | full existing union; original valueKind/origin/site, constructor outcome/name/Realm/secondary and optional diagnostic; inspection.original and inspection.operation remain intact. No matching by diagnostic. |
| artifactHashes | stdoutSha256,stderrSha256,childSha256 (nullable missing child). These are hashes of retained file bytes. Separate manifest binds paths, lengths, missing/present state, exclusive parent artifacts and preflight control evidence. |

**Important actual artifact distinction:** C hashes all pipe bytes while retaining
only through the first cap-crossing chunk. Therefore envelope stdout/stderr
digests can differ from hashes of retained stdout.bin/stderr.bin after a cap.
Do not demand false equality or silently relabel one hash. Preserve streaming
digests in evidence, retained-byte digests in artifactHashes, and total/retained
lengths in the private manifest. The archive must record both with explicit
names in a separately reviewed schema. A digest of JSON(child) is not the hash
of actual child file bytes. The synthetic model's child hash is labeled model
data and is not evidence of a real artifact.

Stable certification binding excludes run ID, nonce, execution ID, receipt ID,
attempt, retryReason, elapsed time, output hashes and preflight *result* ID.
It includes exact pin/manifest/path/blob/source/transformation/variant/goal,
five metadata fields, ordered full harness occurrences and units/source texts,
seven limits, lane/host/platform/toolchain, engine commit/source/build/adapter,
profile and host-services descriptor, runtime registry/rule registry, preflight
control-source digest and Realm/profile layout. Stable binding is canonical
data plus a digest, never only a digest. Fresh attempt binding adds all excluded
execution identities, actual preflight bundle/result and complete decoder
context. Equal raw/non-strict bytes do not make variants interchangeable.

Host services currently have no independent descriptor in C; F must freeze one
with its implementation closure and literal tests. The existing C key contains
rule:null/capability:null and observation profile, so it cannot certify the new
stable binding. E2 v4 and C closures must both be covered, plus new parent owner,
registry policy and codec constructor, actual source/build/driver/control files,
package/lock, toolchain executable identities, YAML and fixed fixtures. Never
combine the two existing summary hashes and claim this closes omitted files.

## Parent priority, provenance and partial results

Priority is cancellation => unfinished; otherwise deadline => timeout/deadline;
crashBeforeCap or non-cap signal/nonzero exit => host-fault/crash; output crossing
=> resource-limit/output; explicit spawn failure => host-fault/spawn where no
higher fact wins; invalid/missing/oversized/duplicate/invalidUTF8 child =>
host-fault/protocol; otherwise the shared classifier. These are the current C
and inspect ordering, not a new race policy. Freeze event ordering and kill
success in the future real parent tests; capKilled=false with a signal is crash.

processStarted is the parent's actual spawn event. It is not exitCode!==null,
stage=test, a marker, a JSON field, or body entry. C currently retains `spawned`
only in transport.json and does not return it in `facts`; rereading that public
file is not authority. Future owner must retain the event lexically. Body entry
is true only for a validated child test/body operation. Timeout/crash/output
parent-only envelopes retain operation/source/inspection=null and body=false,
even if diagnostics suggest a body began. Instantiation can satisfy a runtime
negative while body=false. Harness execution never counts as test body.

Child absent after a completed transport can produce a full protocol terminal
with childSha256=null, complete parent artifacts and no invented child evidence.
Malformed retained child bytes have a nonnull raw-file hash. Failure to save
stdout/stderr/transport/context/request/manifest/record means no receipt; retain
partial evidence and unfinished state. Do not turn an archive IO failure into
a corpus pass, infer a receipt from a surviving record, or mint on a summary.
Preflight failure is likewise a parent preflight terminal only when the future
schema can bind the failed control bundle separately from the unentered test;
it must never transplant the control child's units/Realm/source into test
evidence. This specific artifact schema is deferred before E3b implementation.

## Append ownership, atomicity and persistence

Error order for the eventual authority operation is arguments => owner identity
=> owner revoked/busy/pending => slot existence => admission/input/debts/goal =>
retry policy => private receipt identity/unspent => receipt owner/run/slot/attempt
=> full stable/attempt context => full transport/artifact/envelope validation =>
complete candidate history/report validation => synchronous commit. Public
execute-and-record reaches receipt checks internally; there is no public mint.
On each reject, exact prior history, counters, report, receipt spent state and
checkpoint state remain unchanged. Authentic receipt rejected for wrong owner
or stale context is not consumed; it still cannot bypass the underlying fault.

Construct next immutable history before committing. Commit appends once and
marks the lexical receipt spent in one synchronous, non-reentrant section.
Do not await between those operations or call public serializers/getters.
Do not make a receipt available outside the owner before this section. Replaying
the same token, copied token, byte-identical JSON, receipt ID, or previously
used request does not add an attempt. Owner creation/revocation must also track
all receipt IDs/execution IDs to forbid accidental duplicate private minting.

E2c's create/checkpoint/resolve/reopen only recognize policy v2. They must reject
new execution tokens, and execution operations reject E2 ledger/store/checkpoint
tokens and revoked owners. Reopening a policy checkpoint never restores a
receipt map, grants admission or resets spent state. E3 execution ledgers have
no checkpoint/reopen API in the proposed first slices. If later persistence is
added, it needs a separate owner/epoch design retaining spent high-water marks,
pending locks and immutable full bytes. Disk failure after a successful append
leaves the receipt spent and history dirty; restart remains unsupported.
No JSON load or hash-valid ledger can recover authority after process loss.

## Reports and literal acceptance matrix

All eight status keys remain in order: pass, fail, unsupported-feature,
unsupported-profile, harness-error, resource-limit, timeout, host-fault. Full
reports retain lane,selectedFiles,plannedVariants,executedVariants,
testBodyEvaluatedVariants,unplannedInputErrors,completed,missing,attempts,counts,
passedFiles,files,excludedFixtures,complete,passOverPlanned,conditionalPass,exitCode.
For execution ledgers executedVariants counts first terminals' processStarted;
policy terminals contribute zero. First terminal alone determines all headlines,
status, file pass, process/body counts. Retries only increment attempts; a later
pass never erases first fail/timeout/host fault. File passes only if every planned
variant first-passes and inputError=null. Unknown slots retain statuses:null and
unplannedInputErrors. No cancellation terminal; missing remains in denominator.
Complete requires zero unknown errors and every planned slot terminal. Full
ratio exists only when complete, denominator all planned; conditionalPass is
pass/(pass+fail) only if that denominator is nonzero. Incomplete exit2; complete
all-pass exit0; other complete exit1. Mixed v1/v2/v3 history rejects.

`run-hg5gHL/actual-denied.json` has full actual initial/final selections and
reports for both lanes. `report-literals.json` contains all 13 complete retained
E2-P arithmetic requirements, explicitly labeled synthetic, not fresh admission.
The following matrix distinguishes measured rows from mandatory future tests.
Future rows must freeze full input, candidate and unchanged-after-reject snapshots
before implementation, not merely assert two status fields.

| ID / input | Literal outcome / current evidence |
|---|---|
| R01 real E1 node/native | 60 blocked; full final completed60/missing0/attempts60/executed0/body0/feature19/profile41/pass0; initial missing60/complete false/full ratio null/exit2. Measured actual APIs. |
| R02 forged envelope, {}, cloned token, JSON token | E2 append fourth argument => script-ledger/arguments; inspect => script-ledger/token; unchanged history. 16 actual denied controls across both lanes. |
| J01 154 frozen A child/envelope rows | Existing child/full decoder and proposed constructor equal every complete expected object. Retained synthetic literals, offline replay; no fresh engine lane claim. |
| J02 each context identity/input field replaced; each binding top key removed | 38 complete rejected mutations retained. No append or authority. |
| J03 original/secondary/inspection/unit/Realm/source/limit/ordered include neighbors | 2392 recursive required-field deletions across 15 full representative literals pass in extended-nllRUL; binding deletions reject through both decoders. Full originals plus exact deletion paths retained. This supplements existing A/C evidence, not a new language result. |
| P01 deadline+crash+cap+malformed | exactly timeout/deadline summary, no receipt. |
| P02 crashBeforeCap+cap+malformed | exactly host-fault/crash summary, no receipt. |
| P03 capKilled+cap+malformed | exactly resource-limit/output summary, no receipt. |
| P04 malformed alone | exactly host-fault/protocol summary, no receipt. Four actual inspect controls. |
| O01 forged/clone/JSON/cross owner/run/slot/attempt/selection hash | Private lexical model rejects unchanged; production admitted witness unreachable. |
| O02 partial context/binding/transport/artifact/envelope | Private model rejects unchanged. Future real archive must test each missing/truncated/aliased file and late write/close failure. |
| O03 busy/revoked/first reason/retry missing reason | Private model rejects unchanged and unspent. Full future compound error-order literals deferred with authority API. |
| O04 success, replay, retry, persistence failure | Private model appends/spends once; replay rejects; no revival after simulated persistence failure. No actual durable IO claim. |
| O05 duplicate private receipt ID/request, stale closure after await, reordered simultaneous completions | Mandatory future private-owner tests; public entry remains deny-only until F. No current production positive claimed. |
| K01 E2 checkpoint reopen => old policy owner revoked | Accepted E2c evidence remains unchanged. Future cross-token matrix must reject execution/receipt tokens in all eight E2 exports and policy/store/checkpoint tokens in execution owner API; no receipt transfer. |
| H01 all eight statuses/first fail then pass/missing/cancelled/unknown slots | Complete retained report literals, independently checked offline; full original denominator and first headline preserved. |
| H02 actual spawn failure vs spawn+timeout; instantiation throw vs body throw | Future actual parent witnesses required with original event/artifact provenance; fixtures cannot prove processStarted. |
| H03 persisted append failure and restart | Spent remains spent in current process; restart rejected. No durability promise; separate assignment required. |

## Deferred slices and audit stop

After E3a review, freeze E3b only when the producer, stable admission selection,
host-services/preflight/archive schema and full old-file/test migrations have
concrete proposals. That task must resolve actual argv/producer mode together,
close source/build/adapter/policy ownership, and preserve C observation behavior.
Its nonempty-registry controls may use lexical/private copied models, never a
production registration seam. F alone can review per-file/variant evidence and
activate entries/launching. Durable restart and execution checkpoint authority
are another separate design. This order avoids an unreachable “successful
receipt” test masquerading as production authority.

This design intentionally does not freeze a speculative receipt API or pretend
those deferred schemas are complete implementation permission. Actual source
inspection established why they cannot be a small host-only change. Stop after
the coherent design/evidence commit for coordinator actual audit and independent
second review. No publication or successor assignment by this writer.
