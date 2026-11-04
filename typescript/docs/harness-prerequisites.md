# TS-034P: prerequisites for the unchanged pinned harness

Design for independent review, 2026-11-04, base `b84a5e0`, accepted internal
activation `e67c927`. **No harness execution or corpus admission is claimed.**
The first proposed implementation is H1, strict Script `try`/simple `catch`
with explicit completion handling. All successors below remain blocked on
review and their stated dependencies. This is P5 of [Script design](script-execution.md),
not P6. The [audit](validation/ts-034p/README.md) retains whole-source parser
results, revision/hash identities, research and preservation evidence.

## Evidence and current boundary

Corpus revision is `91c70759363c46557b694792bf34a2551a7af5ba`. Exact bytes, Git
blob IDs, SHA-256, source URLs and copyright/license are retained in
[the accepted corpus snapshot](validation/ts-033p/corpus.json); the new audit
recomputes both hashes and checks the immutable manifest. The selection stays
33 files / 60 variants per lane, all 60 blocked. This design changes no pin,
source, transformation, denominator, classifier or observation envelope.

The audit submits **each entire unchanged source unit**, including all dormant
function bodies, to current `parseDeclarationPlan` and `prepareStrictScript`.
It does not concatenate units, inject directives, remove branches, execute a
partial AST, or use host eval/Function/vm. A first parser rejection is evidence
of that rejection, not an exhaustive list of missing constructs. The independent
source inventory below supplies the remaining requirements. These are Node-hosted
parser observations only; no native/parser parity or runtime success is inferred.

Observed first blockers: assert.js rejects `++` at170:34 in the lexer (the
earlier switch is not the first reported error because lexing precedes parsing);
sta.js rejects `instanceof` at14:14. doneprintHandle.js consumes all625 UTF-16
units in declaration planning, then fails strict preparation. No harness has
an executable record. Original selected bodies are inspected without adding a
strict prefix; their preparation results are not the strict-variant results.

At this base, `parser.ts:166–173` already supports comma-separated `var` lists
in declaration-plan mode. `script-execution-internal.ts:107–147` parses the whole
unit then rejects non-strict preparation. Function metadata/prototype objects
already exist (`materializeFunction`), but `GuestObject` has a callable slot and
no guest Construct operation. Host TypeScript `new`/`instanceof` in engine source
are not guest-language support. `runtime.ts:83–94` still makes engine failures
diagnostic-bearing **strings**; resource/unsupported origins remain distinct.
Bootstrap has primitive conversion helpers and Object.prototype.toString, but
does not supply the required guest String/Object constructor globals. E4's
212 records/lane and 49 static gates are retained evidence, not a harness pass.

## Whole-unit requirements versus reached paths

Line numbers refer to exact `text` fields in the pinned snapshot, counted from1.
No selected S01–S22 body calls compareArray/notSameValue directly. Their dormant
presence is still a parsing obligation. “Reached” below is a source-derived
expected path for named controls, not a measured execution trace.

| Unit / source feature | Whole-unit need | Reached obligation |
|---|---|---|
| assert.js: formatIdentityFreeValue | `switch`, cases, fallthrough; existing conditional/typeof/calls | Failure formatting of boolean/number/null/undefined reaches String; number -0 returns `'-0'` before String. String formatting takes fallback when JSON is absent. BigInt case syntax is only a string label; no BigInt literal dependency. |
| formatSimpleValue | `try`/identifier `catch`, var, rethrow | Failure formatting of objects calls String; a genuine TypeError from conversion reaches Object.prototype.toString fallback. Other thrown values are rethrown unchanged. |
| assert, sameValue, notSameValue | `new Test262Error`; sameValue try/catch | S07 true assertion, S05–S09/S14 sameValue successes. Deliberate false/mismatch controls must reach actual constructor and message paths. No always-successful shim. |
| assert.throws | comma var list (already supported), try/catch, constructor property access, new | S03/S04 need actual TDZ ReferenceError objects. S15 needs MyError construction and TypeError identity. Success requires exact `thrown.constructor === expectedErrorConstructor`, not instanceof or equal names. |
| compareArray / compareArray.format | `for (var i=0; i<a.length; i++)`, postfix update; member/call chain | Dormant for selected S consumers and proposed preflight. Array.prototype.map/global Array are not on that reached path; remain capability debt, not a reason to implement map here. Loop must still parse intact. |
| sta.js: Test262Error | `instanceof`, ordinary `new`, sloppy function `this` | Every deliberate assertion failure constructs a genuine ordinary guest Test262Error. Its function-call form substitutes sloppy this then recursively constructs; constructor form assigns message. This is a user-defined ordinary object, **not** an Error subclass in this pin. |
| sta.js: toString, thrower, $DONOTEVALUATE | function metadata/closures, throw, property writes | toString yields `Test262Error: message`; thrower constructs then throws. $DONOTEVALUATE throws its unchanged string if mistakenly executed; never execute a parse-negative body to classify it. |
| doneprintHandle.js | includes `in`, async host print protocol | Retained and parsed in audit only. Async lane stays blocked; not a default synchronous prerequisite. |

