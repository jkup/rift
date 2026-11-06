# TS-035E3c-P: stable execution selection prerequisites

Design against `1feb9e95278c34927278ae5be5960cb0a52a57db`, accepted E3b
`b6f9896`. This is a design and offline evidence candidate, not production
implementation permission. The real registry stays empty, every actual corpus
slot stays blocked, and no guest, control, conformance child or native build is
launched here. The retained 212 guest records in each lane and 71 static gates
are preservation evidence, not results of this task.

**Review correction after `55ffc90`:** that candidate was not accepted. Its
capture tests checked returned bytes against returned hashes but lacked an
independent full capture oracle. The root changed only unit IDs to constant u0
and all 94 controls still passed. The corrected candidate changes the proposed
test only; the implementation proposal is byte-identical. The authoritative
mapping is now `validation/ts-035e3c-p/correction/proposal-manifest.json` and its
verifier. Original proposals, manifests, outputs, failed sandbox run and the
original version of this document are retained. See the correction acceptance
requirements at the end of this document.

## Decision: freeze input capture first; defer execution certification

The smallest independently implementable slice is **an authenticated, immutable
execution-input snapshot**. The original complete implementation proposal stays
under `validation/ts-035e3c-p/proposals/`; the corrected complete new-test proposal
is under `validation/ts-035e3c-p/correction/`. No existing-file or old-test replacement is
needed or authorized; the correction's `proposal-manifest.json` has an explicitly empty replacement
list and whole-file hashes for the two additions. The preservation verifier
checks every pre-existing tracked file other than the two coordination files.

This reduces the assignment at a concrete dependency boundary: a complete
execution-selection v3 cannot be frozen honestly yet. C has no conformance
host-services descriptor or conformance preflight control dispatcher. Build
provenance, toolchain content closure and archive schemas also lack a reviewed
execution authority contract. Giving these invented defaults, accepting caller
descriptors, or combining E2 and C summary hashes would falsely close them.
This proposal does none of those things. It does not use the reserved
`selectionVersion:3, kind:"script-execution-selection"` name from E3-P.

The first result is `selectionVersion:1, kind:"script-execution-input-selection"`,
with `executionBinding:null` and `admission:"blocked"`. Its stable digest means
**input identity only**, never stable execution certification. An input token
is not accepted by E2 ledgers, stores, checkpoints or any launcher. No conversion,
load, register, mint, receipt, public verifier injection or admitted branch exists.
Future complete selection must wrap the full original E2 anchor and this exact
input data, resolve the remaining dependencies below and receive separate review.

## Actual producer boundary, superseding the withdrawn request-object API

The installed `src/script-observation.ts` exports exactly the existing
`observeScripts(request)` and `observeScriptControl(request,control,input)`, plus
`validateConformanceScriptArguments(args)` (arity 1, void) and
`produceConformanceScripts(args,sourceTexts)` (arity 2, ChildV2 data).
The parser/request/limits/unit record types are private. There is no installed
`script-producer-request.ts`, public record validator, parser return value or
one-argument conformance producer. The accepted request-boundary amendment in
`validation/ts-035e3b/request-boundary/` supersedes the original E3b-P proposal
where they differ. Those historical documents and failed probes stay unchanged.

Conformance argv is exactly:

```text
conformance VARIANT ACTION NONCE REQUEST_SHA PREFLIGHT_OR_- RESULT
  SOURCE_UNITS PARSE_DEPTH STEPS CALLS EVALUATION_DEPTH WALL_MS OUTPUT_BYTES
  UNIT_ID ROLE SOURCE_PATH [UNIT_ID ROLE SOURCE_PATH ...]
```

There are fourteen header positions and at least one triple. Array/indexed-string
validation precedes argc; then mode, variant, action, nonce, request-hash,
preflight and result-path; seven decimal controls in that order; ordered triples;
fixed limits; wall bound; raw/nonraw preflight rules. Errors use the exact
`script-producer/` suffixes `arguments`, `argc`, `mode`, `variant`, `action`,
`nonce`, `request-hash`, `preflight`, `result-path`, `limit`, `unit`,
`fixed-limit`, `wall-limit`, `variant-preflight`. Producer repeats controls,
then `source-texts`, then `strict-transform`. Old `fields`, `limit-fields` and
`unit-fields` errors are withdrawn, not promised checks.

