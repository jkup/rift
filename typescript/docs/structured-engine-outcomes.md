# TS-031B-P: structured engine outcomes and observation boundary

Design for independent review, 2026-11-02. Assignment base `a87e86c`; inspected
tree `70689df` adds coordinator dispatch only. Accepted host tools are `500d09a`.
This document, the [literal matrix](validation/ts-031b-p/matrix.md), and the
[audit and migration inventory](validation/ts-031b-p/README.md) freeze the design.
Nothing here authorizes implementation or changes the accepted 211 guest cases
per host / 32 static-native gates. No conformance profile or harness is admitted.

## Decision and smallest slice

First implement **provenance only**, with existing public execution behavior:
explicit parse rejection categories, runtime guard provenance, and an in-process
observation projection. No subprocess launcher, corpus execution, syntax admission,
real Error values, Script semantics, or harness execution in that slice. Retain
all five TS-031P syntax rule names as reserved, non-emitting candidates. This is
a deliberate smaller split of its second implementation slice, not withdrawal
of the eventual audited-rule requirement. No current parser rejection is certified
solely by its message, AST kind, metadata negative, or a passing control.

After independent review, a second slice can add the separate static driver and
parent transport specified below. Syntax certification is separately reviewable:
the current parser lacks strictness/context evidence and stops on first rejection;
tagging its existing checks wholesale would overclaim. A trustworthy unsupported
observation is useful immediately. These slices are recommendations, not ready
successor assignments.

## Internal interfaces and compatibility

Keep `Diagnostic` exactly `{phase,name,message,loc}`. It is a human presentation
record, not evidence of a guest Error constructor. Add a separate immutable
`Rejection` union in new `src/outcomes.ts`:

```ts
type Guard = "source-units" | "parse-depth" | "steps" | "calls" | "evaluation-depth";
type Rejection =
  | { kind: "unsupported-syntax"; capabilityCode: string }
  | { kind: "syntax-error"; ruleCode: string }
  | { kind: "resource-limit"; guardCode: Guard; count: number; limit: number };
type ThrowOrigin =
  | { kind: "guest" }
  | { kind: "engine-diagnostic" }
  | { kind: "unsupported-operation"; capabilityCode: string }
  | { kind: "resource-limit"; guardCode: Guard; count: number; limit: number };
```

Use closed literal code unions in implementation; the `string` slots above are
abbreviations for the inventory's codes, not arbitrary producer-supplied values.
`LexResult` and `ParseResult` gain `rejection: Rejection | null`: error and rejection
are both null or both present. `RunResult`'s parse arm gains the same non-null
rejection. `ThrowCompletion` gains required `origin: ThrowOrigin`; `Completion`
uses that shared alias rather than repeating the throw shape. Preserve `type`,
value, diagnostic and location identities through every propagation path.

`failure(name,message,loc)` keeps its signature and string Value; it produces
`engine-diagnostic`. New `resourceFailure(guardCode,count,limit,message,loc)`
produces the same historical RangeError string/diagnostic plus resource origin.
New `unsupportedFailure(capabilityCode,name,message,loc)` marks the three explicit
runtime subset boundaries identified below. Guest `throw` has origin `guest`.
Manual host-test throw records explicitly choose `guest` (sentinel provenance);
never infer it from name. Additive metadata changes no ticks, calls, cleanup,
guest Values, property operations or CLI rendering.

Parse fail helpers take an explicit Rejection. Preserve current lexer overwrite
behavior (including unterminated-string replacing an earlier escape diagnostic)
and parser first-error behavior; replace diagnostic and rejection together.
Do not recover, retry, remove tokens, or start evaluating after a parse error.
Human CLI remains `0/1/2/64/66/70`, unchanged usage/read text, filenames,
phase/name/message/location and Uncaught display. It need not serialize origins.

