# TS-035E3b-P: producer prerequisites and first implementation slice

Design/evidence candidate against `61f74934ca2926e5b81ed1b9cad28494f5da47ff`,
with accepted E3a `ce87f62`. This is not admission or permission to launch the
corpus. Only the four files in the two proposal manifests below are frozen for
a separately assigned implementation. No production file is changed here.

The actual E1 registry remains empty. Fresh public E2 calls in both lanes retain
all 60 blocked variants: 19 unsupported-feature and 41 unsupported-profile,
zero executed variants and zero body entries. Module/input-error denominator
rules remain intact. The prior **212 guest records per host and 71 native gates**
remain retained evidence, not rerun results. C++ and all earlier evidence are
covered by the preservation manifest.

## Decision and dependency order

| Slice | Smallest coherent change | Decision |
|---|---|---|
| 1: explicit child producer | New typed request validator; dual-mode driver; private Attempt mode; new producer wrapper; exact both-host future literals | Freeze below. Does not import E1/E2, classify, verify preflight, launch through C, or mint receipts. |
| 2: stable admission selection | New closed execution-selection version/schema, complete stable closure and per-slot decisions, preserving original E2 selection anchor and denominator | Deferred. Do not add execution fields to E2 or activate entries. Requires separate full proposals and literals. |
| 3: host services, preflight, archive | Fixed host-services descriptor; matching conformance controls; discard control Realms and reload original ordered harness into fresh attempt; complete artifact schema | Deferred. Existing C observation preflight is insufficient certification. |
| 4: parent receipt/ledger owner | Lexical transport facts, private receipt map and synchronous append/spend; new full reports and persistence failures | Deferred until 2–3 are frozen. No new public mint/load/register/append-envelope or injected verifier. |
| F | Reviewed registry entries and actual conformance launch | Still separate. None of these documents certifies a corpus file. |

A parent-only mode change fails today: the installed driver rejects conformance
and the installed Attempt serializes `script-observation`. A child-only change
would retain that contradiction in argv. Moving classification into the producer
would duplicate a shared predicate and falsely mix guest evaluation with parent
transport. Freezing the entire E3b owner now would depend on unresolved selection,
preflight and artifact schemas. Slice 1 therefore changes driver and producer
together and returns only ChildV2 data.

The new public producer function has the same kind of engine-execution utility
as the existing observation function. Its output is forgeable data. It neither
consults nor bypasses an admission API: no production admission execution API
exists yet. A directly invoked child may label its output conformance; that label,
a correct request hash, `harnessValidated`, and a preflight ID never authorize
execution-ledger append. Actual E2 rejects all such foreign objects.

## Exact first-slice files and API

The full files, not snippets, are in
[`validation/ts-035e3b-p/proposal-manifest.json`](validation/ts-035e3b-p/proposal-manifest.json)
and [`new-file-manifest.json`](validation/ts-035e3b-p/new-file-manifest.json).
Each replacement includes original and proposed SHA256; each new file includes
its exact SHA256. `verify.mjs` checks all complete bytes and 6,790 protected files.
Its `--implemented` option permits only those two exact replacements and the two
exact new files. There are **no old-test replacements**: their required assertions
and source identities are unchanged. No build script, package, profile or CLI change.

| File | Exact change |
|---|---|
| `src/script-observation.ts` | Import pure request validator/type. Private Attempt constructor gains second mode parameter, default observation. Envelope uses that mode. Append `produceConformanceScripts(request: ScriptProducerRequest): ChildV2`. Original observation/control entrypoints and all evaluation/inspection logic stay byte-identical apart from these two private substitutions and import. |
| `src/script-observation-driver.ts` | Import new parser and producer. A conformance branch runs before the untouched legacy observation argument checks. Parse all controls, read every source in order, call producer, serialize same ChildV2, write result with `wx`, return. Original observation write behavior remains unchanged. |
| **new** `src/script-producer-request.ts` | `ProducerLimits`, `ProducerUnit`, `ScriptProducerRequest`, `ScriptProducerArguments`; `parseScriptProducerArguments(args: string[]): ScriptProducerArguments`; `validateScriptProducerRequest(request: ScriptProducerRequest): void`. Pure data validation; no imports, IO, Realm, tokens or callbacks. |
| **new** `tools/test262/script-producer.test.mjs` | Implementation-only test: 66 complete child literals, 114 malformed driver invocations across both hosts, pure parser precedence and eight late failures. Design does not execute this file. |