Extra array properties are ignored; indexed inherited strings are accepted.
These APIs are ordinary trusted host string-array utilities, not hostile-object
boundaries. The proposed input API below has its own descriptor-checked object
boundary; it does not retrofit a stronger promise onto E3b. The driver validates
all controls, reads all sources in occurrence order, repeats producer validation,
checks exact strict prefix `"use strict";\n`, allocates a fresh Attempt, executes,
serializes and exclusively writes `wx`. Read errors precede strict source checks;
all reads precede any Realm. Generic driver exit70 alone proves neither no IO nor
no Realm, nor the precise internal error. Child mode and preflight ID are data.

The producer's three fixed limits are 100000 source UTF16 units, parseDepth128,
evaluationDepth256. Steps/calls are forwarded, including zero. WallMs is at most
2147483647, outputBytes a nonnegative safe integer. Parent enforcement of wall and
output remains required. Raw has one test unit/null preflight. Nonraw needs a
nonnull preflight ID even with no harness. No ID certifies successful controls.
Harness executes in occurrence order; parse-only evaluates harness but only
prepares the test. A current oversized source precedes that unit's step limit;
an earlier harness failure precedes a later oversized source.

## Ownership and complete consumer audit

`closure-audit.json` inventories every tracked TS/MJS/CJS under src/test/tools,
including full hashes, import/export lines and numbered references. Historical
consumer scripts are a separate complete lexical inventory; historical source
copies and identity checks are not new live authority. `native-entrypoints.json`
retains all 71 build entries. Neither inventory is advertised as a certification
digest. The exact future closure requires member lists, contents and provenance.
`consumer-addendum.json` covers all 373 additional tracked JS, PowerShell, Python
and shell files, including zero-reference files; the one matching control script
is the historical producer capture script. No historical consumer is migrated.

| Owner | Current boundary and next-slice consequence |
|---|---|
| `input.mjs` | Pin, fixed manifest, original-byte/blob verification, UTF8 decoding, five metadata fields, variants and ordered includes. Creates variants before include failures; exposes no verified harness prefix on failure. Remains unchanged. |
| `script-capabilities.mjs/json` | Byte-exact empty registry. Reconstructs original ordered debts plus runtime:coverage. Known manifest metadata cannot be overridden. No grant. |
| `script-plan.mjs` | Three exports and private E2 tokens. v2 anchor, blocked-v4 policy closure: eight explicit project files, Node and complete YAML tree (242 members). Does not bind execution source/build/toolchain/host services. |
| `script-ledger.mjs` | Eight exports; lexical policy ledger/store/checkpoint ownership. Full denominator and first-terminal reporting; E2c reopen transfers policy ownership only. No receipt map. |
| New proposed input module | Authenticates E2 token, copies explicit options before await, rereads pin/inputs, captures exact bytes, returns private token and detached data. Does not consume the policy token or alter E2's closure/member count. |
| `script-observe.mjs` | Existing private observation plans/closure/preflight/process facts and one-use launch. New input token does not enter it. Source, adapter, built closures are detailed below; all observation calls stay unchanged. |
| `script-observation-driver.ts` / producer | Positional conformance data mode is installed. No admitted parent launcher invokes it. Existing observation/control mode and D1–D8 callers remain unchanged. |
| `script-throw-inspection.ts`, execution/session/Realm | Preserve original throw record/source/active Realm and secondary constructor-get inspection. No name/message reconstruction, injected AST, Realm, callback or constructor map. |
| `script-result.mjs` / `script-driver-result.mjs` | Independent full decoders; E3a constructor is data-only and shared classifier stays private. Module slots never become Script envelopes. |
| v1 `plan.mjs` / `ledger.mjs`, public CLI | Continue v1 behavior. No wrapper aliasing the new token, profile switch or CLI migration. |

Direct and transitive consumers include A decoder tests, C input/preflight/launch/
codec/live-codec tests, E3a constructor tests and prefix/hash tests, E3b producer
tests, E1 and E2a/b/c tests, D1–D8 dispatch drivers, B throw inspection and H7
controls. New input files are host tools; no native gate, src entry or package
script changes. Existing tests' source identities are preserved byte-for-byte.
Historical verifiers must not be rewritten to accept a changed source. A later
implementation uses the new exact two-addition verifier, not regenerated history.

## Exact first-slice API, data and canonicalization

New `tools/test262/script-execution-inputs.mjs` has only these runtime exports:

| Export | Arity and result |
|---|---|
| `prepareScriptExecutionInputs(policyToken, options)` | Exactly 2; Promise of frozen opaque token. |
| `inspectScriptExecutionInputs(token)` | Exactly 1; deeply frozen detached snapshot. |
| `assertScriptExecutionInputsCurrent(token)` | Exactly 1; Promise<void>, read-only input/policy assertion. |