`observe(source, realm, mode, unit, limits)` in new `src/observation.ts` parses once,
returns parse observation or invokes the same Evaluator.block path. Modes are
only `parser-observation` and `body-observation`; goal is Script-shaped subset,
not a certified Script profile. A parser success is `normal`, bodyEvaluated=false.
The final limits argument defaults to `{steps:100000,calls:64}`; validate its
finite nonnegative safe integers before parsing, and pass them to the existing
Evaluator constructor. Fixed source/parse/evaluation caps are not configurable.
Body evaluation sets bodyEvaluated=true immediately before block instantiation,
even if declaration instantiation fails before the first statement. A parse
failure never sets it. Source unit is a required caller-supplied immutable path;
the boundary supplies it rather than duplicating paths through every AST node.
Only one source unit and one fresh Realm are supported by the process driver.
Direct host tests may supply seeded Realms to exercise existing run semantics.

Observation projection reads origin before diagnostic: resource -> resource-limit;
unsupported-operation -> unsupported-syntax with `runtime.*` capability code
(legacy host schema name, not an assertion that parsing failed); other throws ->
throw with actual valueKind. Primitive constructors are `absent`; object
constructors are `unsupported` with null name/realmId/secondary. No property
reads, display coercions, user hooks or constructor extraction occur. A normal
record has no diagnostic. Host exceptions are caught only at the outer driver,
as host-fault; escaping return/break/continue is also host-fault. Never catch a host
exception and manufacture a guest throw.

## Construction-site audit

[construction-sites.txt](validation/ts-031b-p/construction-sites.txt) enumerates
all 95 matching production lines at the inspected source revision, including
definitions and helper calls. The following decisions cover every producer;
the retained caller inventory includes propagation and test consumers.

| Producer (line numbers at inspected revision) | Frozen disposition/code |
|---|---|
| lexer 31 | resource `source-units` |
| lexer 48,80,92 | unsupported `lex.indeterminate-comment`, `lex.indeterminate-string-newline`, `lex.indeterminate-string-end` respectively; genuine-looking malformed inputs still lack certification |
| lexer 64,69,88,105,112 | unsupported `lex.leading-zero`, `lex.numeric-literal`, `lex.string-escape`, `lex.operator`, `lex.character` |
| parser 37,41,174,273,284 | unsupported `parse.expected-token`, `parse.binding-identifier`, `parse.property-name`, `parse.object-key`, `parse.unexpected` |
| parser 54 | unsupported `parse.duplicate-binding`; conflates block/function/top-level and parameters |
| parser 65,166 | resource `parse-depth` at both statement and expression entry |
| parser 74 | unsupported `parse.declaration-statement`; let/function must not share certification |
| parser 112 | unsupported `parse.return-context`; candidate certification below |
| parser 115,118,124 | unsupported `parse.line-terminator`, `parse.throw-expression`, `parse.loop-context` |
| parser 138,211,247 | unsupported `parse.duplicate-parameter`, `parse.assignment-target`, `parse.delete-identifier` |
| parser 258,274 | unsupported `parse.array-spread`, `parse.prototype-literal` |
| evaluator 34,66,129,283 | resource `steps`, `evaluation-depth`, `evaluation-depth`, `calls` |
| evaluator 46 | engine-diagnostic SyntaxError at runtime; duplicate existing environment binding, never parse evidence |
| evaluator 108 | guest throw, preserve original value |
| evaluator 281,316 | engine-diagnostic TypeError (noncallable; in RHS) |
| runtime 189,229,230,246,250,251,252 | engine-diagnostic (Set false; unresolved/TDZ reads/writes; immutable binding) |
| conversion 79,125 | engine-diagnostic Symbol-to-number/string TypeError |
| conversion 80,126 | unsupported-operation `runtime.object-to-number`, `runtime.object-to-string`; partial low-level conversion APIs, do not pretend this is the completed ToPrimitive protocol |
| array-map 15 | unsupported-operation `runtime.map-species`; explicit subset rejection |
| array-map 10,17 | engine-diagnostic callback TypeError / array-length RangeError; neither is a resource guard |
| array-object 65,83 | engine-diagnostic invalid-length RangeError, never resource-limit |
| object-conversion 14; delete-reference 18 | engine-diagnostic nullish boxing / delete false |
| primitive-conversion 26,43,48 | engine-diagnostic failed conversion / noncallable @@toPrimitive |
| builtins boolean14, number39, string15, symbol15, function20/31 | engine-diagnostic incompatible receiver / noncallable receiver |

