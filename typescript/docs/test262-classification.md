# TS-031P — Trustworthy test262 classification

Design for independent review, 2026-11-02; inspected Rift `19f2529` on
`codex/test262-classification`. No implementation or conformance result is added.
Accepted TS-030A remains 211/211 per host, 32 native static/coverage gates.
The [acceptance matrix](validation/ts-031p/matrix.md) is normative for this design.
The [research record](validation/ts-031p/README.md) distinguishes inspection,
inherited measurements and future acceptance requirements.

## Scope and invariant

Use exactly the 33 entries in the accepted [CL-004 manifest](../fixtures/assistance/test262-starter-corpus/manifest.json):
22 candidates S01–S22 and 11 unsuitable controls U01–U11. Pin tc39/test262 to
`91c70759363c46557b694792bf34a2551a7af5ba`. Do not import the C++ runner's
classification logic or broaden the corpus automatically. All assertions and
whole files remain intact. A negative passes only because the specified guest
error occurred in the specified phase, under the required execution conditions.
Matching diagnostic words is never evidence of that event.

Three modes are disjoint: `conformance`, `body-observation` (unchanged body,
without required harness), and `parser-observation` (parse only). Observation
records have no pass/fail field and never enter conformance numerators. Historical
CL-004 shim observations remain historical research, not a fourth supported mode.
Node hosts the Rift interpreter; Node eval, Function, vm and other engines must
never execute the guest program. The adapter is ordinary host orchestration;
Rift remains compiled once, reading guest inputs at runtime in both lanes.

## Current source boundary

At the inspected revision:

| Source | Consequence |
|---|---|
| `src/cli.ts` | Reads UTF-8 text, emits human diagnostics; exits 0 normal, 1 runtime throw, 2 parse diagnostic, 64 usage, 66 read failure, 70 host exception. No machine protocol exists. |
| `src/interpreter.ts` | `run` parses before evaluating, but returns only parse diagnostic or runtime Completion. No Script goal/profile argument or harness-stage distinction. |
| `src/syntax.ts`, `src/parser.ts`, `src/lexer.ts` | Diagnostic has phase/name/message/location only. Both fail helpers call everything SyntaxError, including unsupported forms and resource limits. |
| `src/runtime.ts: failure` | Guest thrown Value is a string made from name/message; diagnostic metadata is separate. It is not an Error instance. User throw also cannot be classified by its display text. |
| `src/evaluator.ts`, `src/realm.ts` | Strict-call/write subset, plain global Environment, top-level `this` passed as undefined; not ECMAScript global Script semantics. Guards produce RangeError diagnostics through `failure`. |

Lexer source cap is 100000 UTF-16 units; parser nesting cap is 128; evaluator
defaults are 100000 steps and 64 calls, with nesting capped at 256. Record
the actual configured limits; do not raise or remove them to earn passes.
TS-030A supports arithmetic compound assignment, so CL-004's earlier `+=`
harness rejection is obsolete as a *current* observation. Other harness syntax
remains unsupported. No current harness result was measured in this design.

## Input identity and metadata

Retrieve each path at the full pin as bytes, using raw download or Git object
extraction (not a checkout subject to autocrlf). Before decoding, verify the Git
blob SHA-1 of `"blob " + decimalByteLength + NUL + bytes` against the accepted
manifest. Also record SHA-256 and byte length. A mismatch, fetch failure, missing
file or invalid UTF-8 is `harness-error` with stage `input`, not an engine result.
Never repair line endings, append semicolons, strip comments/frontmatter/BOM,
transpile, or alter assertions. UTF-8 decoding must preserve CR/LF, U+2028/U+2029,
BOM and NUL code points; reject lossy decoding. U11 is the byte-sensitivity control.
For non-raw strict tests the only test-source transform is the exact ASCII
prefix `"use strict";\n`. Record original and transformed hashes separately.