Load assert.js, then sta.js as separate non-strict Scripts. assert.js installs
functions referring to Test262Error before sta.js declares it; those bodies are
not invoked during load. This is ordinary late global resolution, not special
harness dispatch. Function expressions assigned as methods retain original
source spans and E3 naming rules. Top-level var/functions use existing GDI/FDI;
no global lexical conflation or fresh environment between units.

| Consumers | Remaining requirement after accepted E4 |
|---|---|
| S01/S02 | Runtime-negative TDZ must throw actual Realm ReferenceError; successful harness preflight alone cannot certify these. |
| S03/S04 | assert.throws catches TDZ object and compares exact constructor. S03 sloppy block-function variant remains Annex B blocked. |
| S05–S09/S14 | Reached assertions use call/SameValue; unchanged harness must wholly parse and failure controls work. S06's own strict f remains strict when called by sloppy foo. |
| S10–S13 | Failure-only new Test262Error in each unchanged test must parse even when comparisons pass; no dead-code exemption. |
| S15 | MyError construction; throws/catch identity; coercion traces `1`, `12`, `123`, `1234`; final two cases need guest Symbol factory and genuine TypeError. Symbol factory is a separate later assignment, not supplied here. |
| S16/S17 | Existing IdentifierName/duplicate data-key syntax; whole completion plus harness, not invented assertions. |
| S18–S22 | Existing return rule only remains certified. Assignment target, declaration position, duplicate strict parameters/block functions need separate whole-source rule audits. Parse-negative bodies never run. |
| U01–U11 | Preserve all blockers: duplicates/Annex B, async, raw/ASI, module, sloppy profile, RegExp, nesting and return line-terminators respectively as applicable. U05/U06 exercise sloppy this but are not admitted by this design; U07 needs genuine runtime ReferenceError and profile/driver review. |

## Sources governing the design

