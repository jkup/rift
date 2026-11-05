# E2c-P: process-local policy-ledger checkpoints

Design/evidence candidate against 45701bc and accepted E2b 542fe54. This replaces
only the deferred E2c proposal in script-selection-ledger.md. It is not permission
to implement, publish, admit tests, or start E3. All code under ts-035e2c-p is a
review proposal or isolated probe. Production remains the accepted E2a/E2b code.

Review correction to candidate 36f17fd: the current complete proposal manifest is
`validation/ts-035e2c-p/correction/proposal-manifest.json`. Original candidate
artifacts remain unchanged. Resolution cleanup now records each non-ENOENT unlink
failure privately as `{stage:'resolve-cleanup-unlink',code:error.code ?? null}`
before rejecting indeterminate. Repeated failures append diagnostics while keeping
the same pending publication and owner lock. ENOENT clears the cleanup marker
without a failure diagnostic; successful resolution retains prior diagnostics.
See the correction README for focused repeated-failure/recovery evidence and
exact closure-byte migrations. No public API or error schema changes.

## Smallest implementable boundary

Keep store operations in `tools/test262/script-ledger.mjs`. Its private `ledgers`
WeakMap already owns the only state replacement, validators and report derivation.
Add private ownership/store/checkpoint WeakMaps there; retain each originating
selection token privately. There is no serialized-state constructor, exported
validator, caller-supplied snapshot, public mint, path-based load, or injected IO.
The four existing ledger exports retain arities and synchronous behavior.

The planner adds `assertScriptSelectionCurrent(token)` (exactly one argument,
Function.length 1, asynchronous Promise<undefined>). It authenticates with its
own WeakMap before awaiting, captures the private immutable selection, reads the
fixed E1 authority, compares its complete projection with saved authority, reads
the existing complete byte closure, and compares the complete policy. Errors are
native Error, exactly script-plan/arguments, token, authority, drift, closure,
drift in that evaluation order. A failed authority read or comparison prevents
closure IO. It grants no new selection authority and returns no private state.
No planner root, file list, hash, callback or reader override is accepted.

A separate store module would need exported ledger mutation/revocation hooks or
an owner capability passed through public operations. A common state module
would move both WeakMaps behind additional importable interfaces. Extracting the
planner context scanner would add a production file and migrate its full closure.
None is needed for this bounded slice: co-location plus one read-only context
assertion gives two production-file edits, no new production dependency, and no
duplicate manifest/blocker/closure implementation. Module imports remain acyclic:
ledger imports planner; planner hashes ledger bytes without importing ledger.

Policy id becomes `rift-script-blocked-v4`; selectionVersion remains 2,
ledgerVersion 2, checkpointVersion 1. Closure remains exactly 242 entries at this
pinned host, with only planner and ledger hashes changed. Report schema, selected
files, every debt and every denominator remain E2b's. There is no v1 conversion.
Separate module instances have independent token namespaces; a ledger from
another instance fails token authentication. JSON or structured clones fail too.

Six exact complete old-file proposals, original/proposed SHA256 hashes, and
whole-file verification are in `validation/ts-035e2c-p/correction/proposal-manifest.json`
(the original manifest remains immutable alongside it):

| Existing file | Exact migration purpose |
|---|---|
| tools/test262/script-plan.mjs | v4 closure and read-only assertion |
| tools/test262/script-ledger.mjs | v4 validation, private owner lock, co-located store operations, shared report derivation |
| tools/test262/script-plan.test.mjs | exact three exports; old v2 literal to v4 closure transform with pinned planner hash |
| tools/test262/script-ledger.test.mjs | eight exports; preserve all 149 old controls and literal comparisons |
| docs/validation/ts-035e2b/support.mjs | guarded v3 synthetic fixture to v4 closure migration, copied inspector exposes read-only assertion |
| docs/validation/ts-035e2b/extended.mjs | expect v4 policy, retain 242 and all remaining assertions |