All explicit `throw new Error` producers remain host faults: evaluator 82,122,
196,203,213,237,305,406; array-map20/36; array-object9/30/38/91/98/115;
runtime183/195; primitive-conversion12; delete-reference8; realm66/86;
builtins/function11; cli28. They assert storage/bootstrap/AST/call invariants or
host-only inspection failures. Catch at CLI/driver, not inside semantic helpers.
Host allocation, string, Map, I/O and output-callback exceptions can also escape
without an explicit throw site: same host-fault rule, never message classification.
Boolean internal-method false results are not throws; their existing callers
translate them locally, and keep that behavior.

No diagnostics originate in abstract-equality, array-like, primitive-objects,
property-keys, strings, symbols, typeof, builtins/object or builtins/array. They
return/propagate results or use registered callbacks. Conversion/call/tick and
internal-method paths must forward the exact completion; a copy dropping origin
is an acceptance failure. Successful normal/return/break/continue records need
no origin. Runtime unsupported mapping is observation-only, not a new guest
exception category or conformance capability admission.

## Guard provenance and cleanup

| Guard | Trigger/count/limit | Diagnostic phase/location | State after return |
|---|---|---|---|
| source-units | source.length >100000, count actual UTF-16 length | parse 1:1 | no parsing/evaluation; UTF-8 bytes are not units |
| parse-depth | ++depth >128, capture129 before decrement | parse current entry token | depth restored by enclosing exits; no new parser catch |
| steps | ++steps >maxSteps (default100000), capture attempted count | runtime supplied loc | steps includes failed tick; no reset |
| evaluation-depth | ++depth >256 after successful tick; capture257 before decrement | runtime stmt/expr loc | depth restored, successful tick remains |
| calls | calls >=maxCalls (default64), capture active count64 | runtime call loc | no increment or Realm switch on rejected entry |

Configured maxSteps/maxCalls must be finite nonnegative safe integers for the new
driver/test API; reject bad driver arguments at stage driver, not as guest errors.
Source/parse/evaluation caps remain fixed. Report their actual constants in Inputs,
not requested alternatives. Zero steps yields1/0; zero calls yields0/0. Do not
change the TS-031A `calls >= limit` validator to a strict-greater comparison.
Count is captured at failure, not reconstructed from unwound state. The engine
has no heap guard; allocation faults/crashes are not invented resource counts.

All tick callers share Evaluator.context: statements/expressions, array literal
elements (including holes), map iterations, primitive conversion attempts,
Object.prototype.toString tag Get, Array.prototype.join length/element work,
and Array.prototype.toString join Get. Calls enter through evaluator call
expressions, map callbacks, primitive-conversion hooks, Function.prototype.call,
and Array.prototype.toString dispatch. Their direct return paths preserve origin.
Host/guest reentry shares calls/steps/depth; cross-Realm calls restore the exact
prior Realm in finally. Seeded tests start with nonzero depth/calls and foreign
Realm; assert restoration to the seed, not always zero. Preserve keys, assignments,
bindings, array lengths and output already committed before an abrupt result.
No cleanup rolls back guest effects or resets budgets. Actual default64 recursion
must execute under native, not only synthetic counter injection.

## Candidate syntax certification boundary

The genuinely audited emitting set in the first slice is **empty**. Reserved
host RULES are schema vocabulary, not evidence of engine implementation. A later
certifier must bind a rule to unchanged whole-source bytes, goal, syntactic
context and rule version independently of expectedNegative. Full lexing precedes
any parser tag: a later unsupported lexical token preempts an earlier candidate.
Generic expect failure and a later parser-unvisited suffix cannot certify whole
input support. Do not create a repair/reparse strategy to conceal this gap.

