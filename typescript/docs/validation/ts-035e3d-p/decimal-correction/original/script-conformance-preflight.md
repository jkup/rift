# TS-035E3d-P: closed conformance preflight control prerequisite

Revised design after checkpoint `56fd992`, accepted base producer/input snapshot
unchanged. Root actual and independent second review approved design continuation
along alternative 5: stop at the actual designated harness. This document and
the correction manifest freeze a **design candidate only**. Implementation,
publication, admission and successor work require separate acceptance.

The original stop document is retained byte-for-byte in
`validation/ts-035e3d-p/correction/original/script-conformance-preflight.md`.
Every original checkpoint evidence file remains unchanged. The original verifier
and manifests are historical; their old main-document hash is resolved to that
saved document by the new verifier, never regenerated.

## Decision and scope

Freeze one closed control producer prerequisite, sharing the actual private
Attempt construction with the accepted main producer. It permits null preflight
only for a distinct request purpose, executes original assert.js and sta.js (or
assert.js, sta.js, sta.js), then one fixed H7/I01 harness control, and returns
that actual harness operation before preparing the trailing dummy test. It does
so even if `report.passed` is false. No mode/stage/Realm relabeling, fabricated
preflight ID or weakened decoder invariant is used.

This resolves the reviewed mismatch: C positives normally continue to the dummy
test, while both conformance decoders correctly reject nonraw test-stage results
without preflight success. A harness result with null preflight is representable.
Its corpus classification may be harness-error; that is not a control verdict.
The alternative separate preflight result protocol would require a larger new
schema/decoder. Reusing observation labels, inventing IDs, raw controls, or
relaxing existing decoders remain rejected alternatives.

The slice does **not** certify conformance host services, create a parent
launcher, or mint preflight success. A source-bound dispatch descriptor is
retained as design data, distinct from execution/run/nonce/result identity.
It records actual construction and control extensions, complete proposed source
closure and full literal-input file identities. It is not exported by production
and cannot be loaded as authority. Complete source-to-build/toolchain binding,
target-variant agreement, generic includes, parent transport/archive/owner,
receipts and F admission remain separate designs. E3c stays input-only.

## Exact whole-file implementation proposal

The sole authoritative mapping is
`validation/ts-035e3d-p/correction/proposal-manifest.json`.

| Target | Complete proposed change |
|---|---|
| `src/script-observation.ts` | Add a private default-false Attempt flag and a return after existing cleanup/history/verification/projection; append closed request/source validation and two exports. Existing E3b parser and producer bytes remain unchanged. |
| `test/script-observation.ts` | Add one purpose branch to the existing control executable. Validate before reads, read all files before producer invocation, then write child and report exclusively. Original observation branch remains unchanged. |
| `tools/test262/script-producer.test.mjs` | Only extend its exact export-set assertion by the two new names. All prior assertions and fixtures remain. |
| New `tools/test262/script-preflight-producer.test.mjs` | Full frozen literals in both compiled hosts; direct boundary errors, repeated fresh construction, return-data isolation, fully present negative inputs, missing late input and exclusive-output failures. |

No new native entrypoint, gate or package command. Existing control entry is
already covered by the 71-entry build. No main driver/CLI/profile/manifest/registry,
E1/E2 ownership, E3c, decoder, serializer, classifier or historical test rewrite.
Three replacements and one addition only; no public request-record type.

New runtime exports in `src/script-observation.ts`:

```ts
validateConformancePreflightArguments(args: string[]): void; // arity1
produceConformancePreflightControl(args: string[], sourceTexts: string[]):
    { child: ChildV2; report: ScriptControlReport };           // arity2
```

These are synchronous trusted host string-array utilities, like accepted E3b.
Extra array properties are ignored and inherited indexed strings are accepted.
Proxies/accessor side effects and arbitrary hostile objects are outside this
boundary. Function `.length` is fixed; extra JS function arguments are not an
authority mechanism. No callbacks, ASTs, Realms, injected readers/verifiers,
arbitrary profile, public registration/mint/load or token conversion exists.
All request records are private, including
`PreflightRequest={control:string,input:string,observation:ScriptObservationRequest}`.

## Exact argv and closed source contract

Only the existing **test control executable** adds this route:

