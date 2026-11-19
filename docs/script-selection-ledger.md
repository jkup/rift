# TS-035E2-P: trusted selection and ledger boundary

Design candidate against accepted `51bf64d`, 2026-11-05. This document and its
offline evidence require actual and independent second review. It grants no
execution authority. E1 stays empty; all 60 pinned slots stay blocked. No
production, historical evidence, existing test, CLI, compiler or C++ edit is
proposed by the first slice.

## Decisions and ordered implementation boundaries

1. **E2a: trusted immutable selection only.** Add
   `tools/test262/script-plan.mjs` and `script-plan.test.mjs`, plus new E2a
   evidence and its task status. Export only `prepareScriptSelection(options)`
   and `inspectScriptSelection(token)`. No ledger, disk writer, launch, receipt,
   generic import, classifier export or test injection. This is the smallest
   implementable slice proposed for acceptance here. It must pass independent
   review before E2b is assigned.
2. **E2b: blocked policy ledger in memory.** Separate review/assignment adds
   `script-ledger.mjs` and `.test.mjs`. It consumes the E2a inspection API (which
   first authenticates the opaque token), constructs parent policy terminals,
   and reports. No wire record or transport receipt can be appended. Keeping
   this separate exposes selection defects before mutable history is added.
3. **E2c: durable checkpoints with process-local reopen authority.** Separate
   assignment adds `script-ledger-store.mjs` and `.test.mjs`. No writable import
   from JSON or restart resume. A private checkpoint handle is required for
   reopen. Disk hashes alone are never authenticity proofs.
4. **E3: conformance transport receipt bridge.** Still separate design and
   implementation work. Current C plans are observation-only; changing the
   mode or copying their private functions is forbidden. Nonempty runtime
   certificates and conformance launching remain F work, not E2 acceptance.

E2b/c and the E3 contract below are reviewable design targets, not permission
to implement them as part of E2a. No existing-file migration is needed for
E2a; all old files have whole-file identity proposals in `preservation.json`.
E2b/c will additionally own the then-existing script-plan policy-closure list
and its new tests; exact whole-file proposals against accepted E2a are required
before those assignments. No permission to migrate an unknown future file is
inferred from this design.
Any later E3 edit to C/decoders/classification requires exact whole-file
proposals and the then-current old-test closure before assignment.

## Actual callsites and why an outer format is necessary

`input.mjs:planCorpus` validates lane, fixed manifest, nonempty unique selected
paths, then each file's pin, bytes, metadata and includes. It creates variants
after `compareMetadata` and **before** include verification. A failure during
includes leaves both variant records with `harness:[]`; it does not expose a
verified include prefix. E2 must preserve this distinction and must not claim
that empty harness means successful raw input. A failure before variant
creation leaves `variants:null`. E2 does not infer variants from the manifest
after a metadata error. Unexpected host exceptions reject the entire prepare
call; InputError files remain in the returned denominator.

`plan.mjs:prepareSelection/preflightRecords/main` creates v1 contexts and blocked
records, persists selection first and appends them through
`ledger.mjs:newLedger/appendAttempt/report/persist`. These functions remain v1
only and unchanged. The mutable v1 ledger is not a suitable v2 authority.
`persist` flushes a temporary file and renames; it has no authenticated reopen,
directory sync, transaction across report and ledger, or checkpoint handle.

`script-capabilities.mjs:readScriptCapabilities` reads only fixed canonical
empty bytes. `reconstructScriptDebts` takes exactly the five-field metadata
projection, variant and verified manifest ID, returns immutable ordered debts,
and always appends runtime:coverage. Neither export grants a launch.

`script-result.mjs:identityShape/negativeShape/checkCore` admits Script only,
strict/non-strict/raw only, parse/runtime negatives only. Module/resolution
cannot fit that wire. `script-driver-result.mjs:bindingState` independently
closes the child variants. **selectionVersion:2 is an outer format, not
schemaVersion:2 wire compatibility.** A Module slot retains Module/module and
its actual metadata (including resolution if present); its terminal is parent
policy data with no binding, context, child, envelope, or fabricated Script
identity. Use the same policy terminal arm for blocked Scripts as for Modules.
There is no need to synthesize v2 not-run envelopes just to count them.