| Reserved rule | Smallest candidate witness / valid neighbor | Required restriction before emitting |
|---|---|---|
| assignment-target | `1 = 2;` / `let x; x = 2;` | numeric Literal target in supported assignment grammar; exclude array/object destructuring, call targets, optional chains and arbitrary non-reference ASTs; audit RHS and rest of unit |
| lexical-declaration-statement | `while(false) let x;` / `while(false) { let x; }` | exact let LexicalDeclaration at while Statement position, not generic let identifier or function in if/Annex B; audit whole unit |
| return-outside-function | `return 1;` / `function f(){return 1;}` | Script goal with functions=0; no wrapper, Module or host function-body parse; nested blocks preserve context; audit whole unit |
| duplicate-strict-parameter | `"use strict"; function f(x,x){}` / distinct x,y | real inherited/directive strict-function context, not only variant label or current strict-call behavior; deferred |
| duplicate-block-lexical-function | `"use strict"; {function f(){} function f(){}}` / f,g | strict block lexical names, not Script/function-body var names; Annex B excluded; deferred |

S18–S22 retain their manifest paths/blobs and all comments/$DONOTEVALUATE bodies.
None is newly executed or admitted. Whole-file certification controls must use
those exact bytes plus separately named valid neighbors, not edits passed off as
the original file. Unprefixed sloppy duplicate parameters/block functions remain
unsupported; strict prefix alone does not establish parser context tracking.

The fixed [ECMAScript 2025 assignment rules](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-assignment-operators-static-semantics-early-errors)
distinguish invalid targets from destructuring. Its [statement grammar](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html)
separates declarations from statements and threads Return context. These support
the narrow candidates; they do not certify Rift's parser. The engine262 project
was consulted as a specification-oriented engine reference; no implementation
code or API was adopted (source retrieval limitations are recorded in evidence).

## Separate static-native observation driver (second slice)

New `src/observation-driver.ts`, separately built; never modify CLI flags or parse
human stderr. One process/one source unit/one fresh Realm. Fixed positional args:
`<parser-observation|body-observation> <source-file> <unit-path> <result-file>
<nonce> <maxSteps> <maxCalls>`. Exact argument count, decimal safe integers and
known modes required; reject conformance/Module/harness/multiple units. Parent
validates safe test-relative unit path. Parent alone chooses all filesystem paths.
Read source-file as UTF-8 (parent already verified exact bytes and decoding), and
write a small fixed-schema JSON result file. Never import YAML, crypto, planner,
dynamic JSON.parse, or host classifier into the statically compiled driver.

Child schema `driverVersion:1` is distinct from result.mjs schemaVersion1:
`{driverVersion,nonce,mode,unit,stage,bodyEvaluated,location,observation}`.
All fields required; no extras. stage=`test` for parsing/body, `driver` for usage,
read/bootstrap/protocol-write faults. location is null or positive line/column.
Observation is the host union's normal/throw/unsupported-syntax/resource-limit/
host-fault subset; syntax-error reserved, not emitted. Child cannot report timeout,
output cap, process status, hashes, elapsed time, identity, inputs, classification,
expected negative or harnessValidated. Diagnostic attachment is optional text;
retain a separate raw artifact if its historical text is needed. A successful
file write exits0 even for guest throws/rejections. Uncaught host exception or
write failure exits70; no envelope can override that. A caught bootstrap/read
fault may write a host-fault record but still exits70. Missing file is driver
fault, unlike pre-launch missing corpus bytes (input harness-error).

Use typed records and explicit JSON string escaping/serialization; no guest Value
serialization or object traversal. Escape quotes, backslashes, control units and
lone surrogates; retain U+2028/U+2029 safely. The compiler contract already supports
readFileSync, argv and strings but does not establish this writer/encoder. At
implementation time probe only an actually failing static build/coverage or I/O
uncertainty, retain the reduction, and do not change pins. Both entry points
require static-only build **and** separately parsed zero-dynamic coverage.

Parent creates a fresh private attempt directory and immutable verified source
file before launch; result-file must not exist. Use random nonce bound to one
attempt, disallow path aliases/symlinks and stale files, no guest filesystem or
host eval exposure. Write once; parent reads only after process close. Incomplete,
multiple, oversized, duplicate-key or non-JSON payload is protocol fault. No
atomic child rename dependency is needed because exit completion gates reading;
parent persists its accepted combined record atomically. Guest stdout/stderr are
captured data, never interpreted as a result. A compromised engine is outside
the trust model; nonce does not authenticate an arbitrary hostile executable.

## Parent-owned context and accepted host-tool changes