```text
conformance-preflight-v1 CONTROL INPUT conformance strict execute
  NONCE REQUEST_SHA - RESULT
  SOURCE_UNITS PARSE_DEPTH STEPS CALLS EVALUATION_DEPTH WALL_MS OUTPUT_BYTES
  UNIT_ID ROLE SOURCE_PATH [UNIT_ID ROLE SOURCE_PATH ...]
```

Positions0–16 are the header; triples begin at17. Exactly29 or32 strings:
four or five occurrences. IDs u0..uN, every role harness except final test.
The penultimate occurrence is the designated control. Paths must be nonempty;
the producer treats paths as data, while the driver reads them in order.
`CONTROL` is exactly B01–B16, N01, N02 or I01; `INPUT` alpha or beta. No loop,
U01, guest-getter, S01, arbitrary observation control or caller control text is
admitted by this new route. Mode conformance, variant strict, action execute,
preflight `-` are fixed. Raw, non-strict and parse-only reject. These constraints
describe the control run, not a certified corpus target variant.

All seven limits are explicit decimal nonnegative safe integers; leading zeroes
are accepted. Source units100000/parse128/evaluation256 are fixed; wall must be
at most2147483647. Steps/calls zero are supported, and wall/output are retained
caller/parent limits rather than enforcement inside this child. No defaults.

All sourceTexts entries must be strings and match the exact occurrence count.
u0 is the whole original pinned assert.js. The next one or two occurrences are
the whole original pinned sta.js. Penultimate is the exact literal source for
the selected control/input; final is exactly `"use strict";\n`. Full originals
including comments and line endings are embedded in the proposed private
validator, with license attribution, not abbreviated helper replacements.
Byte identities and all original/transformed occurrences are retained in
future-literals.json. No concatenation, injection or harness transformation.

The output ChildV2 remains unchanged: mode conformance, null preflight,
harnessValidated=false and testBodyEvaluated=false. Successful designated
harness completion joins completedUnits; abrupt completion does not. Earlier
preparation/evaluation failures retain the actual earlier occurrence and prefix.
Report remains exactly `{version:1,nonce,control,input,passed,observed,effects}`;
it is data, not a credential. The caller-supplied request SHA is syntax-checked
but not authenticated by this producer; the unchanged decoders check the saved
full binding. Purpose/control/input are also retained separately in the literal
outer control contract and must be privately bound by a future parent. A hash
alone cannot certify that contract.

## Error order, effects and construction

All new validation errors use `script-preflight/`. Whole-file proposal order is:
array/indexed-string `arguments`, exact `argc`, `purpose`, `control`, `input`,
`mode`, `variant`, `action`, `nonce`, `request-hash`, `preflight`, `result-path`;
seven decimal `limit` checks; ordered triple `unit`; `fixed-limit`; `wall-limit`.
Producing repeats those checks, then `source-texts` shape/each entry, ordered
`harness-source`, `control-source`, and `test-source`. All occur before Attempt
allocation. A late bad role precedes fixed-limit checking. Read failures in the
driver precede source-content validation because all files are read first.

After validation the producer allocates `new Attempt(observation,"conformance",true)`,
then invokes only the existing fixed `controlSetup`, then runs. It shares the
real constructor, bootstrap and registered identity maps; it does not accept a
descriptor telling it which constructor to use. B09 registers a distinct other
Script Realm and its actual ReferenceError. No other new-route control installs
a guest-callable host service. Original observation/main calls omit the flag and
retain their exact behavior. Attempt never escapes this producer.

The new return is after the existing evaluate finally/monotonic-state check,
original history check, fixed control verification and `this.observed(unit,observed)`.
It returns that exact answer immediately for the designated occurrence without
consulting `verified`. It cannot prepare/instantiate/evaluate the trailing test.
Earlier failures still return through existing branches. Source/Realm identities,
constructor getters, receivers, original/secondary abrupt provenance and
resource/unsupported priority remain owned by the original evaluator/projection.

Driver child and `.control.json` writes use wx. They are sequential, not atomic:
if report write fails, a complete child file can remain. Catch behavior is the
unchanged `Script observation driver fault` newline/exit70. Generic exit70 is
not a no-IO/no-Realm oracle and creates no success. Missing final source prevents
producer invocation by the read-all ordering; preexisting result is detected only
at the late exclusive write, after control evaluation. Future parent authority
must reject incomplete artifacts, even if the surviving child looks successful.