The checked-in manifest is a selection/identity ledger, not a replacement for
frontmatter. Parse the verified original source's one `/*---`…`---*/` block as
YAML with duplicate-key rejection and no executable/custom tags. Require a
mapping and nonempty string description; optional flags/features/includes/locale
must be arrays of strings. Missing arrays mean empty. `negative`, if present,
must contain exactly string `phase` and `type`; phase is parse/resolution/runtime,
type is a nonempty constructor name. Never default a missing negative phase.
Retain descriptive/legacy fields (including es5id/es6id); do not require modern
esid on old corpus files. Compare execution metadata to CL-004; disagreement is
`harness-error: manifest-metadata-mismatch`, requiring review, not silent mutation.

Validate paths as repository-relative test/harness paths: no absolute path,
parent traversal, symlink escape or URL include. Includes must end in `.js`.
Missing includes are `harness-error`; known unavailable helper capabilities are
`unsupported-feature`. Neither is silently dropped. Unknown metadata keys or
flags requiring an unrecognized execution policy fail closed as `harness-error`
in this bounded adapter. Informational fields explicitly supported by the pinned
guidance are retained without affecting execution. `generated` changes nothing.

Reject conflicting onlyStrict/noStrict, raw/onlyStrict, raw/module,
module/noStrict, module/onlyStrict, raw/async, and both CanBlock flags as
`harness-error: incompatible-flags`. raw/noStrict is redundant but valid.
raw with includes retains metadata but loads zero harness files, as required by
raw. Unknown feature names are `unsupported-feature: unrecognized-feature`,
never evidence of support. Empty features does not certify syntax or semantics.
CanBlock/locale requirements without a verified matching environment are
`unsupported-profile`; non-deterministic tests are deferred as
`unsupported-profile: nondeterministic-policy` in this small adapter.

## Variant and profile planning

Plan all variants before capability filtering, with a stable identity
`pin:path:variant:lane`. Preserve input order, non-strict before strict.

| Flags | Planned variants | Test-source transform / goal |
|---|---|---|
| none, or generated only | non-strict, strict | unchanged / prefix; Script |
| onlyStrict | strict | prefix; Script |
| noStrict | non-strict | unchanged; Script |
| raw | raw | unchanged bytes, zero harness; Script, no imposed strictness |
| module | module | unchanged; Module, never strict Script |
| async | same variants as otherwise | async completion required; currently unsupported |

Raw source may itself contain a directive. Do not assume it is semantically
sloppy merely because no directive is injected. Current raw runs still lack
directive/Script support and are `unsupported-profile` (U03 also lacks ASI).
Module and async flags are `unsupported-feature` without launching a guest.
Resolution-negative metadata is valid only with module; reject its use on a
Script as malformed metadata. No module loader, Promise job loop, async marker
parser or alternate strict transform is part of the first implementation slice.

All non-strict/noStrict variants remain `unsupported-profile: sloppy-script`.
Strict variants are **not automatically supported**: inert directives and
strict calls do not establish strict Script, global `this`, global declaration
instantiation, or separate global lexical/object bindings. Initially they are
`unsupported-profile: strict-script-contract` too. A later reviewed capability
ledger may admit an exact file/variant after its Script behavior, whole-file
syntax and required harness paths are covered by engine tests. The ledger cites
tests and source hashes, never expected pass results; a runtime mismatch after
admission is a fail, not a new skip. A bounded corpus claim need not assert full
ECMAScript support, but must satisfy all observable requirements of admitted
tests. U07 is explicitly outside that ledger until global Script semantics work.

For valid inputs the primary preflight precedence is: module, async, explicit
unsupported feature/capability, profile, harness readiness. Record every known
blocker in an ordered list as well as the primary status. Verify file identities
and metadata before these skips, including referenced includes for non-raw
tests. A missing include therefore cannot be hidden by a profile skip.
There are 60 planned variants per lane: 30 strict, 28 non-strict, 1 raw, 1 module.
No early return may discard the second variant after the first fails.

## Harness stages and independent validation

Use unmodified pinned `assert.js`, then `sta.js`, then (only in a future async
lane) `doneprintHandle.js`, then includes in declared order. Preserve repeated
includes; do not deduplicate executable inputs. CL-004 records the three default
blob identities. Resolve any additional include blob from the pinned Git tree
and record it before execution. Harness files are separate Script source units,
evaluated in the same new Realm as the test, before the test is evaluated.
The strict prefix belongs to the test unit only; it cannot change harness scope
or move the test's directive prologue behind another statement. Keep original
source identity/location on every unit. Never wrap the test in a function.
The harness units themselves are non-strict Scripts: admitting strict test
variants still requires the non-strict behavior exercised by those units. This
does not authorize admitting arbitrary non-strict test variants.