E2a support.mjs already copies the ledger: no change. Its historical raw fixtures,
E2a/E2b freeze scripts, acceptance outputs and validation runners are not edited.
New implementation tests belong in tools/test262/script-ledger-checkpoint.test.mjs
and new ts-035e2c evidence, with isolated output destinations. Their minimum scope
is every public and private control retained here plus inherited migrated E2a/E2b
tests; this design does not claim to have rerun those full suites. E1, v1 ledger,
decoders, launcher, package registration and C++ need no edit. A future runner
copies existing consumers and fixtures into its own evidence before execution.

## Public store API and ownership

All new exports are async functions. Wrong arguments produce rejected promises,
not synchronous throws. Each opaque token is a distinct frozen ordinary empty
object. Arguments are primitive-checked; token membership never reads caller
properties or invokes getters/coercion. No optional parameters or cancellation
signals exist.

| Export | Exact arity / Function.length | Result |
|---|---|---|
| createScriptLedgerStore(directory, ledgerToken) | 2 / 2 | StoreToken |
| checkpointScriptLedger(storeToken) | 1 / 1 | CheckpointToken |
| resolveScriptLedgerCheckpoint(storeToken) | 1 / 1 | CheckpointToken or null |
| reopenScriptLedger(checkpointToken) | 1 / 1 | new LedgerToken |

Creation **reserves an empty exclusive directory; it does not write generation
0**. This intentionally changes the older deferred proposal. Otherwise a failure
after the first link but before returning a store token would leave the caller
with no recovery handle. A separate first checkpoint resolves this ownership
problem without throwing tokens in public errors or adding a load API.

The directory must be a nonempty primitive string whose spelling is exactly its
absolute normalized path (`resolve(directory) === directory`). On Windows this
means the native absolute spelling returned by resolve, not a relative path or
forward-slash alias. Check every existing ancestor with lstat and realpath; reject
symlinks/junctions, non-directories and different canonical spellings. `mkdir`
is nonrecursive and exclusive: even an existing empty directory is rejected.
The caller promises exclusive directory use and no concurrent filesystem edits.
This is not a hostile-host race-proof sandbox: Node path APIs cannot prevent
ancestor replacement between checks. No fd-relative/OS-specific security claim
is made. Tests edit their own isolated evidence only to exercise rejection.

Creation authenticates and reserves the ledger synchronously before its first
await. While reserved/busy, inspect/report/append fail script-ledger/owner.
Failed creation releases that reservation, leaves ledger/report/selection
consumption unchanged, and never deletes an existing path. If mkdir succeeded
before a later path-check failure, its new directory remains evidence; a retry
must explicitly choose a new fresh directory. There is no recursive cleanup.

A store always has one current ledger owner, at most one busy operation, one
latest committed anchor, and optionally one pending publication. A later append
replaces the ledger's immutable state object; dirty means that identity differs
from the latest anchor's saved state. Locking is synchronous at async entry, before
any context or filesystem await. There is no queue: a concurrent operation rejects
owner. Reads also reject while busy, pending, or revoked, so no intermediate
state escapes. On successful reopen the old ledger is revoked for all operations;
selection inspection remains valid, and its one-use ledger consumption remains.

Reopen requires the current unspent checkpoint, clean owner, no busy/pending
operation, exact file bytes, current authority/closure, and valid saved state and
derived report. It allocates a new ledger token pointing to the same immutable
state, transfers the store, revokes the old token, and spends the old checkpoint
in one synchronous publication. It creates a new checkpoint token for the new
ownership epoch with identical bytes and generation. A subsequent no-op checkpoint
returns that new token; repeated no-ops in an epoch return the same token. This
explicitly resolves the conflict between one-use reopen and stable no-op tokens.
No ledger is rebuilt from disk JSON. Disk bytes only confirm the retained private
state; all restoration authority is live and private.

## Exact snapshots and generations