Options are exactly `{root,limits}` with ordinary Object.prototype, own data
descriptors, no symbols, accessors or extra keys. root is a nonempty string,
resolved synchronously. limits has exactly the seven fields in producer order;
every value must be a nonnegative safe integer, fixed controls exact, wall bound
as above. There are **no defaults**, environment overrides, injected readers,
build paths, registry entries, source text or callbacks. Negative zero is an
explicit invalid limit. Proxies are outside the host-data contract. Every option
value is copied before the first await; later caller mutation cannot change it.

Snapshot fields, in exact serialization order:

```text
selectionVersion:1, kind:"script-execution-input-selection",
policyAnchor:<complete original E2 snapshot>,
policyAnchorSha256:SHA256(UTF8(JSON.stringify(policyAnchor))),
stable:{inputVersion:1, kind:"script-execution-input-data",
        policy:<E2 snapshot with only runId omitted>, limits:<seven fields>, files:[...]},
stableSha256:SHA256(UTF8(JSON.stringify(stable))),
executionBinding:null, admission:"blocked"
```

No newline is hashed. Key order is constructed internally, arrays preserve every
occurrence and ordinal, UTF8 JSON uses native JSON.stringify escaping, hashes are
lowercase hex. A JSON snapshot cannot become a token. Both canonical data and
digest are retained; the full anchor including its original runId is never lost
or normalized. Two E2 runs with equal inputs have unequal anchor hashes but
equal stable input data/hashes. No execution nonce, attempt, result or preflight
result ID is introduced. The local root is private locator data, not a portable
certification path. Policy host/platform and the Node/YAML content list remain
in the stable policy projection; they are not a complete engine/toolchain binding.

Each capture file is `{ordinal,path,state,slots}`. For inputError or null E2 slots,
state is `input-error` and capture slots is null: **all original slots and the
actual error remain in stable.policy.files and policyAnchor.files**. This never
alters the denominator or claims a successfully empty harness. Successful files
have state `captured`; each slot is `{slotId,variant,goal,units}`. Module stays
Module/module, with original metadata/debts; capturing bytes does not make it a
Script producer request or a decoder binding.

Each ordered unit is exactly `{id,ordinal,role,path,blob,sourceSha256,
transformedSha256,byteLength,transformedByteLength,sourceUnits,originalBase64,
transformedBase64,transformedText}`. IDs are u0..uN in that slot; harness first,
test last. Repeated includes yield distinct occurrences even for identical paths
and hashes. Both original and transformed byte strings are retained; lengths are
not confused with UTF16 units. Test strict transformation is exact UTF8 prefix
plus original bytes. Harness bytes are never prefixed. Raw/non-strict equal bytes
retain different slot identity/variant/metadata. Action is deliberately not yet
selected here: future execution selection must bind parse-only versus execute
from original negative metadata and an explicit reviewed policy.

## Error and recheck order

All new errors use `script-execution-inputs/` and reject without changing a prior
token/snapshot. Exact source proposal is normative for the complete error order:

1. Arity, options/limits descriptor shape => `arguments`; root value => `options`;
   each numeric limit => `limits`; fixed triple => `fixed-limit`; wall bound =>
   `wall-limit`; authenticate E2 token => `token`. No IO before this boundary.
2. E2 assert, including authority/closure/drift failures => `policy-current`.
   This intentionally wraps existing E2 errors; it does not silently treat them
   as blocked-success. Root ancestor/leaf lstat/realpath checks => `root`.
3. Fresh E2 prepare with saved revision/lane/ordered paths => `input-current`
   on rejection. Compare entire E2 snapshot excluding only runId; difference
   => `input-drift`. File-level input errors remain data when unchanged.
4. Capture in file/slot/occurrence order. Every ancestor must be nonalias;
   realpath spelling must equal resolved spelling, leaf regular/nlink1. Read or
   blob/UTF8 verification failure => `source`; mismatched source/transform digest
   => `source-drift`. No include sorting, deduplication or partial prefix exposure.
5. Prepare repeats 2–4 and compares both full captures (`source-drift`) before
   publishing a token. Assert-current runs 2–3, compares new capture to saved full
   bytes, then 2–3 again. Inspection needs only arity then local token identity.

Thus malformed options beat a foreign token; policy drift beats missing root;
input drift beats later source capture failures. A valid policy token from a
different local root is acceptable only if the fresh full policy and exact bytes
match. Changed input-error recovery is drift too. Invalid/Module/blocked input
cannot be promoted by a successful recheck. Inspection is historical data and
does not promise freshness. These checks do not claim atomic filesystem reads
against an adversarial concurrent writer; no spawn follows them. The future
parent must use exclusive snapshots and recheck at its own boundaries.

## Remaining execution bindings: mandatory dependency contract, not defaults