Before trusting a negative, independently parse every required harness unit and
evaluate the ordered bundle in a disposable fresh Realm. Parsing all units must
succeed even for code paths not normally taken. Run the matrix's positive and
deliberately failing harness controls in separate fresh Realms, verify actual
Test262Error identity, and retain evidence tied to engine/build/profile/hash.
Then discard the preflight Realm; load the bundle again into each test Realm.
A harness-origin syntax/throw/setup problem is `harness-error` and never matches
a test negative. If a guard, timeout or host fault interrupts preflight, preserve
that primary status with `stage: harness` and `harnessValidated: false`.
An already known missing harness language capability is an
`unsupported-feature` blocker; an attempted bundle that unexpectedly fails is
`harness-error`. Body must not execute in either case.

Do not classify by the file containing a throwing function: assert throwing
during test evaluation is a test failure, even though assert was defined in a
harness file. Stage denotes the active operation, not the origin of a stack frame.
For parse negatives parse the test unit without evaluating it; valid syntax is
an immediate fail (`expected-parse-error`), with bodyEffects=0. Do not run the
body just to obtain a wrong-phase error. `$DONOTEVALUATE` stays unmodified.

Host-defined print/$262 bindings require their own capability evidence and
specified property attributes. No guest source may escape into a host eval.
Unimplemented host services are explicit blockers, not throwing stubs that can
satisfy a negative. None of createRealm/agents/detach/GC/module-source support
is authorized here. A corpus implementation can defer tests requiring these
services; it must label its bounded host environment and never claim a complete
test262 environment. `$262.evalScript`, if separately authorized later, must
use Rift ParseScript/ScriptEvaluation with persistent global lexical bindings.

## Genuine parse errors

Add explicit engine outcomes, not regular expressions over messages:
`syntax-error` (audited ECMAScript grammar/early-error rule),
`unsupported-syntax` (including indeterminate rejection), and `resource-limit`.
The syntax-error path carries a stable rule code and source-unit/location;
unsupported carries a capability code; limits carry a guard code/count/limit.
Retain readable diagnostics independently. A generic expect failure or reserved
word rejection is initially indeterminate/unsupported, never automatically a
genuine syntax error. Missing ASI, valid Unicode identifiers, unsupported escape
forms, strictness assumptions and unsupported grammar must not earn passes.

The first audited rule set is deliberately small:

| Rule code | Witness / applicability | Valid near-neighbor control |
|---|---|---|
| assignment-target | S18, literal numeric target; supported assignment grammar | `let x; x = 42;` parses |
| lexical-declaration-statement | S19, let directly as while body | `while (false) { let x; }` parses |
| return-outside-function | S20, return under Script goal | `function f() { return; }` parses |
| duplicate-strict-parameter | S21, certified strict function context only | distinct parameters parse; sloppy duplicates are profile-unsupported, not early-error evidence |
| duplicate-block-lexical-function | S22, certified strict block context only | different block function names parse; Annex B counterpart is profile-unsupported |

These are candidate certifications, not implemented tags. Inspect the full
unchanged source and applicable goal/context. Whole-input lexing currently
precedes parsing, so an unsupported token anywhere can preempt a genuine rule;
that outcome remains unsupported. Do not retry with tokens removed or accept a
different rejection because an expected negative was present. Future rules need
separate reviewed valid/invalid controls. U01/U03 missing-semicolon rejections
and U02 async rejection are never certified early errors.

## Structured execution and classification boundary

Use a dedicated batch-driver entry point, leaving the human CLI compatible.
One subprocess per variant is the initial isolation model. Inputs identify
verified source units and capabilities; output is one versioned JSON envelope
on a driver-owned result file outside guest access. Console output is captured
separately as data; neither stdout nor stderr can forge the envelope. Parent
checks schema, identity, exactly one complete result and process completion.
Writing a normal envelope followed by abnormal process termination is a
host-fault, not a pass. Usage/read failures and protocol corruption are
host-faults at stage driver; corpus retrieval/metadata errors are harness-errors
at stage input. A supervisor deadline is timeout, never inferred from text.

