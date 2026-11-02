# TS-033P: bounded Script execution design

Design for independent review, 2026-11-02, base `dc460ac` on
`codex/test262-classification`; TS-032B `8504127` is accepted. No implementation,
profile admission, harness validation or new conformance result is delivered.
The acceptance scenarios below are requirements, not passing tests.
[Audit evidence](validation/ts-033p/README.md) records exactly what was inspected.

## Decision and boundary

Add a separate opt-in Script entry with a distinct Realm execution profile.
Keep `run(source, realm)` and the existing CLI/observation profile unchanged.
Do not select semantics from a filename, test ID, expected negative, or harness
stage. The initial executable profile accepts only fully supported strict Script
source; non-strict source is a profile rejection until the separate harness
prerequisite has been reviewed. Parsing can still determine strictness and
report unsupported syntax without executing anything.

Migrating `run` immediately would alter global function visibility, repeated
declarations, completion values and top-level `this` throughout 212 cases and
their host drivers. An opt-in entry makes these differences explicit and permits
additive acceptance before a separately assigned migration. Share value/object,
conversion and evaluator machinery; do not fork a second interpreter. Lock the
Realm to its entry profile at construction, so legacy bindings cannot silently
coexist with Script globals. Cross-profile function transfer is rejected by the
host API initially; same-profile cross-Realm calls must work. This restriction
is an explicit host profile boundary, not an ECMAScript error.

The endpoint is sufficient semantics for the selected strict corpus plus the
non-strict behavior actually required by unchanged harness units. It is not full
Script support. Var/function scope, declaration ordering, strictness and sloppy
harness dependencies must be implemented before that endpoint is claimed.
Modules, eval, with, async/generators, classes, Annex B compatibility and a
general host `$262` are outside this work. Unsupported syntax remains explicit,
including in unreachable code. No dormant harness method is implemented merely
because its source is parsed.

## Sources and consequential choices