The following is the exact dependency inventory for the next design. Its open
items are **not optional** and are not represented by invented nulls in a v3
execution schema. `executionBinding:null` above means that schema is unavailable.

| Binding | Required canonical data and digest; actual source of truth |
|---|---|
| Pin/selection | Full original E2 anchor + original hash; revision, raw manifest bytes/hash and fixed semantic manifest digest; ordered selected paths, file/slot ordinals, null-slot/input errors, excluded fixtures, complete debt provenance. Current source `input.mjs` and frozen manifest. |
| Original/transformed input | All captured per-occurrence bytes, git blob, SHA256, both byte lengths, UTF16 length, role, ID, path, variant, goal; original five metadata fields and expected negative. Equal bytes cannot merge raw/non-strict or duplicate includes. New proposal captures this, but action/dispatch remains pending. |
| Limits | All seven explicit values, source/parse/evaluation fixed constants and bounded wall; canonical order above. Parent output/wall enforcement implementation must also be bound. No C defaults may silently supply omitted values. |
| Source | Sorted complete files with logical labels and bytes/hash: every src TS (including bootstrap, throw inspection, Script facade, private producer/parser and driver), input/selection/policy/ledger/owner/launcher/decoders/classifier, package/lock/tsconfig/build-native/probe-verdict, fixed harness/license and observation/control fixtures. New input helper itself must enter the future closure. Preserve engine commit and dirty source data; a commit label alone cannot identify modified source. |
| Build and adapter | Source-to-artifact mapping plus full selected lane member lists/digests, fresh build commands and gate outcomes. Node: all generated src JS + control JS + actual Node executable. Native: actual driver/control executables plus build provenance. Adapter includes all E1/E2/new input/selection/owner/launcher/codec files and full YAML package, Node host executable, manifest and registries. Two old summary hashes are insufficient. |
| Toolchain/host/platform | Actual OS/arch, host version and executable hash; scriptc package/executable/runtime contents, TypeScript compiler package contents, lock-resolved dependencies; native Zig/linker identity and effective target/configuration. Current version label scriptc0.4.7/TS7.0.2 alone is insufficient. The exact portable locator and transitive linker/sysroot allowlist is unresolved: no fabricated empty list or digest. |
| Runtime/rule registries | Full canonical empty E1 bytes/data/hash and exact policy implementation. Separately freeze all rule-registry versions, rules/source/control descriptors and evaluation-policy dependencies; existing strict-rule/parameter/assignment-target/lexical registries are diagnostics, not admission certificates. Keep never-debts and runtime:coverage. Nonempty grants require F. |
| Profile and host services | Closed versioned descriptor of installed Script globals, throwing output sink, guest-callable host services, Realm profile/layout and implementation closure. Main Attempt currently registers test only. Control-only host callbacks/other Realm must be explicitly separate, never included by an arbitrary profile string. **No reviewed conformance descriptor exists.** |
| Preflight controls | Ordered full control sources/expected contracts, original harness occurrences, control inputs, Realm/layout and host-service equivalence, dispatcher source/build and protocol; canonical descriptor digest, separate from actual result ID. Existing observation frozen.json H7/input controls and controls.json are evidence only. **Conformance dispatcher/descriptor agreement remains unresolved.** |
| Archive/parent owner | Parent-owned argv/source snapshots/transport events/exclusive artifacts, original-versus-retained byte hashes and lengths, presence/absence, preflight bundle, exact context/binding and error matrix. Schema and lexical owner implementation are still deferred. |

C currently hashes all src TS, test/script-observation.ts, observation fixtures,
harness bundle, package/lock/config/build tools as source; four adapter modules
(observe, both decoders, input), Node and YAML as adapter; lane-specific generated
src/control or two native binaries as built. C omits E1/E2/selection ownership.
E2's eight-file policy closure omits the engine/build/control/codec/launcher.
Neither independently nor concatenated closes the new input helper, future
selection/owner, host descriptor, rule policy or actual compiler/linker provenance.

Stable execution data must exclude runId, nonce, execution/receipt ID, attempt,
retry reason, elapsed time, output hashes and preflight **result** ID. Attempt
binding adds those identities without deleting stable data. The preflight
**descriptor/source/control** hashes remain stable. Success requires discarding
all control Realms, sessions, globals, callbacks, completions and ASTs, then
loading original ordered harness bytes into a fresh attempt Realm. Recheck full
selection/closure after preflight, before spawn and before append. F is separate.

## Reports, authority and future test boundary