All three new functions have one formal parameter. They use the existing trusted,
ordinary host-data convention, not a hostile JavaScript object API: no promise
about getters, Proxies, symbols, nonenumerable keys or argument-count rejection.
The public authority APIs remain separately descriptor-checked. Request fields
are exact enumerable string keys for ordinary objects; the OS driver receives
only positional strings and constructs its own records, never JSON.parse.
Wrong typed object structures can throw native TypeError; no guest completion
or structured driver result is promised for malformed requests.

`ScriptProducerRequest` is exactly:

```ts
{
  mode: "conformance";
  variant: "raw" | "non-strict" | "strict";
  action: "execute" | "parse-only";
  nonce: string; requestSha256: string; preflightId: string | null;
  limits: {
    sourceUnits: number; parseDepth: number; steps: number; calls: number;
    evaluationDepth: number; wallMs: number; outputBytes: number;
  };
  units: { id: string; role: "harness" | "test"; text: string }[];
}
```

The parser returns `{request,resultPath,sourcePaths}`. Its unit texts are empty
placeholders, not source snapshots. The driver fills them from all files before
the producer validates actual text. The producer copies unit records into its
existing observation-shaped execution request. Its private Attempt is the sole
creator of the production `test` Realm; a caller cannot supply a Realm, AST,
session, callable, constructor map, inspection result or control setup.
The separate existing control executable remains observation-only.

## Exact argv and validation precedence

The **old observation argv stays byte-for-byte compatible**:

```text
script-observation ACTION NONCE REQUEST_SHA PREFLIGHT_OR_- RESULT STEPS CALLS
  UNIT_ID ROLE SOURCE_PATH [UNIT_ID ROLE SOURCE_PATH ...]
```

The new conformance branch accepts:

```text
conformance VARIANT ACTION NONCE REQUEST_SHA PREFLIGHT_OR_- RESULT
  SOURCE_UNITS PARSE_DEPTH STEPS CALLS EVALUATION_DEPTH WALL_MS OUTPUT_BYTES
  UNIT_ID ROLE SOURCE_PATH [UNIT_ID ROLE SOURCE_PATH ...]
```

Exactly 14 header positions and one or more triples: `argc >= 17` and
`(argc - 14) % 3 == 0`. No flags, JSON request, module goal, control name,
expected negative, classifier, receipt, source text or Realm descriptor in argv.
Node uses `node build/node/src/script-observation-driver.js ...`; native uses
`build/native/script-observation-driver.exe ...`. These are future test commands,
not commands run in this design.

Parser rejection order, with exact `script-producer/` error suffixes:

1. `argc`, `mode`, `variant`, `action`, `nonce`, `request-hash`, `preflight`,
   `result-path` in that order. Nonce/preflight are nonempty printable ASCII
   without spaces; hash is exactly 64 lowercase hex. `-` represents null only
   in the preflight argv slot; nonce `-` remains a valid identifier.
2. Seven decimal parsers in displayed order: nonempty digits, safe integer;
   otherwise `limit`. Leading zeroes are accepted, numeric value retained.
3. All triples in order: IDs `u0...uN`; only the last role is test, all others
   harness; nonempty file paths; failure `unit`. No source file has been read.
4. Request validator: `fields`, `mode`, `variant`, `action`, `nonce`,
   `request-hash`, `preflight`, `limit-fields`, every finite nonnegative safe
   integer (`limit`), fixed limits (`fixed-limit`), wall upper bound (`wall-limit`),
   nonempty `units`, each `unit-fields` then `unit`, `variant-preflight`.
   Thus malformed later role beats a numerically valid wrong fixed limit;
   nondecimal limit beats malformed later role. Both combinations have literals.
5. Read all source paths in order. First native read error wins; no Realm or
   harness has been created. Missing late file prevents evaluation of early units.
6. Producer repeats full request validation, then for strict requires the exact
   test prefix `"use strict";\n`, failure `strict-transform`, before any Attempt.
   The parser's internal metadata-only validation does not inspect placeholders.
7. Allocate fresh Script Realm/session; evaluate units with existing ordering.
   Serialize ChildV2; exclusively create result. Any driver fault, including
   read, strict-prefix, host evaluation or write failure, has existing stderr
   `Script observation driver fault\n` and exit70. A failed output open preserves
   an existing file. An interrupted/failed write can leave partial child bytes;
   the parent must independently validate/archive them. No receipt follows.