`script-result.mjs:classification` prioritizes resource/unsupported over
blockers. Both actual decoder and context checks can accept a structurally
valid executed unsupported/resource result with blockers. E2b rejects transport
on every blocked slot **before** considering classification, including timeout,
host fault, unsupported and resource outcomes. Decoder acceptance is not
admission. Actual witnesses and v1/v2 rejection controls are retained below.

`script-observe.mjs:prepareScriptObservation/validateScriptLaunch/
launchScriptObservation` own a WeakMap, source/build rechecks, parent facts and
one-use launches. Its `closure`, `bind`, `contextFor`, `compose` and `preflight`
are private; its output lacks conformance classification. C's adapter digest
omits E2 and therefore cannot identify E2 policy. The core C serializer,
`src/script-observation.ts:observeScripts/observeScriptControl`, facade and D1–D8
rejection dispatch stay unchanged. Five diagnostic rules are not runtime grants.

The machine closure inventory lists imports, exports and callsites for these
modules, both decoder tests, v1 input/ledger/plan tests, C observation tests,
E1 tests, manifest, package/lock and retained validation. Existing 212 guest
records per host and 71 static gates are retained evidence, not freshly run.

## E2a exact API and immutable selection schema

`prepareScriptSelection(options): Promise<SelectionToken>` takes exactly one
ordinary non-Proxy data object with exactly `{root,revision,lane,paths}`.
root is a nonempty string (no trimming); revision is a nonempty string, lane
is node/native, paths is a nonempty dense ordinary array of unique nonempty
strings. Descriptor checks precede reads: reject own accessors, symbols, extra
keys, sparse arrays, exotic prototypes and extra array properties without
calling getters/iterators. Follow E1's descriptor enumeration, not caller
array methods. Proxies remain outside the host-data contract. Copy paths before
the first await. Caller mutations after return or while IO runs cannot change
the copied request. root denotes the existing local exact-byte export; no
network, cache, environment override, injected IO/registry/selection/build or
optional verifier is accepted. Path membership and pin failures retain unchanged
planCorpus semantics; do not silently sort, trim or deduplicate.

Preparation order: validate arguments -> first fixed E1 authority read -> first
policy closure hash -> unchanged planCorpus with copied arguments -> project and
reconstruct debts -> second fixed E1 authority read -> compare authority ->
second policy closure hash -> compare closure -> publish token. Each operation
is awaited and checked before the next; the second reads are not parallel.
A mismatch rejects, never returns partial trusted state. Manifest ID comes
from the returned verified file and pinned manifest, never metadata matching.
Every variant's metadata is copied as E1's exact five fields; all debts are
reconstructed even for include-failure slots. No caller `blockers` is consumed.
No debt is removed. Known variants always have at least runtime:coverage.

Tokens are fresh frozen empty ordinary objects, stored in a private WeakMap.
`inspectScriptSelection(token): Selection` requires exactly one authentic token
and returns a fresh detached deep-frozen copy each time. JSON `{}`, a token
from a second module instance, cloned tokens, or an inspection object reject.
Successful inspection is read authority only; there is no launch token hidden
in the JSON. The planner never mutates/freezes caller objects.

Errors are native Error without fields, message `script-plan/<code>`.
Precedence follows the sequential operations above: arguments (arity/object
descriptors), options (field types, dense paths, duplicates/empty), authority
(first reader failure), closure (first IO/hash failure), selection (planCorpus
throws rather than returned InputError), debts (projection or E1 failure), then
the second-check table below. Unknown token/arity
for inspection yields `script-plan/token`/`script-plan/arguments`. Returned
per-file errors retain exact input reason codes; they are not thrown exceptions.
Wrong but nonempty revision therefore yields per-file revision-mismatch, as now.