The closed top-level schema, in canonical insertion order, is:

```text
{checkpointVersion:1, kind:'script-policy-checkpoint', generation:SafeInteger>=0,
 previousSha256:null|lowercase SHA256,
 ledger:{ledgerVersion:2,kind:'script-policy-ledger',selection:Selection,attempts:Attempt[]},
 report:Report}
```

Nested Selection, Attempt, PolicyTerminal and Report are exactly E2b's closed
schemas, with policy id v4. No timestamps, path, temp name, token, receipt,
transport wire, headline override or caller status appears. Report is recomputed
from the same saved ledger state via the existing report algorithm, including
first terminal, ordered files/slots, eight counts, missing, input-null slots,
ratios and exit code. Safe-integer overflow rejects before publication. Complete
Module slots stay outer policy entries; null-slot files have no invented attempts.
No pass/execution/testBodyEvaluated status becomes reachable.

Canonical bytes are UTF-8 `JSON.stringify(snapshot,null,2)+'\n'`, no BOM. Every
field is built in the specified order from authenticated ordinary data; full
state validation precedes serialization. Reopen first compares bytes, then checks
the private saved state and reserializes the complete ledger/report envelope.
Equivalent JSON with different spaces/order is rejected. There is no permissive
JSON import followed by a schema check.

Generation starts at 0, previousSha256=null. Each dirty checkpoint advances by
exactly one and hashes the exact prior canonical bytes. No-op checks current
path/context/bytes, then returns the current epoch token without touching disk
or changing generation. The private anchor retains exact bytes, full immutable
ledger state, previous hash, generation, destination and hash, not just a digest.
The latest snapshot contains the whole history. Reopen verifies the latest file;
it does not promise to audit abandoned earlier generation files. Tampering with
an earlier file alone cannot change current authority; a rewritten latest chain,
including recomputed hashes, cannot match the private latest bytes.

## Errors and exact operation order

Errors are native Error.prototype with exact `script-ledger-store/<code>` message,
no own enumerable properties, cause or token; ordinary stack/message allowed.
Native filesystem errno is retained privately in operation diagnostics where
publication or cleanup fails; it does not escape as an alternate public schema.
Historical and new actual EPERM witnesses remain separate from these errors.

| Operation | Precedence (left to right) |
|---|---|
| create | arguments -> token -> owner -> lexical path -> snapshot -> parent path -> context -> io(mkdir) -> created path |
| checkpoint | arguments -> token -> owner -> snapshot -> path -> context -> bytes(previous anchor if any) -> snapshot(generation/serialization) -> io or indeterminate |
| resolve | arguments -> token -> owner(no pending or busy) -> path -> context -> bytes(stat/read/equality) -> indeterminate(cleanup) |
| reopen | arguments -> token -> owner(spent/stale/dirty/busy/pending) -> path -> context -> bytes -> snapshot |
| existing ledger operations | original argument checks -> token -> owner -> original selection/history/slot/retry checks |

The owner codes deliberately collapse stale, revoked, dirty and busy: no caller
state is inspected to refine them. Wrong create directory type/arity beats forged
token; authenticated ledger with existing store beats malformed path. Wrong slot
type still beats busy owner in append; well-typed unknown slot loses to owner.
Inspect/report/new-ledger remain synchronous. Creation validates authentic
selection once and consumes only on success as before. Store creation does not
consume a second selection or make already-used selection reusable.

## Publication, indeterminate acknowledgment and recovery

Before any publication, snapshot/validate/serialize in memory. Open a random
same-directory `.pending-UUID.tmp` with `wx`, write all bytes, sync the file,
close the handle, then link to immutable `checkpoint-N.json`. Never rename,
overwrite, truncate, replace a destination, regenerate history, or reappend an
attempt as a recovery strategy. No directory-sync or power-loss durability claim
is made. The acknowledgment is an in-process anchor/token publication only.