SourceUnits=100000, parseDepth=128 and evaluationDepth=256 are fixed engine
limits. Steps/calls are forwarded exactly, including zero. WallMs is a safe
nonnegative integer no greater than 2147483647; outputBytes is a safe nonnegative
integer. **Wall and output enforcement remain parent responsibilities**, not new
guest guards in this child. Their presence prevents silently defaulting supplied
controls; a direct child is not a bounded trusted transport. Every limit is in
the future parent's canonical request digest and saved decoder binding.

Raw requires one test unit and null preflight. Non-strict/strict require a nonnull
preflight ID even if their first unit later fails. This is intentionally stricter
than the decoder's permission to describe a failed preflight harness: the main
conformance child is not the preflight executable. Nonraw may contain zero harness
units if a future reviewed selection requires none; presence of an ID is only
structural data. Only the future owner can establish that its controls passed.

Strict prefix checking is not proof of the original file or transformation.
For raw/non-strict, original text must be forwarded unchanged by the future
parent; strict is exact prefix plus original bytes. The child neither hashes
originals nor recreates metadata. It uses the supplied transformed text, and
the parent must retain exact bytes, original blob/SHA, transformed SHA, UTF16
units, byte lengths, duplicate ordered include occurrences and variant identity.
Equal raw/non-strict text is not interchangeable certification.

After reads/validation, semantic priority is unchanged: prepare current unit;
if rejected return its parse result; otherwise evaluate that unit; only successful
harness body evaluation adds to completedUnits. A later oversized source cannot
outrank an earlier harness step failure. An oversized current unit outranks that
unit's step budget. Parse-only still evaluates the harness, but prepares only
the test. No eager parse of all units is introduced.

## Ownership and consumer/build closure audit

`closure.json` inventories all 169 tracked source/test/tool TS or MJS files with
SHA256, imports, exports, and numbered producer/decoder/policy references.
`historical-consumers.json` adds 322 validation-script consumers with exact hashes
and numbered references, including E2 and E3 source-identity checks.
It is an audit inventory, not an execution certification hash. Important edges:

| Boundary | Actual ownership and effect of slice 1 |
|---|---|
| `input.mjs` | Existing original-byte/manifest/pin/metadata/ordered-harness owner; transformations remain here. No new path for callers to supply a capability. |
| E1 `script-capabilities.mjs/json` | Canonical empty registry; debt reconstruction still adds runtime:coverage. No observation/control/constructor result clears it. |
| E2a `script-plan.mjs` | Private selections, three exports, policy `rift-script-blocked-v4`, exactly 242 closure files. Eight explicit project files + Node + YAML tree. Producer/source/build/result files are absent. Slice 1 does not change policy IDs, selection literals or plans. |
| E2b/c `script-ledger.mjs` | Eight exports, private policy ledger/store/checkpoint maps, policy v2 only. No receipt map. Reopen transfers only policy ownership and revokes old handle. New child/result data cannot restore/mint authority. |
| C `script-observe.mjs` | Private plans/bindings/context/preflight/processAttempt; only observation preparation/validation/launch exported. All `src/*.ts`, observation fixtures, harness fixtures, package/lock/config/build tools in source closure. New helper automatically enters it. Node built closure includes all generated src JS and control; native includes driver/control executable hashes. All old C plans become stale; new observation plans naturally use new hashes. |
| C adapter closure | `script-observe.mjs`, both decoders, input, Node and YAML. E1/E2 omitted; combining C/E2 summary hashes is not enough for future admission closure. |
| Producer | Driver -> new parser -> existing observation module/Attempt -> bounded preparation/session/evaluation/throw inspection -> Realm/runtime. Existing serializer/types have mode union already; no wire-version or decoder change. |
| Throw ownership | `script-throw-inspection.ts` and execution internals own actual completion, original record, source snapshot and active Realm. Existing Attempt maps record identity/Realm identity before projection. No name/message reconstruction and no control injection. |
| Shared result | E3a `composeScriptEnvelope` remains data-only in `script-result.mjs`; the classifier stays private and single. Independent `script-driver-result.mjs` remains unchanged. |