The driver's pre-read validation guarantee applies only when argv0 selects the
new purpose branch. Other prefixes retain the old observation route, including
its legacy IO order. All64 malformed argv cases have direct exact API errors;
57 select the new executable branch and are tested there in both hosts, plus
all7 source negatives with present files. The seven other-prefix/count cases
are not falsely described as new-route no-IO tests.

Every control call gets a fresh Attempt. No preflight object survives into a
main run. A future parent must discard all control ASTs/Realms/sessions/globals/
callbacks/completions, recheck bytes/build and reload full original occurrences
into a fresh main Attempt. This slice does not implement that parent or claim
preflight success merely from its child/report data.

## Independent literals, mutations and bounded evidence

`future-literals.json` freezes160 full argv/source/original-byte/request/binding/
child/report/stream records: 19controls ×2inputs ×2layouts ×2hosts =152, plus
eight B01 zero-step/zero-call records. The expected result table is authored from
the original H7 contract and explicit pinned throw sites; no proposed producer
or engine generated it. Both future hosts must match every complete child and
report, then decode against that full frozen binding. All streams are empty,
status0/signalnull for these completed children, including controlled resource
results. No generic successful status establishes correctness.

Normal B01/B05/B11/N01 stop at the designated harness with its ID in the prefix.
The other H7 controls preserve exact original throw site, constructor outcome
and internal identity/message checks. Repeated B12 identifies sta occurrence2.
B16 is primitive guest7; I01 is guest7/11 and records [7]/[11]. I01 source columns
are38/40, checked directly against the full original lines. Zero steps stops at
u0/instantiation, line16 column10, count1/limit0; zero calls stops at B01/body,
column15, count0/limit0, full prior harness prefix, reportfalse. These are future
execution requirements, corroborated by retained H7/C source/history, not fresh
runtime results.

Offline checks load only the exact extracted pure proposal boundary and existing
codec. They check160 full prepared records,64 malformed argv cases,7 full-source
mismatches, array/shape/zero/leading-zero behavior and13 actual pure-source
mutants. Existing codec accepts all160 independently authored child literals.
The1280 changed full-output comparisons only validate the frozen oracle's
field sensitivity; they are not executed engine mutants.

The future test pins the exact raw literal/negative files and independently
enumerates all160 IDs in order. A separate offline audit rejects13whole-bundle
mutations, including omission, reordering, repeated occurrence collapse and a
self-consistent nonce/request-hash/child/report/argv forgery that the codec
correctly accepts as data. Expected literals never come from that codec result.

The exact proposed run method is separately exercised in an explicitly inert
orchestration reduction: nine independent traces cover normal/false verification,
earlier failure, designated abrupt/resource/unsupported, preparation failure,
same-instance host throw cleanup and unchanged main fall-through. Its five
source mutants (no stop, only-verified stop, first-harness stop, omitted verify,
omitted cleanup) reject. There is no real parser/AST/Realm/evaluator in this
reduction and no production API gains injection. It proves stopping/order only,
not guest semantics or native compilation.

The exact proposed driver branch has six inert IO-order traces and three source
mutants: validate-before-read, read-all-before-producer, and wx writes. The
report-write failure explicitly retains the earlier child; no atomicity or
success claim is inferred. These local stubs never enter the production API.

Initial authoring failures are retained: the source-site assertion caught an
incorrect I01 column before any literal file was created; an initial data mutant
was a no-op on zero-step records; the first inert projector lacked the nested
result field expected by the exact run method. Their source/probe directories
and a diagnosis remain in correction history. No production fix, oracle learned
from guest output or historical hash regeneration followed these failures.

## Required implementation acceptance and deferred matrix