Normative baseline is [ECMA-262 edition16 (2025)](https://262.ecma-international.org/16.0/),
retrieved SHA-256 `6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713`.
[New research](validation/ts-034p/upstream.json) retains exact clause extracts
for OrdinaryCallBindThis, ordinary [[Construct]], OrdinaryHasInstance,
InstanceofOperator, TryStatement/CatchClauseEvaluation, Error/NativeError,
CaseBlockEvaluation and postfix increment. These constrain receiver conversion,
allocation, abrupt propagation, catch scope, fallthrough and reference updates.

Engine reference is [engine262 at d553e7b52501fbc47eae981c8d0fa7a5c26d0171](https://github.com/engine262/engine262/tree/d553e7b52501fbc47eae981c8d0fa7a5c26d0171).
Retained numbered source and per-file SHA-256 support these decisions:

* `function-operations.mts:170–205,337–389`: callee-mode this binding and ordinary
  base construction, object return overriding allocated receiver. Adopt semantic
  ordering, keep Rift explicit completions/private sessions instead of generators.
* `TryStatement.mts:35–46,88–118`: catch only throw, fresh catch environment,
  UpdateEmpty. Rift additionally must use host finally to restore state on host
  faults; do not copy a guest catch into a host catch.
* `RelationalExpression.mts:31–48`: @@hasInstance lookup precedes ordinary fallback.
  Do not implement a deceptively generic prototype-only instanceof operation.
* `Error.mts:57–90`: actual allocation, message coercion and Wtrue/Efalse/Ctrue
  own message. Its stack facilities and newer Error.isError are not adopted;
  edition16 governs. The future bounded Error slice must explicitly address
  options/cause or reject unsupported use before claiming that surface.

## Dependency-ordered assignments and ownership

These are frozen proposed boundaries, not permission to start successors. Each
needs an assigned writer and actual/second review. Each implementation owns one
new dedicated `test/harness-<slice>.ts`, its `fixtures/harness-<slice>/`, one
additive build-native entry, `docs/validation/<assigned-task>/`, its task status
and scoped feature inventory. No old test expectations/gates may change without
separate exact review. Coordinator owns COORDINATION and companion queue.

| Slice | Dependencies and exact production ownership | Interface and stopping boundary |
|---|---|---|
| **H1: strict simple catch — first ready** | E4. `src/syntax.ts`, `src/parser.ts`, `src/script-declarations.ts`, `src/script-execution-internal.ts` only | Add `try {…} catch (identifier) {…}` Script AST/planning/evaluation. Catch scope is declarative; existing ScriptEnvironment classes suffice. No finally, optional/destructured catch, Annex B catch-var exceptions, sloppy entry or Error migration. No legacy grammar change. See exact contract below. |
| H2: formatting switch | H1 reviewed. Same four files | Add Script switch/case/default node, scoped declaration plan and shared statement evaluation; one CaseBlock lexical scope, ordered discriminant/case evaluation, fallthrough and unlabeled break completion. No switch-specific public API. Whole unsupported tail still vetoes certification. |
| H3: dormant loop grammar with honest semantics | H2 reviewed. Same four files plus `src/lexer.ts` | Script classic `for` with var/expression/empty initializer and postfix `++` references; resolve once, ToNumeric/Get/Put order, old numeric result, continue runs update, break does not. No for-in/of, lexical for binding, prefix update or decrement claim. No AST-only executable placeholders; loop semantics must pass small controls even though corpus does not reach it. |
| H4: narrow internal sloppy functions | H1–H3 reviewed; dedicated pre-edit audit of strict assumptions required | `src/script-execution-internal.ts`, `src/script-record.ts`, `src/script-declarations.ts`, `src/script-environment.ts`, `src/script-reference.ts`, `src/realm.ts`. Add internal bounded preparation alongside unchanged prepareStrictScript; mode from parsed source, never filename. Own callee thisMode/global substitution/boxing and non-strict Reference behavior, global var/function setup. Unsupported duplicates, arguments/eval/with/Annex B remain explicit. No default/public profile change. |
| H5: ordinary construction and instanceof | H4 plus separately reviewed Construct interface checkpoint | `src/runtime.ts`, `src/realm.ts`, `src/syntax.ts`, `src/parser.ts`, `src/script-execution-internal.ts`, `src/builtins/function.ts`, `src/symbols.ts` only. Separate callability/constructibility; private construct dispatcher, actual constructor Realm/prototype/return semantics; @@hasInstance handling and ordinary fallback. No class/derived/new.target syntax, bound functions, Reflect or Proxy. No constructor-name matching. |
| H6: real errors and formatting globals | H5 plus separately reviewed complete error-site migration inventory | Proposed `src/builtins/error.ts` new, `src/builtins/string.ts`, `src/builtins/object.ts`, `src/realm.ts`, `src/runtime.ts`; exact additional diagnostic producers must be frozen in that checkpoint, **not implicitly owned here**. Actual Error/TypeError/ReferenceError/RangeError/SyntaxError objects and per-Realm identities; install needed String and Object globals/metadata. No diagnostic-string relabeling at the catch boundary. Symbol factory/map/JSON are excluded. |
| H7: unchanged bundle validation | H1–H6 accepted | No new production semantics. Dedicated host driver loads verified unchanged units, records literal controls below, both lanes/static coverage. Unsupported helper paths remain in capability inventory. Any failure returns to its responsible slice; never shim the harness. |
| P6: admission/transport | H7 plus rule/file-specific evidence | Still blocked and unassigned. Separate versioned observation/driver/ledger contract; no files in that subsystem owned by H1–H7. |

H5 and H6 are deliberately **checkpoint-blocked**, not implementation-ready:
Construct and error allocation cut across existing context consumers. Before
H5, freeze the explicit internal `construct(callee,args,loc)` dispatch contract,
constructor slot, `newTarget=callee` subset, guards and every changed signature.
OperationContext.call must not be reinterpreted as construction or exposed to
guest code. Before H6, enumerate every language-error producer and how it obtains
the correct Realm, including environment failures, coercions, builtins and
cross-Realm calls. Current `failure(name,message,loc)` has no Realm. A wrapper at
the outer Script return is insufficient because catch must see the object and
the allocation Realm can differ from the final observer's Realm. No broad
runtime migration is authorized by a table label.

H4 likewise keeps no executable record for unsupported source semantics.
Narrow admission is structural, independent of file ID: supported simple formals,
no arguments/eval/with or Annex B block functions, supported References. Required
sloppy rules include undefined/null substitution and primitive boxing in the
**defining Realm**, silent failed ordinary writes and unresolved global writes;
either implement or reject whole units using unsupported forms. Do not silently
execute sloppy code under strict semantics. E3 strict metadata/prototype invariants
are retained; any sloppy-specific own caller/arguments surface needs explicit
edition16 review before its function factory is considered complete.

## H1 interface and literal acceptance

Represent the new node as `{kind:'try-catch', loc, block, parameter, handler}`;
both blocks retain original nodes/source spans. Record a catch lexical scope
with one mutable initialized binding and a nested handler Block scope. Plan var
declarations in both arms into the enclosing variable scope, stopping at nested
functions. Include the catch parameter in lexical conflict checks (reject
`catch(e){let e;}`); var collision/Annex B cases stay explicitly unsupported
until audited. Reset catch/loop context across nested functions. No new public
body/AST accessor. Extend inspection copies only with inert scope metadata.

Extend DeclarationScope.kind with `catch` and a separate nullable catchParameter
site (do not pretend it is a formal or ordinary let declaration). Preserve all
existing scope IDs for unchanged source. Associate the original catch node with
its scope privately, validate that association during record preparation, and
materialize the catch environment only on entry. Update private scope validation
and detached inspection copying together; legacy evaluator must explicitly reject
new Script-only nodes if a trusted host supplies one. If exhaustive union changes
require an additional consumer outside these four files, stop for an exact
ownership amendment; do not silently broaden H1.

The shared Script statement evaluator evaluates block once. Only a **language
throw** enters catch: guest throws and genuine engine language failures; current
engine-diagnostic string values remain visibly provisional until H6. Resource
limits and unsupported-operation completions bypass guest catch; host exceptions
escape unchanged. Create/initialize catch binding with the identical thrown Value,
evaluate handler, apply TryStatement UpdateEmpty to undefined. Restore lexical
environment/frame in host finally for every exit. Do not overwrite last-abrupt
provenance merely because an exception was caught; a later throw captures its
actual source. Freeze this via new caught-then-rethrow/caught-then-new-throw tests.

All following controls are future literal expected results, not measurements.
Prefix H1 sources with literal `"use strict";`; `out` records Values via trusted
host setup and is not a corpus shim. Dedicated test host compares exact identity,
completion, source location, counters and effects, not stdout agreement alone.

| ID | Literal source / host setup | Required result |
|---|---|---|
| C01 | `try { throw 7; } catch (e) { out(e); }` | one number7; normal undefined completion |
| C02 | `try { out(1); } catch (e) { out(9); }` | only1; catch not created |
| C03 | `let e=3; try { throw 7; } catch(e) { out(e); } out(e);` | 7,3; no catch binding leakage |
| C04 | `let x={}; try { throw x; } catch(e) { out(e===x); throw e; }` | true then exact x thrown; catch source location, retained x identity |
| C05 | `function f(){try{return 5;}catch(e){return 9;}} out(f());` | 5; return is not caught |
| C06 | `try { throw 7; } catch(e) { let e; }` | unsupported/early-error only under separately audited rule; no effects, no false certified tag |
| C07 | `try { throw 7; } finally { out(9); }` | unsupported whole unit; no effects |
| C08 | `try { while(true){} } catch(e) { out(9); }` | steps resource origin; no9, counters restored, steps retained |
| C09 | host `fault()` throws exact host sentinel; `try { fault(); } catch(e) { out(9); }` | same host sentinel escapes, no9, session idle afterward |
| C10 | `try { throw 7; } catch(e) { out(8); } throw 9;` | only8 then guest9, last source is final throw, not caught7 |
| C11 | `while(true){try{break;}catch(e){out(9);}} out(1);` | only1; break propagates |
| C12 | `let n=0; while(n<2){n+=1;try{continue;}catch(e){out(9);}out(8);}out(n);` | only2; continue propagates |
| C13 | `function f(){try{throw 7;}catch(e){return function(){return e;};}} out(f()());` | 7 after catch environment exits; closure retains binding |

For C01/C04/C13 and cross-unit/cross-Realm variants, enumerate every actual new
catch setup/body resource prefix with zero and seven-step seeds after tick
placement review; no invented totals. Exhaustion before binding publication
must not publish it. Retain source cap100000, parse depth128, step default100000,
call depth64/evaluation depth256. Also test empty completion normalization
`1; try {} catch(e) {}` yields undefined, and `try { 2; } catch(e) {}` yields2.
Host fault injection belongs only at reachable callbacks, separately labeled
from resource exhaustion and inherited host-helper injection lanes.

Two post-compilation input files select literal whole sources
`"use strict"; try{throw 7;}catch(e){out(e);}` and
`"use strict"; try{throw 11;}catch(e){out(e);}` respectively. Expect number7 versus
number11, each once; both run every fixed C row as well. This exercises actual
runtime source/value selection, not an input marker printed beside identical
execution. Freeze input file hashes and outputs before either lane runs.

## Follow-on semantic controls and bundle gate

Each helper test below runs only after the responsible slices pass; optional
features cannot be smuggled into an earlier acceptance driver.

| Slice | Positive / negative neighbors and exact expectations |
|---|---|
| H2 | `switch(2){case 1:out(1);break;case 2:out(2);case 3:out(3);}` →2,3. `switch(9){case 1:out(1);break;default:out(4);}` →4. Side-effecting selectors stop after first match; duplicate lexical names across cases reject; unsupported nested tail vetoes whole-source certification. |
| H3 | `var i;for(i=0;i<3;i++){if(i===1)continue;out(i);}out(i);` →0,2,3. `var i=0;out(i++);out(i);` →0,1. Host accessor reference control exact Get→ToNumeric→Set once, setter throw propagates; break skips update. Unsupported for-of/lexical initializer rejects before effects. |
| H4 | Separate H `function f(){return this;}` then strict T `out(f()===this);` →true. Strict f returns undefined on bare call. Sloppy f.call(null) returns defining global; f.call(3) boxes using defining Number prototype; object receiver unchanged. Cross-Realm A function called in B still allocates/substitutes in A. Strict failed write throws; sloppy failed write is silent. |
| H5 | `function C(x){this.x=x;} var c=new C(7);out(c.x);out(c instanceof C);out(c.constructor===C);` →7,true,true. Constructor returning primitive uses receiver; returning object uses exact returned object. `new 7()` rejects as TypeError after prescribed operand/argument order. Host-seeded getter for prototype throws exact sentinel; @@hasInstance callback is called first. Equal constructor names in two Realms are distinct. |
| H6 | `try{missing;}catch(e){out(typeof e);out(e.constructor===ReferenceError);}` →object,true. `try{throw 'ReferenceError: fake';}catch(e){out(typeof e);}` →string. Error construction and TDZ use correct Realm; same-named constructors from different Realms differ. Error message coercion executes once and propagates throws. Resource exhaustion cannot become catchable RangeError or satisfy runtime-negative matching. |

H7 loads the **original** assert.js and sta.js anew in a fresh Realm/session for
each row below. Every row must have independently frozen outputs before running
either lane. Retain thrown object and inspect its constructor identity without
executing a replacement assertion library. No source rewriting in these units.

| ID | Literal test unit | Expected |
|---|---|---|
| B01 | `"use strict"; assert(true); assert.sameValue(NaN,NaN); assert.sameValue(-0,-0);` | normal |
| B02 | `"use strict"; assert(false,'control');` | actual Test262Error; message `control` |
| B03 | `"use strict"; assert(false);` | actual Test262Error; message `Expected true but got false` (switch/String reached) |
| B04 | `"use strict"; assert.sameValue(0,-0);` | actual Test262Error; message `Expected SameValue(«0», «-0») to be true` |
| B05 | `"use strict"; assert.throws(ReferenceError,function(){missing;});` | normal, real ReferenceError caught |
| B06 | `"use strict"; assert.throws(ReferenceError,function(){});` | Test262Error, no-exception branch |
| B07 | `"use strict"; assert.throws(ReferenceError,function(){throw 7;});` | Test262Error, non-object branch |
| B08 | `"use strict"; assert.throws(ReferenceError,function(){throw new TypeError();});` | Test262Error, wrong constructor branch |
| B09 | host supplies other Realm ReferenceError as Other; `"use strict"; assert.throws(ReferenceError,function(){throw new Other();});` | Test262Error, same-name/different-constructor branch |
| B10 | `"use strict"; assert.throws(TypeError,7);` | Test262Error, non-callable func branch |
| B11 | `"use strict"; var e=Test262Error('x'); assert.sameValue(e.constructor,Test262Error); assert.sameValue(e.toString(),'Test262Error: x');` | normal, call-form/new/instanceof path |
| B12 | `"use strict"; Test262Error.thrower('control');` | actual Test262Error, message control |
| B13 | `"use strict"; assert._isSameValue=function(){throw 7;}; assert.sameValue(1,1,'control');` | Test262Error, message `control (_isSameValue operation threw) 7`; mutation isolated to disposable Realm |
| B14 | `"use strict"; assert(false,{toString:function(){throw 7;}});` | Test262Error stores exact object as message; no eager message conversion |
| B15 | `"use strict"; assert.sameValue({toString:function(){throw new TypeError();}},0);` | Test262Error mismatch message uses Object.prototype.toString fallback; no swallowed non-TypeError |
| B16 | `"use strict"; assert.sameValue({toString:function(){throw 7;}},0);` | exact guest7 escapes formatting, **not** Test262Error |

B06–B10 assert these literal messages, not diagnostic names:

* B06: `Expected a ReferenceError to be thrown but no exception was thrown at all`
* B07: `Thrown value was not an object!`
* B08: `Expected a ReferenceError but got a TypeError`
* B09: `Expected a ReferenceError but got a different error constructor with the same name`
* B10: `assert.throws requires two arguments: the error constructor and a function to run`

B15 message is `Expected SameValue(«[object Object]», «0») to be true`.
Also directly check `assert.notSameValue(0,-0)` normal and
`assert.notSameValue(1,1)` Test262Error; these are coverage controls, not claims
that the selected consumers need that method. compareArray/map remains outside
the declared validated surface; parser coverage is not runtime certification.

Preflight faults retain stage harness and harnessValidated=false; host fault,
resource and timeout statuses win over any negative expectation. Once preflight
passes, discard it and reload all units in the test Realm. Keep stage=test when
a test invokes an assertion whose defining source is assert.js. Source unit IDs
include ordered include occurrence; repeated units are never deduplicated.
Session budgets are shared across ordered units, monotonic across calls and
Realms. Preserve captured-owner authority, one-use builtin permits, opaque records,
finally restoration and first-abrupt provenance from accepted E4/E4-C.

## Admission gates and non-goals

Every implementation slice requires literal Node/native assertions with two
semantically distinct runtime-read inputs, fresh native build, unchanged
static-only flag and separate zero-dynamic coverage. Keep all212 records and
49 old gates, add only its own gate, and replay affected E4/E3/ER/reference controls
plus required runner20/probes10/host73/observations22/typecheck. Do not count a
model seam or Node-only reflection as native production proof. New compiler
failure requires a retained reduction and coordinator review before workaround.

H7 is not sufficient for public admission. The current observation transport has
no silently extensible field for arbitrary Script instantiation/body/provenance
states. P6 must review both decoders/driver and rule certification atomically;
constructor extraction must inspect actual thrown guest objects with explicit
failure/Realm outcomes, never Diagnostic.name. Parse negatives need complete
source coverage and certified rules; valid parse fails without executing body.
Each file/variant needs its own capability evidence and ordered harness hash key.
All60 variants remain blocked until that later assignment, including cases whose
body is already executable internally. No CLI/default profile change, arbitrary
sloppy admission, source substitution, public Construct API, async/module/Annex B,
arguments, JSON, map, RegExp or Symbol factory implementation is part of TS-034P.