Normative baseline: fixed [ECMA-262 2025, edition 16](https://262.ecma-international.org/16.0/),
especially §11.2.1–2 (directives/strict code), §9.1.1.4 (Global Environment),
§10.2.1.2 (OrdinaryCallBindThis), §16.1.5–7 (ParseScript, ScriptEvaluation,
GlobalDeclarationInstantiation). Retrieved bytes have SHA-256
`6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713`.
Extracted clauses and byte counts are retained in `upstream.json`.

Engine reference: [engine262 `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`](https://github.com/engine262/engine262/tree/d553e7b52501fbc47eae981c8d0fa7a5c26d0171),
MIT license retained with numbered source in the audit:

| Pinned source | Inspected decision |
|---|---|
| `src/host-defined/engine.mts:172–203` | ScriptRecord owns Realm; context establishes both environments, instantiates before evaluation, preserves completion, then pops. Adopt these boundaries. |
| `src/execution-context/Environment.mts:644–665, 825–948` | Composite declarative/object environment, restricted-property checks and separate var/function creation. Adopt concepts, not generator implementation. |
| `src/abstract-ops/function-operations.mts:170–205` | `this` conversion depends on the function's own mode and defining Realm, not caller strictness. |
| `src/api.mts:208–245` and `src/parse.mts` | Per-Realm global object and separate compile/evaluate API. Keep original unit and Realm bound together. |

Rift uses explicit completions and synchronous guards, so retain `try/finally`
cleanup for host faults too; do not copy engine262's generator/agent machinery.
No engine262 execution or portability measurement was performed. The current
2025 algorithms use restricted non-configurable global properties for conflicts;
do not add an older-spec `VarNames`/HasVarDeclaration algorithm from memory.
An introductory paragraph still describes a declaration-name list, but the
edition's actual field table and algorithms do not require one here. Follow the
numbered algorithms. Global proxies and exotic host globals remain unsupported.

## Current semantics and exact migrations

Paths/lines below refer to the base; audit source hashes bind this inventory.

| Current source | Observed by source inspection | Required opt-in migration |
|---|---|---|
| `src/interpreter.ts:8–15` | Parse, then fresh Evaluator.block in `realm.global`, receiver undefined. | Separate parse record and Script evaluation; preserve legacy entry. |
| `src/realm.ts:18,45–56` | One plain Environment, globals stored as bindings. No global object/this value. | Script Realm creates ordinary global object + composite global environment; install global data properties with reviewed attributes. |
| `src/runtime.ts:208–263` | Resolution returns Map environment or null; reads/writes use that Map directly. Unresolved writes throw; property write failure always throws. | Completion-aware environment operations and strict References. Resolve once before RHS; no re-resolution after coercion/effects. |
| `src/evaluator.ts:43–62` | Every list treats let/functions alike; functions hoisted in same environment, all mutable; normal statement values discarded. | Separate global, function and block instantiation; preserve StatementList completion values with explicit empty-value tracking. |
| `src/parser.ts:98–109,186–204` | Single duplicate-name list includes parameters; duplicate params rejected regardless of strictness. | Scope-kind name summaries; allow var/function redeclarations where required; distinguish function-body var names from block lexicals. |
| `src/parser.ts:129–184,283–302` | String expressions inert; parentheses erased; only let, functions, blocks, if, while and abrupt statements. Delete assumes strict profile. | Capture directive syntax before parentheses/raw spelling are lost; strictness inherited syntactically, not dynamically; strict early errors audited separately. |
| `src/lexer.ts:78–104` | Decoded strings have offsets but no directive marker; many escapes unsupported. | Use source span/raw token spelling and statement shape; do not infer directive from decoded text. Preserve unsupported escapes until separately supported. |
| `src/evaluator.ts:282–315`, `src/realm.ts:70–74` | Guest function stores Realm/environment/source but no strictness; receiver forwarded unchanged. Active Realm restored in finally. | Store strictness/thisMode and source-unit record; preserve exact receiver in strict calls. Sloppy boxing/substitution deferred to harness slice, in callee Realm. |
| `src/syntax.ts:1–4`, `src/observation.ts`, `src/observation-json.ts` | Function source keeps text/range; diagnostics have local location; observation entry owns unit/stage externally. | Add unit identity to Script records and function provenance without changing accepted observation transport in this task. |
| `src/runtime.ts` failure/resourceFailure; `src/outcomes.ts` | Engine language failures are diagnostic-bearing strings; resource origin is distinct. Only audited return rule is certified. | Error objects remain separate prerequisite; no diagnostic-name type matching. No extra certification implied by entry work. |

Supported syntax is a bounded grammar, not "all strict JavaScript": const, var,
comma declarations, ASI, for, switch, try/catch, ordinary new, instanceof, ++,
Unicode identifiers and many literal/escape forms remain gaps. Existing +=,
typeof/void, internal symbol values and Number.toString work do not fill these gaps.
Legacy function hoisting exists; standard global and function declaration
instantiation does not. Blanket statements that "hoisting is absent" would also
be inaccurate.

Production global installation is limited to realm.ts and
`src/builtins/number.ts:28`; P2 must route both through a profile-aware global
installer. Existing intrinsic String/Object/Symbol prototype methods are not
guest global String/Object/Symbol factories. Those global bindings are absent;
the harness's String calls and Object.prototype fallback need separately reviewed
global built-ins, and S15 needs the guest Symbol factory. The planner currently
recognizes the Symbol feature name but this is not capability certification.
`src/observation.ts:61` invokes Evaluator.block directly rather than run; keep
that path legacy until P6. Existing host tests directly seed/read `.global.bindings`
(for example array-literals.ts:14, compound-assignment.ts:146–149); preserve their
default profile and add dedicated Script host setup/access APIs instead of changing
their assertions. A future migration must inventory all those callers explicitly.

## Entry, state and provenance contract

Proposed names describe interfaces for future review, not exported APIs today:

* `parseScript(unit, scriptRealm)` returns a non-executable rejection or an
  immutable ScriptRecord containing exact source text, original/transformed hash
  identity, source-unit ID, goal Script, Realm, parsed body, directive strictness,
  declaration summaries and complete supported-grammar coverage. No partial AST
  may reach evaluation. Hash verification remains host adapter responsibility.
* `evaluateScript(record, executionSession)` verifies profile/Realm ownership,
  saves the caller context and enters the record's Realm with lexical and variable
  environments set to its global environment, no function/private environment,
  and this = its globalThisValue. Use the ordinary global object itself as that
  value initially. A host-supplied distinct object or proxy is unsupported.
* Perform GlobalDeclarationInstantiation, then evaluate statements only on
  normal completion. A declaration-instantiation SyntaxError is **runtime**,
  with `bodyEvaluated=false`; intra-unit grammar/early errors are **parse**.
  Resource origins stay resource limits even if a diagnostic says RangeError.
* Carry explicit empty statement completion internally. `1; let x;` returns 1;
  an empty Script returns undefined. Preserve last non-empty value through lists
  and block/if/loop UpdateEmpty rules; do not use guest undefined as an empty
  sentinel. Function fallthrough still returns undefined. Return/break/continue
  escaping the Script boundary is an implementation fault after valid parsing.
* Restore caller context, Realm, source unit and call/depth state in finally for
  normal, guest throw, guard and host exception. Guest global mutations remain;
  cleanup is not rollback. Never turn host exceptions into guest throws.

Use a small explicit context record (Realm, ScriptRecord/source unit, environments,
strictness, this value) plus saved caller, not a general scheduler. A function
retains defining source/Realm and lexical environment; calling it updates active
code provenance and Realm but not the operation's harness/test stage. A harness
assertion invoked by a test is stage test with harness source provenance.

One execution session shares step budget across ordered harness and test units;
each independent harness-preflight control has its own fresh Realm/session.
Source cap 100000 UTF-16 units and parse depth128 are per unit; steps100000,
calls64 and evaluation depth256 retain their meaning. Calls/depth return to the
saved value; step usage is monotonic, never reset by entering another unit or
cross-Realm callback. Parent wall/output limits still bound the entire attempt.
Do not invent exact tick totals before implementation; future acceptance freezes
counts once placement is reviewed and covers exhaustion at declaration setup.
Budget charge for declaration walks must precede state mutation where possible;
guard interruption after instantiation/body starts preserves already-created
bindings. Only ordinary language conflict prechecks promise no new bindings.

Harness units remain separate unchanged Scripts, assert.js then sta.js then
includes in metadata order, including repeats. Strict prefix belongs only to
test source; no concatenation, wrapping, assertion shim or cross-unit inherited
strictness. Parse every harness unit, validate positive/failing controls in fresh
disposable Realms, then reload in a new test Realm. Source IDs include unit order
so repeated includes retain separate execution identity even with equal hashes.
Keep transformed locations and explicit original-location mapping; prefix line1
has no original location. Preserve CR/LF/U+2028/U+2029 byte identity in hashes.

The accepted observation protocol is not silently widened: a future additive
driver integration must explicitly represent instantiation versus body entry,
unit provenance and profile ID, update both decoders atomically and preserve
legacy envelopes. A runtime throw before body entry cannot be forced into today's
body-observation invariants. Until that separate review, the new API is reachable
only by dedicated host tests, not by the conformance planner.

## Strictness and declarations

Directive recognition is syntactic: only an initial unparenthesized string-literal
ExpressionStatement qualifies, with exact raw `'use strict'` or `"use strict"`.
Other string directives keep the prologue open. Empty statements, blocks and
ordinary expressions close it. Escapes, continuations and parenthesized strings
are not Use Strict Directives. ASI is part of the standard rule but remains an
explicit unsupported capability until separately implemented; no insertion by
the adapter. Strictness of a function is enclosing strictness OR its own
prologue. Inspect its prologue before validating parameters, since a body
directive can make duplicate parameters invalid. Sloppy functions remain
unsupported at initial execution entry, including nested ones; later harness
support must supply actual sloppy behavior, not tag them strict.

Global lexical bindings live in a persistent declarative record, taking
precedence over object bindings. Global var and top-level functions use global
object properties. Built-in globals also use object properties, not lexical
bindings. For new var/function properties use writable/enumerable true,
configurable false; global undefined/NaN/Infinity are nonwritable,
nonenumerable, nonconfigurable; ordinary built-in globals use their specified
attributes. Console is a documented host extension. Do not expose every
intrinsic as a global merely because a prototype is implemented.

Precompute LexicallyDeclaredNames, VarDeclaredNames and their scoped declarations
for each admitted scope. Same-unit lexical duplicates and lexical/var conflicts
are parse early errors only after whole-unit grammar coverage. Duplicate
top-level function/var names are not lexical duplicates. Collect var declarations
through blocks/branches/loops but stop at functions. Block functions in strict
code are block lexicals; top-level functions are var-scoped. Function parameters
may share names with function-scoped var/function declarations; lexical names
may not conflict with parameters. These rules replace today's one-list check
only in the new profile.

For each Script, in specification order: check lexical names against prior
lexicals and nonconfigurable own globals; check var names against prior lexicals;
select functions in reverse declaration order (last declaration wins) and test
CanDeclareGlobalFunction; check remaining vars with CanDeclareGlobalVar. Reject
before creating bindings or running source effects. Then create uninitialized
lexicals, initialize selected functions capturing the global environment, then
create/reuse var bindings initialized to undefined without overwriting existing
values. Function instantiation needs its own reviewed subset algorithm; it cannot
reuse block instantiation. Const can stay unsupported until specifically added.

Ordinary direct global properties may be shadowed by later lexical declarations
when configurable. Host descriptor tests must exercise restricted globals and
nonextensible global objects even though guest descriptor APIs remain partial.
Use existing internal property operations, preserving inherited lookup and abrupt
completion. Global identifier calls use undefined as receiver (WithBaseObject
is undefined); `this.f()` uses the global object. In strict functions this is
unchanged even for null/primitive values. In a later sloppy harness slice,
null/undefined substitute the defining Realm's globalThisValue; primitives box
using that Realm. Assignment resolves the Reference before evaluating RHS, so
`missing = (this.missing = 5)` throws ReferenceError in strict code while leaving
the property 5. U07's historical Node disagreement is not an alternative oracle.

## Selected corpus dependencies

All 33 exact test bodies and three harness blobs were retrieved and matched to
the accepted test262 pin `91c70759363c46557b694792bf34a2551a7af5ba`.
`corpus.json` retains bytes as lossless text, hashes, links and copyright notices.
No body was executed. All non-raw variants require the unmodified harness;
all 28 non-strict variants remain sloppy-profile blocked, all 30 strict variants
remain strict-Script blocked, raw remains directive-Script blocked, module remains
module blocked. Denominator stays 33 files/60 variants per lane.

| IDs | Script-specific dependency and remaining blocker after entry work |
|---|---|
| S01, S02 | Global TDZ before reads/self-initializer; actual ReferenceError values and harness still required. |
| S03, S04 | Strict block/function scope and closures before initialization; assert.throws, try/catch and constructor identity remain. |
| S05 | Function/block return and lexical lookup; global function setup and harness. |
| S06, S07 | Own/inherited function strictness and bare/call receiver; unchanged harness. Non-strict variants separately blocked. |
| S08, S09 | Existing numeric conversion reused; sameValue ±0 checks and harness required. |
| S10–S13 | New Test262Error appears even in failure-only branches: whole-file new grammar and constructors, not dead-code stripping. |
| S14 | typeof/void already implemented; harness and Script profile remain. |
| S15 | var and global function instantiation; ordinary MyError new/identity, TypeError, assert.throws and guest Symbol factory/global. += and internal symbols exist; guest Symbol calls and whole-file behavior remain blocked. |
| S16, S17 | IdentifierName yield and duplicate ordinary data property keys remain valid in strict code; void exists. Harness/profile still required; no stronger assertion than whole-file completion. |
| S18, S19 | Assignment-target and lexical-declaration-statement certification still absent; harness preflight must succeed first. |
| S20 | Return certification already implemented by TS-031C-B; neither Script admission nor harness readiness follows. |
| S21, S22 | Certified strict context, duplicate strict params and block lexical functions; new rule certification plus whole-source veto controls required. |
| U01 | ASI and duplicate lexical certification; remain deferred. |
| U02 | async-functions capability; unsupported remains, never generic SyntaxError pass. |
| U03 | Raw/no harness, directive ASI and strict reserved-word certification; remain deferred. |
| U04 | Module goal, never route to strict Script. |
| U05 | Like S06 but still non-raw; lack of helper calls does not remove harness. |
| U06 | noStrict, sloppy primitive receiver boxing; later harness subset does not admit arbitrary sloppy test variants. |
| U07 | Resolve-before-RHS, global this/property visibility and real ReferenceError; explicit global-script blocker retained. |
| U08 | async completion, Promise jobs, doneprintHandle/print; deferred. |
| U09 | RegExp tail remains whole-file blocker despite supported typeof null. |
| U10 | ASI plus unchanged depth/call limits; never raise limits for admission. |
| U11 | Return ASI and raw line terminators; byte-preserving input required. |

Pinned assert.js needs **parse support** for switch/case, var including comma
declarations, try/catch, for and ++, ordinary new (plus existing expressions).
sta.js needs ordinary new/instanceof and function prototype objects. Runtime paths
used by assert/assert.sameValue/assert.throws require var/function environments,
sloppy functions, try/catch, String/Object conversion failure paths, Test262Error
construction and identity. Real Error/TypeError/ReferenceError and RangeError
controls are separate built-in prerequisites. Conditional JSON fallback does not
require JSON if unresolved typeof works. compareArray's Array.map/join path and
symbol formatting are not selected consumers; their grammar must parse but their
runtime capabilities remain deferred. Unsupported dormant runtime operations
must never silently succeed if later reached. This is a dependency inventory,
not authorization to implement harness features in the Script task.

## Ordered bounded implementation proposals

Each slice needs its own frozen assignment and independent review. These are
proposals, not ready TASKS entries or authority to start successors.

| Order | Proposed scope / owned production files | Acceptance boundary |
|---|---|---|
| P1 | Source-unit/strictness parsing metadata: syntax.ts, lexer.ts, parser.ts; additive parser host test and gate | D01–D09, V01–V03. No executable new entry, no additional certified errors without whole-source proof. Legacy parser outputs preserved. |
| P2 | Global environment operations and Script Realm bootstrap: runtime.ts or focused environment module, realm.ts, number.ts global installer only; additive host driver | G01–G08 descriptor/reference controls via host operations (source integration awaits P3/P4), realm isolation. Legacy Realm behavior preserved; no conformance entry. |
| P3 | Scope summaries, global/function/block instantiation, minimal var declarations: parser/syntax/evaluator and focused instantiation module | G/L matrix including nested var collection and repeat functions. Own formal/lexical conflicts; leave const/Annex B unsupported. Bound to existing statement grammar plus simple var lists. |
| P4 | Script entry and completions/context: interpreter or script module, evaluator, runtime, realm; additive host driver | T/C/R matrix, strict bare/member/call behavior, all abrupt cleanup paths, exact source provenance. No sloppy execution yet. |
| P5 | Separate harness prerequisite design/assignments | Explicitly design additional grammar and narrow sloppy/function/constructor/Error dependencies above; parse whole pinned units, validate reached paths and deliberately failing controls. Not a single omnibus Script task. |
| P6 | Separate driver/ledger integration and per-file capability review | Versioned entry/provenance integration, strict-error certification as separately audited rules, independent harness validation on both lanes, then exact file/variant admission with hash/test evidence. Retain full denominator and all remaining blockers. |

P1–P4 acceptance requires typecheck, runner20/20, probes10/10, rebuilt Node/native
guest lanes preserving the exact 212 old records and 37 old static-only/separate
coverage gates, plus additive expected-result controls. No native support claim
until new targets are built with scriptc0.4.7 and parsed zero-dynamic coverage.
Test the host APIs with runtime source inputs. Do not run guest code with host
eval/Function/vm. A CLI migration is a later explicit choice, not P6's side effect.

## Literal acceptance matrix

Every row starts in a fresh Script Realm unless units A/B are specified; units
execute sequentially in the same Realm. `out` is a host-injected recorder with
exact numeric/string/identity assertions, not an assertion shim for corpus runs.
Host descriptor setup is stated explicitly. All rows are future requirements.
`strict` means literal prefix `"use strict";` unless shown. Sloppy rows test
parse metadata first and remain execution-blocked until P5.

| ID | Literal source / setup | Expected outcome |
|---|---|---|
| D01 | `"use strict"; function f(){return this;} out(f());` | strict=true, output undefined. |
| D02 | `'other'; 'use strict'; function f(){return this;} out(f());` | strict=true, output undefined; other directive does not end prologue. |
| D03 | `('use strict'); function f(){return this;}` | strict=false, initial execution unsupported-profile; P5 bare f() gets global this. |
| D04 | `; 'use strict'; function f(){return this;}` | strict=false (empty statement ends prologue). |
| D05 | `0; 'use strict'; function f(){return this;}` | strict=false; late string inert. |
| D06 | `"use\x20strict"; function f(){return this;}` | not a strict directive; currently escape unsupported, never certify from decoded value. |
| D07 | `"use strict"` newline `function f(){return this;}` | unsupported until ASI; once admitted strict=true. No inserted semicolon in input. |
| D08 | `function f(a,a){"use strict";return a;}` / `function f(a,b){"use strict";return a;}` | first parse SyntaxError only with full coverage; neighbor parses with strict function; outer non-strict execution deferred. |
| D09 | strict `function f(){function g(){return this;}return g();} out(f());` | undefined; inherited strictness retained in both functions. |
| G01 | strict `let x=1; out(this.x); out(x);` | undefined,1; no own x global property. |
| G02 | strict `var x=1; out(this.x); out(x);` | 1,1; new own descriptor W/E=true C=false. |
| G03 | strict `out(f()); function f(){return 1;} function f(){return 2;}` | 2; global f equals this.f, W/E=true C=false; duplicate functions permitted. |
| G04 | A strict `let x=1;`; B strict `out(9); var x;` | B runtime SyntaxError at instantiation; no 9, x stays1. |
| G05 | A strict `var x=1;`; B strict `out(9); let y=2; let x;` | B runtime SyntaxError, no output, y not created. |
| G06 | A strict `this.x=1;`; B strict `let x=2; out(x); out(this.x);` | 2,1 because direct property configurable. |
| G07 | Host nonextensible global; strict `out(9); var fresh;` | runtime TypeError before effects/no fresh; neighboring existing own writable var succeeds. |
| G08 | Host nonconfigurable own p W=true E=false; strict `function p(){}` | runtime TypeError; neighbor W=true E=true permits value replacement with descriptor flags preserved. |
| L01 | strict `out(9); let x; let x;` | parse SyntaxError after full audit, zero effects/bindings. |
| L02 | strict `out(x); let x=1;` / `let x=x;` | runtime ReferenceError; binding stays uninitialized after throw. Subsequent read still ReferenceError. |
| L03 | strict `function f(){return x;} out(f()); let x=1;` | runtime ReferenceError via captured TDZ. |
| L04 | strict `{ function f(){return 1;} out(f()); } out(typeof f);` | 1,"undefined"; no global f. |
| L05 | strict `function f(a){var a;return a;} out(f(7));` | 7; var must not overwrite parameter. |
| L06 | strict `if(false){var x=1;} out(x);` | undefined, own nonconfigurable global x. |
| L07 | A strict `var x=3;`; B strict `var x; out(x);` | 3; repeat var keeps value. |
| L08 | strict `let x; var x;` / `function f(a){let a;}` | parse SyntaxError (full coverage); different-name neighbors parse. |
| L09 | strict `let undefined;` | runtime SyntaxError restricted global; existing global remains unchanged. |
| T01 | strict `out(this); function f(){return this;} out(f()); out(this.f());` | Realm global object, undefined, same global object. |
| T02 | strict `function f(){return this;} out(f.call(3)); out(f.call(null));` | exact primitive3, null; no wrapper. |
| T03 | A non-strict `function f(){return this;}`; B strict `out(f());` | P5: A global object, despite strict caller; before P5 A execution rejected. |
| T04 | A strict `function f(){return this;}`; B non-strict `out(f());` | P5: undefined, despite sloppy caller; no strictness leak into B. |
| T05 | strict `missing=(this.missing=5);` | runtime ReferenceError, property remains5; unresolved LHS not resolved again. |
| C01 | strict `1; let x;` / empty source | normal1 / normal undefined; empty is not undefined internally. |
| C02 | strict `1; {2;} ;` / `1; if(false){2;}` | normal2 / normal undefined (if supplies undefined via UpdateEmpty). |
| C03 | strict `let x=0; while(x<2){x+=1; x;}` | normal2; retained loop value. |
| C04 | A strict `let x=1; throw 7;`; B strict `out(x);` | A guest throw7; B outputs1; context restored, mutations retained. |
| R01 | Host creates Script Realms A/B and transfers A strict f returning an object to B; invoke f in B | allocation/prototype belongs A; B caller context restored; global objects/lexicals distinct. |
| R02 | Host transfers A sloppy f returning this to B; call with undefined then primitive3 | P5: A global then A Number wrapper; B intrinsic never used. |
| R03 | Callback in A throws guest7 while B calls it; repeat with host sentinel exception | exact guest value / exact host fault retained; B Realm/source/calls/depth restored on both. |
| R04 | Runtime input strict `while(true){}` then separate fresh session `out(1);` | first resource steps limit, no language-negative match; second succeeds. No reuse of exhausted session. |
| R05 | Runtime input strict `function f(){return f();} f();` | call guard at configured64, no crash; calls/depth restored and steps retained. |
| R06 | Source length100001, nesting beyond128; expression nesting beyond256 in host-driven AST control | explicit respective resource origins, no syntax certification; no body effects. |
| R07 | Units each consume budget below100000 but combined exceed100000 | second unit resource limit; first mutations retained, no per-unit reset. |
| V01 | strict `function f(a,a){}; new X();` | unsupported whole-source tail veto; not certified duplicate-parameter until new grammar supported. |
| V02 | strict `{function f(){} function f(){}}; /x/;` | unsupported RegExp tail veto; not certified block duplicate. |
| V03 | `return 1; class X {}` / `function f(){return 1;}` | unsupported-tail veto / valid neighbor; preserve accepted return audit. |
| U01 | H1 `function f(){return this;}`; H2 `this.h=1;`; T strict `out(this.h); out(f());` | P5: 1, global object; separate units, test strictness does not affect H1. |
| U02 | H1 `throw 7;`; T strict `out(9);` | harness-origin throw, no test body, no negative match; original H1 unit/location. |
| U03 | H1 defines function throwing7; T strict invokes it | stage=test, defining source H1, guest throw7; both identities retained. |
| U04 | Same H unit `let x;` loaded twice | second instantiation runtime SyntaxError, not deduplicated. |

P2–P4 may validate engine failures as internal completions while Error objects are
pending, but must label that evidence as non-conformance. Final runtime-negative
admission requires genuine guest Error instances and constructor extraction.
Matrix cleanup assertions include saved context identity, no leaked frames,
monotonic steps, retained source range and expected binding/property state, not
only printed output. No owner decision is required for this staged recommendation;
independent review and new bounded assignments are the next boundary.