Normative v1 field contract (closed discriminated records; reject missing,
unknown, duplicate or contradictory fields; null means unavailable):

| Record | Required fields / literal domains |
|---|---|
| Identity | schemaVersion=1, runId, mode, corpusRevision, manifestSha256, path, blob, sourceSha256, variant, goal, lane (`node`/`native`), engineCommit, engineBuildSha256, adapterSha256, policySha256, dirtySourceSha256 (null if clean) |
| Inputs | ordered harness `{path,blob,sha256}` array, transformedSourceSha256, profileId, capabilityLedgerSha256, host/platform/toolchain identity, limits `{sourceUnits,parseDepth,steps,calls,evaluationDepth,wallMs,outputBytes}` |
| Evidence | stage (`input`/`preflight`/`harness`/`test`/`driver`), harnessValidated, bodyEvaluated, unit (path or null), location (line/column or null), process `{exitCode,signal,deadlineExpired}`, stdout/stderr artifact hashes, elapsedMs |
| Observation | exactly one of normal, throw, syntax-error, unsupported-syntax, resource-limit, timeout, host-fault, not-run, each with fields below |
| Classification | status, reasonCode, blockers array, expectedNegative (null or phase/type), observedPhase (null/parse/resolution/runtime), observedConstructorName (string or null) |

`normal` has no error fields. `throw` has phase=runtime (resolution reserved),
valueKind and constructor evidence. `syntax-error` has phase=parse,
constructorName=SyntaxError and audited ruleCode. `unsupported-syntax` has
capabilityCode; `resource-limit` has guardCode/limit/count; `timeout` has wallMs;
`host-fault` has faultCode; `not-run` has preflight reason. Diagnostic text is an
optional uninterpreted attachment on error observations. Harness throws use the
same observation shapes but cannot match test negatives because stage differs.
No observation claims a guest Error object merely from Diagnostic.name.
Observation modes retain Identity, Inputs and Evidence, but omit Classification
entirely. Their variant field records the requested observation context, never
impersonating a completed conformance variant. Preflight not-run records have
bodyEvaluated=false and observed phase/constructor null. A required field that
has not yet been obtained (for example a hash after failed retrieval) is null;
only a complete, verified identity can support pass/fail.

Constructor evidence for runtime negatives is read from the actual thrown
guest object: resolve its `constructor`, require a callable guest object, read
its string `name`; record the defining Realm identity and extraction outcome.
Primitive/null throws have constructorName=null. No coercion of the thrown
value or fallback to `.name`, prototype label, or display text. If these guest
property operations throw, retain that secondary completion and fail with
`constructor-inspection-abrupt`; a host exception is a host-fault. Unsupported
property semantics encountered during inspection remain unsupported-feature.
This is constructor-*name* matching for negative metadata. The unmodified
`assert.throws` separately enforces actual constructor *identity*; a same-named
foreign constructor must not satisfy it. Broad accessor/proxy implementation is
not required to establish the current ordinary-data corpus boundary.

Syntax-error reporting requires a genuine ParseScript failure and its rule
evidence; constructing guest SyntaxError objects is a prerequisite to exposing
that failure through guest APIs later. Runtime diagnostic strings from today's
`failure` are explicitly ineligible for type matching. Until real Error values
exist, expected runtime Error negatives are unsupported-feature, not passes.

After preflight, classify in this order:

1. Deadline, abnormal exit/crash, missing/invalid protocol override any semantic
   result: timeout or host-fault (retain crash subtype). A configured output cap
   is resource-limit. Explicit engine guard is resource-limit, even if named
   RangeError/SyntaxError and even inside harness. No semantic negative consumes it.
2. Unsupported outcome is unsupported-feature, preserving cause/stage. Harness
   parse/throw/setup failure is harness-error. Neither reaches semantic matching.
3. For a test positive, normal is pass; every guest throw or genuine parse error
   is fail regardless of value or output.