| Second-check operation | Exact failure | Later operations |
|---|---|---|
| Fixed authority reader rejects (unreadable or invalid/noncanonical bytes) | `script-plan/authority` | No authority comparison, closure read or token publication |
| Reader succeeds but detached authority differs from first snapshot | `script-plan/drift` | No closure read or token publication |
| Authority agrees; closure hashing rejects (unreadable file, alias, enumeration/hash failure) | `script-plan/closure` | No closure comparison or token publication |
| Closure hashing succeeds but ordered file list/hashes or aggregate digest differ | `script-plan/drift` | No token publication |
| Both second checks succeed and agree | Success | Publish fresh token only now |

Compare complete authority records and complete closure records, not object
identity or only their claimed digest. The authority reader enforces canonical
empty E1 bytes on both calls; a successful differing authority is unreachable
with accepted E1. Its explicit drift guard is defensive, and literal model
controls for it do not authorize alternate registry bytes or an injected reader.
If authority and closure would both fail, the second authority failure wins and
closure is not attempted. If authority differs and closure would be unreadable,
drift wins and closure is not attempted. Unreadable closure produces closure,
not drift: no successful comparison exists. A change after the second authority
read that is observed by closure hashing produces drift. There is no retry,
fallback or partial token on any failure; a locally assembled inspection stays
private until both checks pass. The initial-stage errors likewise stop before
all subsequent operations. The process assumes no hostile concurrent host/file
writer; these checks do not claim an atomic filesystem snapshot.

All JSON records below have **exactly** the listed keys; no optional fields.
All arrays are dense, all integers safe/nonnegative unless noted, all hashes
lowercase hex (40 for Git blobs/pinned revisions/commit, otherwise 64), all strings
nonempty unless explicitly allowed. Inspection data contains no undefined,
NaN, Infinity, symbols, classes, getters or source-text executable callbacks.
**Exception: Selection.revision is the exact arbitrary nonempty requested
string, not a hash-validated pinned revision.** Preserve `"wrong"`, whitespace
and all other nonempty strings unchanged; a mismatch to REVISION gives every
selected file null slots and input/revision-mismatch. Do not replace it with
the pinned revision or reject it under the general hash rule. Only selections
whose requested revision equals REVISION can acquire known slots; their IDs
still use the fixed pinned REVISION. The fixed corpus pin remains Hash40.

```text
Selection = {
  selectionVersion:2, kind:"script-blocked-selection", runId:UUID,
  revision:string, manifestSha256:Hash64, lane:"node"|"native", cache:false,
  authority:{registryVersion:1, registrySha256:Hash64, entries:[]},
  policy:{id:"rift-script-blocked-v2", closureSha256:Hash64,
          files:[{path:string,sha256:Hash64}], host:string,platform:string},
  execution:null, files:[SelectedFile], excludedFixtures:[]
}
SelectedFile = {ordinal:integer, path:string, manifestId:string,
                inputError:null|InputError, slots:null|[Slot]}
InputError = {status:"harness-error",stage:"input",reasonCode:string}
Slot = {id:string,ordinal:integer,fileOrdinal:integer,path:string,
        manifestId:string,lane:"node"|"native",variant:Variant,goal:Goal,
        blob:Hash40,sourceSha256:Hash64,byteLength:integer,
        transformedSourceSha256:Hash64,metadata:Metadata,
        harness:[{path:string,blob:Hash40,sha256:Hash64}],
        harnessState:"verified"|"input-failed",debts:[Debt],admission:"blocked"}
Metadata = {flags:[string],features:[string],includes:[string],locale:[string],
            negative:null|{phase:"parse"|"runtime"|"resolution",type:string}}
Variant = "strict"|"non-strict"|"raw"|"module"
Goal = "Script"|"Module"
Debt = E1's exact {id,status,reasonCode,authority}
```