| Coverage | Exact requirement/status |
|---|---|
| New route | All160 full both-host child/report/binding literals,64argv/7source direct errors, malformed driver inputs with every original source present, fresh main construction, repeated calls, output isolation and six late IO controls. Future test proposal is complete; not run during design. |
| False report / no test entry | Nine exact inert traces/five actual reduced-source mutants now; implementation review must confirm exact branch remains unconditional after verification/projection. Every actual positive child must be harness/body with full prefix and body=false. |
| Actual constructor/receiver/source/finally | Existing H7 identity/message/repeated occurrence and B/C constructor/getter/source controls must replay against freshly compiled affected source. They remain unchanged; no new-route widening to those host controls. Preserve original/secondary/inspection Realm and shared budgets. |
| Parse-only/raw/mode/role | New route explicitly rejects parse-only/raw/non-strict/observation mode; E3b still rejects null nonraw preflight. Original E3b full parse-only harness/test and raw matrices and C observation controls replay unchanged. No generic-control interpretation. |
| Host/unsupported/resource priority | Eight full low-budget new literals plus unchanged C/H7 host/unsupported/shared-budget/cleanup controls. Their exact original fixture bytes/expected streams remain protected. New fixed H7 route does not add arbitrary fault callbacks. |
| Reached-loop timeout negatives | Unchanged H7 corrected timeout contract and C guarded-loop controls must replay: exactly one reached-loop marker, real deadline, prep/no-marker/duplicate-marker negatives. New route rejects loop; no fake new preflight timeout-success row. |
| Source/build/data mismatch | All exact source/control/input mismatches before construction; both codecs remain unchanged. Full external build/host-service descriptor verification and target-context mismatch belong to the deferred parent, not this data producer. |
| Denominator/authority | Full original E1/E2/E3c input snapshots, Module/nullslot and60blocked19/41 reports remain protected. No token conversion, register/mint/load, receipt or activation. |

Implementation must use fresh Node/native builds, retain all71 static-only and
zero-dynamic gates plus212 original guest records both lanes, and replay affected
E3b/A/C/B/H7 and new tests in isolated output trees without historical writes.
No stale binary can prove this new branch. Compiler/semantic/schema uncertainty
must be retained/reduced/reviewed, not patched by changing pins or literals.
The design has run no build/full suite/guest/conformance process.

The original construction audit below remains binding context; its current
48-member driver graphs and complete inventory are augmented by the exact
three-replacement/one-addition manifest and dispatch descriptor. Full host-service
certification, generic harness includes, private parent ownership, preflight
result authority, toolchain/build certification, archive/receipts and F are
explicitly deferred. Stop after this design/evidence commit for actual/root and
independent second review before implementation.

## Actual construction and callback identity

`src/script-observation.ts` is the sole private Attempt owner. Main observation
and conformance producers both allocate its `new Realm(throwingSink,"script")`.
The constructor registers that exact Realm as `test`. Source projection uses
Maps keyed by real ExecutableScript and Realm identities, checking recorded
unit ID too. An ID string cannot substitute for registration. Conformance mode
only changes wire data. There is no conformance parent or grant in this route.

The initial main global own properties are undefined, NaN, Infinity, console,
Number, Error, TypeError, ReferenceError, RangeError, SyntaxError, String and
Object. Number is the current partial namespace, not a constructor. Function,
Array, Boolean and Symbol prototype objects and conversion callbacks exist in
the Realm, but that does not install corresponding guest global constructors.
There is no `$262`, `$DONE`, print or arbitrary host-service registration in the
main Attempt. `console.log` formats its arguments with the existing `display`
routine and invokes the sink, which throws `unexpected Script output`.
It is neither a successful logger nor an absent global. The driver catches host
faults and reports its generic exit70, which cannot prove the cause or no effects.

Realm bootstrap creates distinct object/function/array/primitive prototypes,
five error prototypes/constructors, restricted function properties and conversion
methods. It then installs globals and the script-only Error/String/Object
registrations. The complete source graph, including all registration modules,
runtime objects, parser, static plan, evaluator and Script private owner, is in
the audit. Source hashes must bind this actual sequence, not a manually assigned
profile name. `guardBuiltin` checks profile and consumes a private invocation
permit bound to actual callback, receiver, args and location. Constructor
permits are separate. Main host-service identity must include these paths.

Control setup is an explicit extension of that construction, never its alias:

| Setup | Additional state and observable behavior |
|---|---|
| S02 | Nonwritable, nonconfigurable `reserved` binding. |
| S01 / loop | Guarded `observe` / `entered`; actual active record, body phase, Realm and context checks; loop marker only at reached guest entry. |
| B09 / registered-other / guest-other* | Distinct Script Realm, registered as `other`; B09 transfers its actual ReferenceError as `Other`. |
| unregistered / foreign | Unregistered Script Realm / legacy-profile Realm; neither may be projected as main `test`. |
| U01 | `unsupported` callback invokes actual map/species unsupported path. |
| X03 and constructor/name/guest controls | Actual target and ctor objects, getter receivers, ordered C/N effects; secondary sentinel and completion identities; guest getter installation on the actual selected Realm. |
| B/N/I controls | Fixed assertions of original constructor/prototype/message/value identity; no generic successful exit oracle. |

The additional Realms use the distinct throwing `control output` sink. A future
descriptor must retain main construction and each closed extension separately,
including all callback sources. It must not install B09's `Other`, S01's
`observe`, `entered`, `target`, `ctor`, `sentinel` or U01's service in corpus runs.

## Execution invariants that the first proposal must retain

Each Attempt has a new session; every ordered harness and test shares that
session's step/call budget. `prepareBoundedScript` runs sequentially, so a current
source-size rejection precedes that unit's evaluation, while an earlier harness
failure precedes a later source's preparation. Parse-only still evaluates all
harness occurrences; it prepares but does not instantiate/evaluate the test.
Raw permits exactly one test and null preflight. Seven explicit limits retain
source100000, parse128 and evaluation256; steps/calls zero are values. Parent
wall/output enforcement is not supplied by the producer's data fields.

Observed throw inspection performs actual Get(constructor) with thrown value as
receiver, then Get(name) with constructor as receiver. It preserves original
record/source/Realm while separately capturing secondary abrupt inspection.
Resource/unsupported completions bypass ordinary throw conversion. The private
evaluator restores active Realm, frame, call count and depth in finally, and
restores original abrupt history after inspection; steps remain monotonic.
Attempt additionally checks cleanup and original record/Realm/location identity.
Any future stopping path must remain inside these mechanisms.

Successful preflight must discard every control AST, prepared record, Realm,
session, global, callback, thrown object and completion. Reload whole original
harness bytes in occurrence order into a newly allocated main Attempt; do not
reuse a prepared record, share a mutable object or import a control Realm. The
fresh attempt restarts its own budget; within each attempt all original harness,
control and inspection work shares one monotonic budget. Recheck unchanged
bytes and the complete source/build binding before this reload and at eventual
launch. A stable descriptor contains neither nonce, run ID, preflight result ID,
attempt ID nor receipt ID. Equal stable data never mints success.

## Closure and immutable original inputs

`closure-audit.json` inventories all 270 tracked live TS/JS/MJS/CJS files under
src/test/tools with hashes, import lines and numbered relevant references, all
2,088 historical source/script files separately, and 1,161 import edges. The two
driver entry graphs each conservatively include 48 project members, counting
type imports. Core facade exports lead to `script-execution-internal.ts`, not a
second implementation. The audit also enumerates E3c input, E2 ledger, C parent
and both codec entry closures. This is a lexical graph, not a claim that regular
expressions certify arbitrary dynamic imports or runtime external packages.

The future source/build closure must include every actual src TS, main/control
drivers, input/policy/ledger/snapshot/parent helpers, both codecs and classifier,
fixed manifests and rule registries, all fixtures and LICENSE, package/lock,
tsconfig, native build script and coverage verdict. Node generated modules and
the actual Node executable, native driver/control binaries and their build
provenance, YAML contents, scriptc/TypeScript packages and native linker/sysroot
contents must be resolved explicitly. Those external member lists and
source-to-build certification remain **unresolved**, not empty/default fields.
Two C/E2 summary digests do not close these dependencies.

Full original assert.js, sta.js, LICENSE, C frozen rows/control registry, H7
literal rows and corrected timeout contract are retained byte-for-byte as base64
with byte lengths/hashes. Harness order is assert then sta; a repeated sta is a
distinct occurrence with a newly created constructor and record. These are input
evidence, not newly executed H7 or conformance proof. E3c retains the full E2
anchor, Module and null-slot denominator; input identity stays executionBinding
null/admission blocked. E1 registry stays empty; all60 blocked (19 feature/41
profile), executed0/body0 remains inherited evidence, not a newly run suite.