4. For a test negative, only matching observed phase and constructor name pass.
   Parse additionally requires audited rule evidence. Normal, wrong phase,
   wrong type or absent constructor evidence is fail. Runtime SyntaxError during
   global declaration instantiation stays runtime, not parse.

The eight exclusive statuses are `pass`, `fail`, `unsupported-feature`,
`unsupported-profile`, `harness-error`, `resource-limit`, `timeout`, `host-fault`.
Reason codes refine status; crashes are host-fault with subtype crash. Schema
validation tests inject records; they do not claim Rift executed those outcomes.

## Denominators, persistence and gates

Store a selection ledger before launching anything. Report selected files,
planned variants, executed variants, unplanned input errors, and every status
count separately for each lane. A file passes only when **all** required
variants pass. Otherwise retain its status vector (no misleading single skipped
or first-failure summary). `_FIXTURE` files are dependencies, not standalone
tests; list excluded fixture paths explicitly. Malformed metadata has one input
error record and unknown variant count, never an invented default pair. For the
valid frozen corpus the denominator is 33 files / 60 variants per lane.

Publish `pass / plannedVariants` and `pass / (pass + fail)` with both raw counts;
the latter is conditional and undefined when its denominator is zero. A report
with unknown variant counts or missing terminal records is incomplete and may
not advertise a whole-selection percentage. Unsupported/harness/limits/timeouts/
faults never disappear. Node and native counts are separate, not pooled to double
the apparent corpus. Retries are attempts linked to the same variant, not new
denominator entries; preserve initial failure and require explicit rerun policy.

Start with caching disabled. Future reuse must key every Identity/Inputs field,
ordered harness bytes, metadata, limits and classifier version, not mtime/size.
Never reuse a timeout/crash as pass or reuse an old skip after capability changes.
Persist records atomically and retain unfinished ledger entries on cancellation.
Batch exit 0 only when all planned variants pass and input errors are zero;
exit 1 means completed but at least one non-pass; exit 2 means incomplete batch
or adapter infrastructure failure. These are adapter exits, not CLI exits.

## Smallest ordered implementation slices (not authorized here)

1. Host-only corpus planner, byte/hash verification, metadata validation,
   variant ledger and pure classifier against synthetic records. No engine
   support claim. Implement matrix input/transport/count controls first.
2. Add narrow structured outcomes and batch driver: audited early-error tags,
   unsupported/indeterminate tags, resource provenance, stage and source-unit
   identity; preserve human diagnostics and existing suite. All current profile
   blockers remain. This can produce trustworthy unsupported reports immediately.
3. Separately design Script execution sufficient for the selected strict corpus
   and independent harness units: global declaration setup, strictness context,
   global this/bindings and Realm isolation. Do not call the existing strict-call
   profile a strict Script implementation. Certify only reviewed variants.
4. Separately design minimal unmodified-harness support. Parsing requires var
   (including comma declarations), for, switch/case, try/catch, ++, ordinary new
   and instanceof, bare return/ASI and logical grammar used in the pinned files.
   += and typeof already exist. Execution needs ordinary constructor/prototype
   semantics, Test262Error behavior, real Error/TypeError/ReferenceError values,
   RangeError for harness controls, and faithful failure paths. Existing
   String/Object conversions are reusable but must be verified; JSON is
   conditionally optional in assert.js. Array map/
   join and Symbol message formatting are not prerequisites for selected helpers
   unless reached; explicitly defer compareArray consumers rather than changing
   the harness. No blanket implementation of every dormant helper is proposed.
5. Validate the real harness independently in both lanes, including negative
   controls, then run the unchanged admitted corpus and publish the full ledger.
   S18–S22 may be earliest parse candidates; S01–S04 require real Error objects.
   Keep U controls deferred where specified, and never promise a pass count.

Each engine slice needs its own bounded design/assignment; this list grants no
implementation or successor authorization. Preserve all 211 baseline case names,
assertions and 32 native gate entries. Future runtime acceptance requires
typecheck, runner 20/20, probes 10/10, rebuilt Node/native guests, every static-only
build and separately parsed zero-dynamic coverage. New adapter validation is
additive. This documentation task runs none of those runtime gates and leaves
all existing engine/runner/pins/C++/Claude evidence unchanged.