IDs are unchanged `${REVISION}:${path}:${variant}:${lane}`; file ordinals follow
selected path order, slot ordinals are globally contiguous starting at 0, and
fileOrdinal points to its file. Module iff module; all other variants Script.
Per-file slot order is unchanged variants(metadata), never status order.
Each non-null slots array is nonempty. Null slots requires inputError; known
slots with inputError require harnessState input-failed and exactly empty
harness. Otherwise verified, including raw's genuinely empty harness. Do not
deduplicate ordered harness occurrences. Metadata is equal across a file's
slots; IDs, path/lane/blob/projection must agree with their file and manifest.
Selection files must be nonempty with unique paths/manifest IDs and slot IDs.
Unknown/fixture paths reject selection; excludedFixtures stays exactly [] in
this slice, since planCorpus does not call fixtureSelection. Empty selection
is never a vacuous 0/0 pass. Both lanes require separate tokens/run IDs/reports.

Policy files are sorted ordinally by normalized repository-relative POSIX
path; external Node is labeled `@node`, YAML files `@yaml/<relative path>`.
Hash each file's actual bytes, then SHA256 UTF8 JSON.stringify of the ordered
`[{path,sha256}]` array. Initial closure: input.mjs, script-capabilities.mjs,
script-capabilities.json, script-plan.mjs, pinned manifest, package.json,
package-lock.json, current Node executable and every regular file under the
resolved yaml package directory. Reject aliases/symlinks and duplicate labels;
no mtime/commit-only shortcut. E2b/c later add their own implementation modules
and version the policy ID if schema/semantics change. host=process.version,
platform=process.platform+'/'+process.arch. Registry hash is canonical E1 bytes.
execution:null explicitly means no engine/build/profile/limits/units/Realm,
rule authority, preflight or host-services execution binding exists; do not
invent hashes or null-filled wire contexts. runId is parent randomUUID.

## E2b ledger, parent terminals and attempts

Proposed exact exports: `newScriptLedger(selectionToken): LedgerToken`,
`appendScriptPolicy(ledgerToken,slotId,retryReason=null): void`,
`inspectScriptLedger(ledgerToken): Ledger`,
`reportScriptLedger(ledgerToken): Report`. No arbitrary record argument,
receipt constructor, selection loader or injectable authority. new authenticates
via inspectScriptSelection and snapshots before any terminal. Tokens/inspections
obey E2a ownership rules. First append must have null reason; retries require
nonblank string trim() but retain original text. Extra arguments reject.

```text
Ledger = {ledgerVersion:2,kind:"script-policy-ledger",selection:Selection,
          attempts:[Attempt]}
Attempt = {sequence:positiveInteger,slotId:string,attempt:positiveInteger,
           retryReason:null|string,terminal:PolicyTerminal}
PolicyTerminal = {kind:"policy",stage:"input"|"preflight",
                  status:"harness-error"|"unsupported-feature"|"unsupported-profile",
                  reasonCode:string,executed:false,testBodyEvaluated:false}
```

InputError wins over debts: known include-failure slots get input/harness-error
and that exact reason. Otherwise use preflight and the first debt status/reason.
Module gets preflight/unsupported-feature/module. Policy data is wholly derived
from saved selection; callers supply neither status nor reason. All debts stay
on the selection even when input error wins. No binding/context/wire fields
exist on this arm. An input failure with null slots has no attempt; the selected
file remains an explicit unplanned input error.

Global sequence is 1..attempts.length in actual append order. Per-slot attempt
is 1..N in that subsequence. Different slots may complete in any order; stored
history must preserve that order, not reorder by slot. Construct full candidate
state and validate it before one private state replacement; rejected append
must leave previous inspection byte-for-byte equal. Serialize concurrent
mutations per ledger; no async interleaving inside append. Unknown token, extra
arguments, unknown slot, empty debt, admitted slot, mismatched lane/version,
first-with-reason or retry-without-reason rejects. Policy retries are explicit
new attempts with identical derived terminals; duplicate policy calls without
a retry reason reject. newScriptLedger accepts a selection token only once per
module instance (a private WeakSet); failed creation does not consume it.
Cancellation creates no terminal and consumes no ordinal.
There is no skip/cancelled/pass substitute. Partial ledger stays incomplete.