The first slice has no report/append API; unchanged E2 owns reports. Full retained
reports and histories, not status summaries, accompany actual both-lane snapshots.
Every original file remains selected; null slots remain unknown input errors;
include failure retains planned slots; Module stays in the denominator; retries
cannot erase first terminals. The eight status keys/order, first-terminal counts,
missing/complete, passOverPlanned/conditionalPass and exit0/1/2 are unchanged.
Complete blocked corpus remains 60 completed, feature19/profile41, pass0,
executed0/body0, passOverPlanned `{numerator:0,denominator:60}`, conditional null,
exit1. No new full-coverage claim.

The evidence separates actual denial-only APIs, exact proposed input APIs in an
offline import-remapped copy, retained report literals and synthetic ordered-input
witnesses. None is an authentic future admitted selection or receipt. A future
v3 positive requires complete literal context/binding/data/decisions for every
dependency above, actual producer/parent evidence and separately reviewed F
entries; it is not inferred from a passing input probe.

Parent receipt/transport priorities remain those of E3-P: cancellation leaves
unfinished; otherwise deadline; crashBeforeCap or non-cap signal/nonzero exit;
output crossing; explicit spawn failure when no higher fact wins; protocol failure;
then shared classification. processStarted is the actual parent spawn event,
not body entry, JSON, stage or exitCode. Timeout/crash/output envelopes retain
null operation/source/inspection and body=false. Stream digests hash all received
bytes; retained pipe artifact digests can differ after a cap. Child hash must
identify original child-file bytes, not reserialized JSON.

Future authority errors remain arguments => authentic owner => revoked/busy/
pending => slot => input/admission/debts/goal => retry => private receipt identity/
unspent => owner/run/slot/attempt => full stable/attempt context => transport/
artifacts/envelope => complete candidate history/report => synchronous commit.
No external callback/await between private receipt mint, append and spend. Failed
archive/close/recheck never creates a terminal or revives spent state. E2c reopen
cannot restore execution authority. Exact admitted-owner API and archive errors
remain unfrozen; synthetic tests cannot stand in for actual parent ownership.

Stop after this design/evidence commit for coordinator actual audit and independent
second review. No publication, implementation, later design or successor task is
authorized by this handoff.

## Corrected capture oracle and mutation requirements

The complete `stable.files` output must equal frozen independent literals, not
only agree with its own hashes, a second call or an E2 report. The correction's
`capture-occurrence-tables.json` records every file/slot and ordered unit ID,
ordinal, role, path, blob and prefix explicitly. Tables use the pinned manifest's
declared variants/defaultIncludes/includes, without calling `planCorpus`,
`harnessPaths`, `transform`, the proposed capture helper or reading its outputs.
`pinned-byte-identities.json` retains original bytes and independently verified
git blob/SHA256 identities. `expected-captures.json.gz` freezes complete arrays
from those inputs, including all thirteen unit fields, four slot fields and
four file fields. Strict bytes use the literal UTF8 prefix; original and
transformed bytes/text/lengths are compared together with order and identity.

Eight full public-case literals cover each lane's complete 33-file/60-slot
capture, all-unknown revision failure, mixed include failure and a single unknown
first file. They preserve Module as Module, null captures as null, and original
E2 input-error/known-slot distinctions. The corrected test compares every normal,
repeat, zero-limit, wrong-revision, first-file-unavailable and include-failure
capture to these literals (twelve complete comparisons). Five additional explicit
synthetic cases exercise repeated/reordered harness occurrences and identical
source bytes under raw/non-strict/strict. Since the pinned public corpus has no
repeated include, these five cases invoke the actual private capture function
only in an isolated test copy. Its test-only export is never installed, never
creates a public selection token and grants no authority.

All original test assertions remain, apart from the gzip import and summary-line
additions. `run-8ompSu` passes 94 existing controls, six original actual records,
four input-fault records and all seventeen new complete capture comparisons.
`root-mutant-frAC7u` runs the complete corrected test against the exact root u0
mutant and rejects at `capture-literal/node/success`. No setup failure counts as
that result. `mutations-j5pMXq` independently exercises 55 isolated source mutants
in both lanes: each field corrupted and omitted, unit/slot/file reorder or
omission, duplicate units, Module relabeling, self-consistent removal of the
strict prefix, null-to-empty and input-error changes. All 110 captures complete
and are then rejected by whole-literal comparison. Thirteen unmutated private
capture cases pass first. Full mutated capture outputs are retained losslessly.

The production/input implementation hash remains
`4fc40ed011acacc56f217d06949c9b9790f9cd1ffb2412294a0d6258e67d0547`.
These are host-only capture/oracle checks; a native lane label is not native guest
execution. Complete execution certification remains deferred exactly as above.
The corrected design still requires root actual and independent second review.