Direct consumers include `test/script-observation.ts` and D1/D4/D6/D8 dispatch
drivers, C input/preflight/launch/live-codec/codec tests, A result decoder tests,
E3a compose tests and inherited E2 policy consumers. All continue using old
observation exports or unchanged codecs. `script-observe-codec.test.mjs` checks
the complete original decoder prefixes plus exact E3a suffix SHA; neither changes.
`script-compose.test.mjs` reads frozen A fixtures; no source migration. Existing
`tools/build-native.mjs` already gates the observation driver/control and D
consumers: the helper will be reachable from those entrypoints. No extra gate is
silently added or removed. `tsconfig.json` includes new src automatically.

Historical D preservation scripts intentionally compare old production snapshots;
E3-P/E3a preservation inventories also pin source files. They are historical
evidence, not tests to edit into accepting new bytes. The new exact whole-file
verifier supplies the two-file exception over the actual accepted baseline.
Do not rerun a historical verifier against a changed checkout and rewrite its
outputs or generically allow arbitrary new source hashes. E2's live policy closure
is independently checked in the fresh actual selection evidence, not inferred
from whether an old preservation script passes.

## Deferred parent contracts: constraints, not API authorization

Stable selection must bind canonical data **and** digest for pin, manifest, path,
blob, original/transformed source, goal/variant, five metadata fields, ordered
harness occurrences/bytes, seven limits, engine source/build/adapter/toolchain,
host/platform, runtime/rule registries, host-services descriptor, preflight control
sources and complete Realm layout. It excludes run/attempt IDs, nonce, execution
ID, receipt ID, retry reason, elapsed/output hashes and preflight result ID.
Attempt binding adds those identities and full contexts without deleting stable
anchors. Neither E2 `execution:null` nor C's `rule:null/capability:null` certifies it.

Host services need a closed, versioned description of Script global installation,
output sink, guest-callable host functions, separate control-only additions and
their source/build closure. A string profile ID is insufficient. The main Attempt
currently exposes ordinary Script bootstrap only, uses a throwing output sink,
and registers only the `test` Realm. Preflight controls can add another Realm and
host callbacks only through the existing fixed control executable, which remains
observation mode in this first slice. Future conformance control dispatch and
descriptor equivalence require exact separate proposals. Passing old H7/D tests
does not automatically grant anything.

Successful future preflight must retain complete original control requests,
results and parent transport, then discard all control Realms/session/global
state. Reload exact original ordered harness into a newly created attempt Realm;
never reuse a preflight guest object, callback, global, completion or AST. Recheck
selection/closure after preflight, before spawn and before append. Failed preflight
must bind its control bundle separately; never transplant its child provenance
into the unentered corpus test envelope.

The archive must bind original and retained bytes separately. C hashes all pipe
chunks but retains only through the first cap-crossing chunk. Its streaming
stdout/stderr digests may differ from retained stdout.bin/stderr.bin digests.
Retain both names, both byte lengths, cap crossing count, all actual child-file
bytes/hash (nullable when absent), full context/request/binding/transport/record,
preflight bundle, paths and presence/absence. Re-serialized child JSON is not the
original child-file hash. Exclusive `wx` in slice 1 prevents existing-leaf
overwrite, but does not certify ancestor aliases, partial writes, close errors,
source races, archive durability or parent ownership. Those need the future
exclusive nonaliased archive schema and failure matrix before receipts.

Keep future execution-session, receipt and admitted-ledger maps lexically inside
the actual parent transport owner, as proposed in E3-P. Capture actual spawn,
exit/close, deadline, cap and cancellation events there. Public C plan/result data
and its `transport.json` are not authority. Do not import a publicly callable
mint helper, accept caller receipts, inject a verifier, load JSON authority or
move E2's policy maps. The precise execute-and-record API is deliberately unfrozen.

Cancellation before spawn or after kill leaves unfinished archive/missing slot,
no terminal or receipt. Otherwise retain existing priority: deadline; crash before
cap/non-cap signal or nonzero exit; output cap; explicit spawn fault; malformed
or missing child protocol; shared classifier. Kill failure and later crash do not
become an output grant. `processStarted` comes from actual spawn event, never from
exitCode, body flag or JSON. `testBodyEvaluated` requires validated test/body
operation; instantiation throw has body=false. Parent-only timeout/crash/output
envelopes have null operation/source/inspection and body=false. All six transport
arguments reach the shared inspector; a two-field fault summary cannot be wrapped
as a receipt.

Receipt mint/validate/append/spend must be synchronous and private after all
mandatory artifacts and full current-context checks. Reject without consuming
or mutating prior report/counters; successful append spends exactly once. Persist
failure cannot refund or revive. Policy checkpoints/reopen cannot transfer these
maps or restore spent state. New execution ledger/version/report and all eight
statuses, first-terminal headlines, retry-only attempt counts, missing/cancelled
denominator and partial-input accounting remain E3-P requirements. No execution
checkpoint/restart/power-loss guarantee is proposed here.