## E3 receipt boundary (requirements, no bridge authorized)

E2 accepts **zero** transport attempts, even if all hashes and codecs validate.
Future receipt append requires a different ledger kind/policy revision with
explicit admitted slots and execution binding. The E2 exact schemas above
reject extra arms; do not silently widen them. A future discriminant must be
reviewed along with a complete schema migration. Thus the all-status oracle
is a future ledger requirements model, not an E2 production schema example.

The future internal receipt payload must preserve exactly `{receiptId,runId,
slotId,attempt,selectionSha256,context,binding,transport,artifactHashes,envelope}`.
context and binding are the entire actual A/C structures (all fields, ordered
units and sources); transport is all six inspectScriptEnvelope facts;
artifactHashes is `{stdoutSha256,stderrSha256,childSha256}` with childSha256
nullable on missing child. envelope is the full validated conformance envelope,
never the two-field fault summary returned by inspectScriptEnvelope on failure.
Observed constructor/original/inspection, diagnostic, completedUnits, nullable
history and actual phase/body entry are preserved; no summary reconstruction.

Only a trusted parent process owner, after actual transport and independent
inspection against its saved context/binding/facts, can create a WeakMap receipt.
Do not export mint/register/loadReceipt; no shared public constructor, injected
verifier or test-only export. The eventual parent owner must privately own the
receipt map and ledger mutation together (or a reviewed module-private bridge),
not expose callback registration. Existing C's public observation plan/result
is not that bridge. Successful conformance classification construction requires
its own reviewed C/result refactor, not duplicated private classification.

Append authenticates ledger and receipt, requires admitted Script, no remaining
debt/input error, exact lane/run/slot/attempt/stable execution context and fresh
receipt ID. Match every selected file/hash/metadata/ordered harness occurrence;
all seven limits; all Unit IDs/ordinals/roles/paths/blobs/source and transformed
hashes/byte lengths/UTF16 lengths; engine commit/source/build/adapter/policy,
profile/host/platform/toolchain, host-services, runtime and rule authority,
Realm descriptors, nonce/request/preflight. Stable certificate key differs from
attempt nonce/request/run/preflight; no stale or cross-host substitution.
The JSON payload is evidence only. A matching payload cannot mint a receipt.

Stage-test is insufficient for body execution: keep process-started and
testBodyEvaluated separately. Accept all eight statuses on *admitted* terminals,
including unsupported/resource, without retroactive debt removal or denominator
change. A rejected append does not consume a receipt; successful append spends
it once even before disk persistence. Replay across slots/runs/ledgers rejects.
Persist failure never revives a spent receipt. No token is revived by JSON,
checkpoint or copying. E3 crash recovery requires additional trusted durable
transport/receipt ownership and is explicitly unsupported by E2c.

## E2c checkpoint format, failure and reopen authority

Proposed exports: `createScriptLedgerStore(directory,ledgerToken): Promise<StoreToken>`,
`checkpointScriptLedger(storeToken): Promise<CheckpointToken>`,
`reopenScriptLedger(checkpointToken): Promise<LedgerToken>`.
Store creation requires a fresh directory and authentic ledger, writes generation
0 (complete selection, current attempts), and returns an opaque process-local
store token. No overwrite/reuse of existing directory. No public `path,JSON`
load/import API. Directory must be absolute, nonaliased and not a symlink;
check every existing ancestor. Reopen takes no path/expected hash override.

```text
Checkpoint = {checkpointVersion:1,kind:"script-policy-checkpoint",generation:integer,
              previousSha256:null|Hash64,ledger:Ledger,report:Report}
```