| Failure boundary | Public error / retained state / next permitted action |
|---|---|
| arguments/token/owner | exact error; no IO or mutation |
| snapshot/path/context/prior read | corresponding error; old anchor, owner and complete ledger unchanged; release busy |
| open before handle returned | io; no link dispatched; no deletion of a pre-existing temp; unchanged anchor |
| partial write/write/sync/close | io; no link dispatched; attempt owned-handle close and exact owned-temp unlink, retain cleanup errno; unchanged anchor/ledger/generation |
| cleanup also fails before link | original io wins; retain private cleanup diagnostic and temp evidence; no destination; explicit later checkpoint allowed, with a new random temp |
| link dispatched but rejects, including EEXIST/EPERM | indeterminate conservatively, retain pending bytes/path/temp and old anchor; block reads/mutations/checkpoints until explicit resolve |
| link success, unlink fails (before or after effect) | indeterminate; pending retained; no acknowledgment; explicit resolve only |
| acknowledgment interrupted before publication | indeterminate; retain pending, no second link or append; resolve only |
| resolve destination absent (ENOENT only), cleanup succeeds/already absent | return null, clear pending, release owner; old committed generation unchanged; no automatic retry; caller may explicitly checkpoint again |
| resolve destination exactly matches private bytes | clean temp if retained, then acknowledge exactly once; no new generation/link/attempt |
| resolve stat/read fails otherwise or bytes differ | bytes; stay pending and locked; preserve conflicting destination, no overwrite or fallback |
| resolve cleanup fails | indeterminate; stay pending and locked; repeated resolve is an explicit read/cleanup attempt, never a publication retry |
| reopen path/context/read/schema failure | no revocation, no token consumption, no new owner; release busy; caller may retry after independently addressing cause |

Link rejection is deliberately conservative: an adapter can lose acknowledgment
after an effect. Do not infer absence from an exception. Actual EEXIST is retained
as evidence; resolution sees the conflicting file and stays locked. No abort API
silently discards that conflict. A pending absent-generation recovery returns
null visibly; it does not claim a successful checkpoint. The exact-owned temp
is the only unlink target. During pending cleanup, destination nlink may be two;
the other link must be the retained temp with matching device/inode. Once clean,
nlink must be one. Aliased files and injected junction ancestors reject.

Fatal VM termination/out-of-memory, power loss, process restart, and malicious
concurrent filesystem replacement are outside the recoverable API contract.
An ordinary injected acknowledgment exception is retained in isolated controls.
There is no promise to survive arbitrary failure inside synchronous WeakMap
publication. This boundary is necessary to avoid claiming transactional memory
allocation or machine-crash durability from Node file flushes.

Cancellation is absence of a call, with no ordinal or generation reserved. Once
called, ignoring the promise does not cancel the operation. Failed checkpoints
preserve all completed policy attempts; no receipt exists to refund or replay.
E3 transport, receipts, admission and durable restart authentication remain
separate. Retained files after restart are inspectable evidence only.

## Evidence and acceptance boundary

The retained 28 complete checkpoint literals preserve both-lane initial, partial,
complete, retry, include-input, Module and mixed/null-slot histories and reports.
Public copied-proposal probes use real E2a tokens and actual both-lane60 plans;
private fault controls are explicitly marked, never a public authority interface.
The latter test unreachable counters/history/acknowledgment and IO failures.
Full exact-byte comparisons are independent of schema success: rehashed tampered
histories are compared to live bytes, not accepted because their hashes agree.
The existing E2b actual implementation's validators, not a generic equality model,
remain the source of schema enforcement. This proposal still needs actual and
independent second review before implementation assignment.

The baseline verifier checks old tracked bytes and exact proposal identities.
Preserved acceptance remains 212 records per lane, 71 gates, all60 blocked
(19 feature/41 profile), and unchanged C++. No native builds, compiler probes,
full suite reruns, registry activation or conformance claim were made here.