Parent chooses verified Identity/Inputs/expectedNegative/blockers **before** launch
and keeps them outside the child file. Match nonce/mode/unit and executable build
hash; bind exact original/transformed hashes, ordered harness identities, limits,
policy/adapter hash, engine commit and dirty digest. For observations, set
profileId=`rift-subset-observation-v1`, harness=[] and harnessValidated=false;
the original required harness/blockers remain in selection metadata, not falsely
reported as loaded inputs. Keep requested strict/non-strict/raw variant and
Script goal; strict prefix remains the exact TS-031P transform if requested.
Do not relabel every observation raw merely to bypass current schema validation.

Concrete accepted-tool migration in a future driver slice:

1. `result.mjs:validateCore`: gate the test-stage harnessValidated requirement
   on mode=conformance. Observations require harness=[] and
   harnessValidated=false; no Classification. Do not relax conformance checks.
   A parser-observation may be normal with bodyEvaluated=false. No classifier
   call for either observation mode. All conformance blockers remain unchanged.
2. Add host-only `tools/test262/observe.mjs` and `driver-result.mjs`: launch and
   validate child subset schema/duplicate keys; construct full host record with
   parent Identity/Inputs and parent process/output/time facts, using
   terminalRecord/validateRecord/assertContext/inspectEnvelope after composition.
   Never feed child claims about transport into inspectEnvelope. Bind observation
   metadata to the original selection separately; assertContext intentionally
   does not match expectedNegative in observation records because they omit it.
3. Keep `plan.mjs`, `input.mjs`, `ledger.mjs:appendAttempt/report` conformance
   behavior unchanged. They reject observation records. Persist observations in
   a separate attempt archive; no pass/fail status, denominator change or call
   to appendAttempt. Conformance remains 33 files/60 variants per lane, zero
   execution/passes with current profiles/harness blocked.

Parent timeout/deadline and process crash override any child result. Follow the
accepted inspectEnvelope precedence: deadline, abnormal exit, output cap, protocol,
semantic observation. Stream combined stdout+stderr **bytes** with a configured
cap (default proposed 1048576) and deadline (default proposed10000 ms); parent
records actual values in Inputs. Track cap-triggered termination separately so
its deliberate kill is resource-limit/output rather than an unrelated crash;
retain actual raw transport artifacts. For compatibility normalization, the
parent handles this cap event before inspectEnvelope, without fabricating a
successful process exit. If independent abnormal termination predates cap, it
wins. Deadline wins if both fired. Count output bytes observed at first crossing,
never invent cap+1 if larger chunks arrived. Result payload has separate fixed
65536-byte protocol ceiling (oversize=protocol fault), not guest output budget.
Cancellation leaves unfinished attempt; no manufactured terminal success.

Location describes original transformed source coordinates, including the exact
one-line strict prefix. Retain original source hash and transform; do not silently
subtract a line. CRLF counts once, U+2028/U+2029 are line terminators outside
strings, columns are UTF-16 units. Stage is the active operation, not the defining
file of a function. This single-unit driver cannot evaluate foreign harness
units; multi-unit source-location tracking is deferred with harness semantics.

## Acceptance and file ownership for later work

The [matrix](validation/ts-031b-p/matrix.md) is literal and additive. First slice:
src/outcomes.ts, src/observation.ts, syntax/lexer/parser/runtime/evaluator/
interpreter, conversion and array-map provenance sites; only the ten manual
test throw constructions enumerated in evidence need shape migrations. Add
test/structured-outcomes.ts and its build/run gate. Existing test expectations,
CLI cases and 32 native entries remain byte-for-byte unless an independently
reviewed concrete mismatch is found. Do not grant ownership to all test files
merely because the search inventory mentions them.

Second slice additionally owns src/observation-driver.ts, the two host modules,
result.mjs's observation invariant, additive tests/package command and build
entries. It does not own conformance planner/ledger semantics. Every runtime
slice requires typecheck, runner20, probes10, rebuilt Node/native guests, old
211 names/expected records, all32 old gates plus additive gates, and matrix
coverage mapping. Cross-Realm, seeded cleanup and actual default64 native cases
are mandatory. Design-only evidence here contains no runtime measurement or
new static compatibility claim. Stop after design review; no automatic successor.