Store writes unique immutable `checkpoint-<generation>.json` files in its owned
directory, with canonical UTF8 JSON.stringify(checkpoint,null,2)+'\n'. Snapshot
report and ledger in the same file; a report failure cannot publish one without
the other. No mutable report.json or HEAD pointer is authoritative. Generation0
previousSha256=null; later previousSha256 hashes the exact previous bytes.
Files are written exclusively as a fresh unpredictable same-directory temp,
flushed and closed, then published with `fs.promises.link(temp,destination)`.
The hard-link operation fails if destination exists; there is no check-then-
rename overwrite window. Unlink the owned temp after publication. A filesystem
without hard-link support rejects storage as unavailable; no rename fallback.
Multiple writers/external filesystem mutation remain outside the trust model;
destination collisions reject, never overwrite. The bounded local link probe
returned EPERM before publication. The original failure is retained in
`link-probe-failure.txt`. The coordinator's later elevated isolated probe
succeeded for complete bytes, EEXIST/no-overwrite and unlinking the temp;
its exact reported output is retained in `root-link-probe-review.txt`. This
narrows the local feasibility concern without erasing the sandbox failure.
**The E2c checkpoint API and power-loss durability remain unvalidated and
require separate review.** Do not infer storage acceptance or add a rename fallback. E2a
has no persistence and is unaffected. Storage-unavailable is an explicit error,
not successful checkpoint creation.

Private store state retains exact generation bytes/hash and high-water mark.
Reopen authenticates the checkpoint token, reads its private path, compares
exact bytes to the saved anchor, validates entire schema, selection and history,
recomputes report, and checks current policy/authority closure. It returns a new
private ledger and revokes the previous writable ledger/store association;
one writable owner only. Reject stale checkpoint tokens after a later generation
commits, second reopen, dirty current in-memory state newer than checkpoint,
context drift and nonexact bytes. A no-op checkpoint at the same state returns
the existing checkpoint token, not a different generation. Store stays attached
to the reopened ledger. Cancellations leave known missing entries unchanged.

Pre-publication open/write/sync/close/link failure leaves prior committed generation
and high-water mark unchanged, state dirty in memory and receipts (future) spent.
Delete only that known owned temp, preserving the original error if cleanup also
fails. Retain a cleanup diagnostic. Failure after link but before acknowledgment
is indeterminate: block further mutations/checkpoints, inspect the exact expected
generation path against privately retained pending bytes, then either acknowledge
the identical file or reject conflict. Do not blindly retry/overwrite/reappend.
Restart destroys those anchors: retained files remain inspectable evidence but
cannot be reopened as trusted writable history. Directory sync/power-loss
durability is platform-dependent and must be reported; flush+link is not a
machine-crash guarantee. Never truncate a tail or synthesize missing attempts.

A hash chain detects accidental corruption, not an attacker recomputing hashes.
Exact private anchor equality catches changed first attempts, retry reasons,
order, gaps and recomputed hashes in this threat model. Without the live anchor,
trusted restart resume remains unavailable. A future durable authenticated
journal would be separate review, not a caller-provided key or JSON authority.

E2b error precedence is arguments -> token -> already-used-selection (creation
only) -> selection/history -> slot -> retry-policy; messages are exactly
`script-ledger/<code>`, native Error without fields. Inspection/report require
exactly one live token. E2c uses `script-ledger-store/<code>` in precedence
arguments -> token -> owner (revoked/stale/dirty/indeterminate) -> path ->
context (closure drift) -> bytes (read/anchor inequality) -> snapshot (closed
schema/history/report mismatch) -> io (publication failure). No caller objects
are frozen. Async calls snapshot before await, serialize per store, and reject
concurrent mutations as owner errors while publishing/reopening. Exact snapshot
validation checks versions/kinds, dense arrays, unique paths/slots, contiguous
file/slot ordinals, global sequence and per-slot attempts, reason policy,
terminal equality to selection, full recomputed report and prior generation
link. A version2 field somewhere inside v1 does not upgrade the container.

## Full report contract