## Evidence, limitations and implementation acceptance

See the [evidence README](validation/ts-035e3b-p/README.md). Corrected offline run:
20 pure parser positives, 57 argv negatives, 21 ordinary request-shape negatives,
154 retained complete A codec fixtures, 5,976 real Buffer mutation rejections,
four transport-priority summary cases; actual both-lane 60-slot selections/reports.
Supplement: 66 complete future wire fixtures through both decoders/E3a where
applicable, 693 value neighbors and seven malformed-byte controls. None executes
a conformance child. Node/native labels on future literals identify required
future lanes, not measured runs.

The 66 full future requirements include both modes, all three variants, both
actions, zero/one harness, full bindings/contexts/envelopes, source and step
priority. Normal parse-only with no expected parse negative correctly classifies
host-fault/protocol, **not pass**. Eight future IO/strict-transform/output failures
retain exact driver exit/stderr and absence/original-file requirements. Retained
A literals cover all result shapes, original/secondary/inspection sites and Realm
neighbors, all seven limits, all eight statuses and serializer boundaries; they
are synthetic codec contracts, not proof that the production driver can create
control-only outcomes. Existing control executable/inspection regressions remain
required unchanged under both hosts after implementation.

Before acceptance of implementation: verify exact manifests; typecheck; existing
71-entry native build/static-only/coverage gates because producer/native code
changed; the new 66-literal/114-driver-negative/eight-late-failure test in both
hosts; unchanged A both-serializer lanes/two-input tests, C codec/live-codec and
172 transport integration, E3a constructor, D dispatch/observation/throw-inspection
affected tests, host73/observations22/runner20; retained full 212 guest records per
host and denominator checks. Run evidence-writing inherited suites in fresh
isolated copies. Do not reuse an old executable to claim new producer success.
No baseline weakening, arbitrary fixture rewrite, compiler pin change or new
dynamic-tier workaround. If native lowering, any literal, source identity or
transport behavior disagrees, retain/reduce and obtain actual plus independent
review before amending the proposal. This design has not established native
compilation or authentic future conformance transport.

Stop after this coherent design/evidence commit for coordinator actual audit and
independent second review. No publication, successor work, parent API, registry
activation, or implementation is authorized by the writer's completion claim.

## Review correction: malformed-driver oracle (2026-11-06)

Candidate `f873278` was not accepted. Its future malformed-driver test supplied
nonexistent source paths for every case, so skipped argument validation could
still appear to pass through ENOENT. The original test/manifests and all evidence
are retained. The correction changes only the new-test proposal and its fixtures,
manifests and documentation; both old-file source proposals and the new request
module remain byte-identical.

The corrected 57 cases per host are frozen in
`validation/ts-035e3b-p/correction/driver-negative-cases.json`: 52 ordinary controls
have existing files containing exactly `"use strict";\n0;`; four malformed-layout
cases (`short`, `extra`, `source-path`, `result-path`) are explicitly separate;
one `late-role-before-read` compound retains two deliberately missing paths.
All supplied SOURCE tokens in layout cases also get valid files; an absent/empty
argument is still intentionally malformed. No ordinary case can silently mark
its source missing. The proposed test checks exact bytes, token/path mapping,
approved missing-file declarations and result absence before each invocation.

Generic native/Node exit70 and no child **do not prove zero source reads, zero
Realm creation, or exact error precedence**. Even with existing files, producer
validation could reject after reads. Layout and explicit missing-path cases
have still weaker diagnostic discrimination. Exact pure-parser errors, checked
filesystem setup, static source ordering, and future generic driver rejection
are distinct evidence. Original `expectedReads:[]`/`expectedRealmCreations:0`
fields in the retained argv seeds are design requirements, not measured facts.
No production instrumentation, new error exposure, or test seam is proposed.

The correction's offline probe extracts the exact proposed test setup functions
into an isolated module, without importing or launching any engine. All 114
setups pass; 416 ordinary setup mutations reject; omission of source creation
rejects for all 52 ordinary cases; removal of the setup assertion is detected.
It verifies 51 unchanged original artifact identities, including every source
proposal. These checks establish fixture/harness behavior only. Actual and
independent second re-review plus root affected audit remain required.