Report has exactly `{lane,selectedFiles,plannedVariants,executedVariants,
testBodyEvaluatedVariants,unplannedInputErrors,completed,missing,attempts,counts,
passedFiles,files,excludedFixtures,complete,passOverPlanned,conditionalPass,exitCode}`.
counts has exactly the eight keys in order: pass, fail, unsupported-feature,
unsupported-profile, harness-error, resource-limit, timeout, host-fault.
Each file is `{path,manifestId,statuses,inputError,passed}`. statuses is null
for unknown variants, otherwise ordered `{slotId,variant,status}` records,
status null when missing. inputError is always present (null or exact error).
All integers count first terminals only except attempts, which counts every
committed attempt. executedVariants counts first terminals for which the trusted
parent launched the child; testBodyEvaluatedVariants counts first true body flags.
Both are 0 in E2. Future timeout/protocol terminals can be launched without body
entry. Retries never replace the first status, execution flags or headline.

selectedFiles includes null-slot input failures; plannedVariants counts only
known slots; unplannedInputErrors counts null-slot files. completed counts slots
with any terminal; missing=plannedVariants-completed. All statuses count toward
completed. passedFiles requires nonempty known slots all first-pass and no input
error. complete iff unplannedInputErrors=0 and missing=0. passOverPlanned is
`{numerator:counts.pass,denominator:plannedVariants}` only when complete;
otherwise null. conditionalPass is pass/(pass+fail) if that denominator >0,
else null; never label it full conformance. Exit 2 incomplete, 1 complete with
any nonpass, 0 complete all pass. Valid selections prohibit zero files/zero
known complete slots, so no 0/0 report. Never aggregate node/native ratios.

Pinned corpus per lane: selectedFiles33/plannedVariants60/completed60/missing0/
attempts60/executed0/body0/unplanned0/passedFiles0; feature19/profile41/all other
counts0; complete true/full0/60/conditional null/exit1. Initial report is
completed0/missing60/attempts0/complete false/full null/exit2. One selected file
with unreadable metadata contributes selectedFiles1/planned0/unplanned1 and
exit2, not complete. Include failure after metadata retains two slots and two
harness-error terminals; complete may then be true with exit1. Partial validated
includes are never promoted into a completed harness. Full literal ordered
slots and every report field are frozen in the evidence files for both lanes.

## Validation and limits

`docs/validation/ts-035e2-p/README.md` gives commands and separates real API
witnesses from design-model controls. `corpus-literals.json` contains the full
ordered 60 slots per lane, exact E1 debts, metadata and input identities taken
from retained verified corpus ledgers (not fresh retrieval). `report-literals.json`
contains full initial/final reports and synthetic partial/all-status/retry
reports. All-status entries are private oracle data, never E2 admission fixtures.
Replay compares literals; it does not regenerate expectations during validation.

Required E2a implementation tests: exact arguments/errors and async input
snapshotting; fresh frozen token/inspection copies and zero accessor calls;
actual fixed reader with no injection; full ordered manifest lanes; metadata
and include partial failures; empty/duplicates/unknown/fixtures; debt projection
and order; closure drift/alias handling and inability to use JSON/token copies.
Use isolated copied modules/files under new evidence for malformed input/IO
tests, never modify real old files or expose a production test seam. Literal
future E2b/c matrices cover first/retry/every status/missing/cancelled, complete
denominators, history mutations and atomicity, receipt consumption, persistence
failure/recovery/reopen/version/context. They must become real production tests
when those slices are assigned; this model does not validate an absent API.

No full build/native execution is warranted for design. Actual existing v1/v2
codec calls, E1 calls and bounded input/planning errors are exercised offline.
Current producer/serializer examples are retained unchanged. No new semantic
specification claim is made; this is host policy, using existing accepted engine
contracts. E3 transport composition and restart receipt recovery remain explicit
review gates. Do not widen E2a to solve them. Stop after coherent design/evidence
commit for actual and second review; do not implement or publish a successor.
