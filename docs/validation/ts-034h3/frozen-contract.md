# TS-034H3-P: classic for and postfix increment

Design for actual and independent second review, 2026-11-04, base `a978442`,
accepted H2 `b1ec155`. This is an internal strict Script proposal, not implemented
support. [Evidence](validation/ts-034h3-p/README.md) binds source inspection,
literal controls, tick prefixes and proposed old-test migrations. No harness
execution, public admission or native semantic claim follows from this audit.

## Owned boundary

Exactly five proposed production files: `src/lexer.ts`, `src/syntax.ts`,
`src/parser.ts`, `src/script-declarations.ts`, `src/script-execution-internal.ts`.
Reuse the shared Evaluator, Reference get/put, toPrimitive/toNumber, Script
completion/environment machinery and original node associations. No new runtime,
coercion, Realm, facade or compiler API. An actual exhaustive-consumer or compiler
failure outside this boundary requires a retained reduction and exact amendment.
There must be no alternate evaluator or parse-only executable loop placeholder.

Future implementation owns new `test/harness-for-update.ts`,
`fixtures/harness-for-update/`, one additive native build entry, scoped feature
inventory/task status and new implementation evidence. Only the exact migrations
below are proposed for existing tests; coordinator review must authorize them.
Preserve 212 old records/lane, 51 old gates, H1's 104 and H2's 208 prefixes,
H1 C14, all 60 blocked variants, pins, C++, history, public CLI and observation
contracts. Coordinator owns COORDINATION and publication. Stop after reviewable
design; H3 implementation and every successor remain unassigned here.

## Syntax and original identities

Freeze these additions to syntax.ts:

```ts
type VarStmt = { kind: "var"; loc: Location;
    declarations: { name: string; init: Expr | null }[] };
type ForStmt = { kind: "for"; loc: Location;
    initializer: VarStmt | Expr | null; test: Expr | null;
    update: Expr | null; body: Stmt };
// Expr alternative:
// { kind: "postfix-increment"; loc: Location; target: Expr }
```

Extract the existing var union alternative into VarStmt without changing its
shape. A header var is an original parser-created VarStmt at the `var` keyword,
not a synthesized block, expression statement or desugared while. The for node
is at `for`; postfix node is at its target's original loc (not the ++ token).
The target/body/initializer nodes remain the exact objects produced by parsing.
No for lexical scope or per-iteration environment is created. An actual block
body still allocates a fresh BlockActivation each iteration; closures retain
that iteration's block bindings while header vars share the variable binding.

Only declaration-plan parsing admits for/postfix. Add optional
`allowIncrement = false` to lex; only parseDeclarationPlan passes true.
When true, tokenize ++ as one punctuator; -- stays lex.operator unsupported.
All other lex callers keep the default, including legacy parse and return audit.
This preserves the *exact* old ++ rejection location/message even if it occurs
after some other unsupported syntax. No global lex admission followed by a
different parser error is acceptable. Existing callers need no edits.

For grammar: `for ( [var list | expression] ; [expression] ; [expression] ) branch`.
Var list uses existing ParsedBinding sites/initializer spans and comma-list
ordering, with the bindings map keyed by the header VarStmt's start. The header
parser owns both semicolon separators; the var helper must not consume an extra
semicolon. `branch()` retains the ban on bare let/function declarations. Increase
loops around the body only; functionTail already saves/resets/restores both loops
and switches. No for-in/of/await, lexical initializer, destructuring, labels,
prefix ++, decrement, comma expression or ASI expansion.

Implement the grammar's NoIn boundary, not a source substring ban. Pass a local
`allowIn` grammar parameter through expression/binding recursion for the initial
expression and var initializer. Binary/assignment RHS inherit it; conditional
consequent is +In and alternate inherits it; parentheses, call arguments, array
elements, object values and computed keys parse their normal +In expressions.
Test/update are +In. Stop at an unparenthesized `in`, then required semicolon
rejects the for-in form. `for(var x=("p" in o);false;);` is valid; a nested
function body resets to its ordinary grammar. `of` remains an identifier but
cannot replace the required semicolon. Preserve existing expression precedence.

Consume postfix after member/call suffixes and before binary/conditional/
assignment operators. Only identifier/member targets qualify, including their
parenthesized forms. Postfix cannot become an assignment target, be repeated,
or receive an unparenthesized call/member suffix. Parenthesized `(x++).p` is a
normal member expression; `x++.p`, `x++()`, `x++++`, `(x+1)++`, `f()++`,
`x++=1` reject. `-x++` means `-(x++)`; `(-x)++` rejects. Compare the ++ line
against the previous consumed token's line, not target.loc: `(\nx\n)++` is
valid; `x\n++`, `x/*\n*/++`, CRLF/U+2028/U+2029 between target and ++ reject.
Use existing unsupported categories (parse.assignment-target, parse.line-terminator,
parse.expected-token/unexpected as applicable), never a new certified early-error
rule. Strict eval/arguments stay reserved. Unsupported dormant tails veto the
whole source before an executable record or declaration side effect exists.

Collector traversal is syntactic source order: initializer, test, update, body
(reverse push on its existing work stack). Visit a var initializer via the
original VarStmt with current lexical/variable scope; visit expression initializer
normally. Postfix visits target once. Every header initializer's anonymous
function retains its original source and naming eligibility. Test/update/body
functions and blocks are collected even when runtime will never reach them.
Header vars propagate through enclosing block/switch/catch exactly like ordinary
vars; nested function vars stop there. Conflicts remain whole-unit checks.
No new scope kind, fabricated body array, span remapping or public AST access.
Existing preparation validation checks the original function/block nodes. Header
declaration entries must reference the original VarStmt and its exact initializer
objects through nodes.declarations; they never refer to ForStmt or copied bindings.
The ForStmt remains in its original parent's statement/body tree, so execution
reaches those same nodes without a separate loop registry or scope lookup. Unchanged
sources must retain all scope/declaration IDs. Detached inspection copies may
describe new initializerKind strings but expose no execution nodes.

## Reference and numeric semantics

Shared expression evaluation adds a Script-only postfix arm. If `env !== null`,
throw host Error `Script postfix increment AST requires Script execution` before
target effects. Legacy statement evaluation rejects a trusted ForStmt with
`Script for AST requires Script execution`; retain the separate exact var,
try-catch and switch guards.

Within the existing expression tick/depth/capture wrapper, in this exact order:

1. `#reference(target, null, receiver)` once. Identifier resolves its original
   binding; member evaluates base then key once. Do not call #value(target),
   resolve again after conversion, or use an assignment AST.
2. `#get(reference, expr.loc)` once, returning an abrupt completion unchanged.
   runtime.getValue boxes/validates the base, converts key, caches its successful
   string/symbol Value **on that Reference before Get**, and calls internalGet
   with the original base as Receiver. Nullish base rejects before key conversion
   (key expression still ran). Thus reuse the same Reference for PutValue;
   no additional key hook is needed. Primitive boxing has no ticks/hooks.
3. `toPrimitive(oldValue, "number", context, expr.loc)`, then
   `toNumber(primitive.value, expr.loc)`, propagating each exact throw.
4. Make Number Value `newValue = numeric.value + 1` using host binary64 arithmetic.
   `#put(theSameReference, newValue, expr.loc)` once. Strict failure/throw escapes;
   no old result is delivered if the write fails. Never use binary("+",…): that
   has default-hint/string-concatenation semantics.
5. Return normal Number Value of the **old numeric value**, including -0 and NaN,
   not the old string/object and not PutValue's new-value result.

No standalone ToNumeric exists. Value has undefined/null/boolean/number/string/
symbol/object only; no BigInt, and literals cannot introduce it. For this domain
ToPrimitive(number) + ToNumber implements ToNumeric's Number branch. Symbol
throws the existing language TypeError. Existing toNumber(object) is unsupported,
so step 3 must perform toPrimitive first; do not accidentally route objects to
that unsupported fallback. The scanner-backed stringToNumber accepts its existing
whitespace, signed decimal/exponent/Infinity, unsigned binary/octal/hex grammar;
invalid strings produce NaN. Guest numeric *literal* grammar remains much smaller
(no exponent/radix/BigInt literal expansion). No ToNumeric export, BigInt Value,
factory, coercion backend change or claim of complete numeric support is allowed.

Accessors may replace the property or prototype during Get/conversion. Put uses
the captured base/key but the **then-current** descriptor/prototype; do not cache
a descriptor or setter. The original Receiver is used for Get/Set even for
primitives/inherited accessors. A converted key stays cached even if conversion
of the old value mutates the key object's hooks. Host/guest callbacks, coercion,
getters and setters share the active session and defining Realm call machinery.
No new ticks for arithmetic, binding resolution/get/put or successful primitive
conversion; ordinary existing coercion ticks/calls still apply. No refunds.

## Loop and completion order

Use the shared #scriptStatement arm under its single for statement tick/depth
guard. Initialize once: absent does nothing; expression calls #value and discards
its value; var calls #statement(original VarStmt), preserving its var statement
tick and original initializer naming. Any abrupt escapes unchanged. Start V as
present undefined, independent of initializer value or preceding StatementList.

Each iteration: evaluate optional test (absent means true, no tick), stop normal V
if false. Evaluate original body once. Break returns normal UpdateEmpty(body,V)
payload and **does not update**. Throw/return propagate with UpdateEmpty(body,V)
(which preserves their objects). Normal/continue replace V only if payload is
nonempty, then evaluate optional update once and discard its value, then test
again. Continue **does update**; switch consumes only its own break and forwards
continue; nested loops consume theirs. Absent update has no tick. No extra
iteration charge: even `for(;;);` ticks its empty body, so cannot run unbounded.
No artificial block/while wrapper or per-iteration environment/setup tick.

Existing host finally wrappers restore depth/frame/Realm/calls and one-use
permits across every guest abrupt, resource limit and host fault. For has no new
environment to restore; body blocks restore before update. Keep first-abrupt
identity/provenance capture, diagnostic Location separate from defining unit,
and H1's consumed-propagation reset. Neither loop nor postfix consumes a throw.
Only language throws enter catch, not resource/unsupported completions; host
faults escape identically. Explicit ThrowCompletion locals may use accepted H2
lowering; no catch/reconstruction or broad error migration.

## Literal semantic controls (future acceptance)

All sources below receive exactly `"use strict";` first. `out` is a trusted
recording host builtin, not a harness shim. Compare Values/identity and completion,
not only text. Host-seeded properties are ordinary writable data unless specified.

| ID | Source / setup | Required result |
|---|---|---|
| F01 | `for(var i=0;i<3;i++)out(i);out(i);` | 0,1,2,3; one global var |
| F02 | `let i=9;for(i=0;i<2;i++)out(i);out(i);` | 0,1,2; expression init once |
| F03 | `let i=0;for(;i<2;)i++;out(i);` | 2; optional init/update |
| F04 | `for(;;)break;` | normal undefined; absent test |
| F05 | `let i=0;for(;i<3;i++){if(i===1)continue;out(i);}out(i);` | 0,2,3; continue update |
| F06 | `let i=0;for(;i<3;i++){out(i);break;}out(i);` | 0,0; no break update |
| F07 | `function f(){for(;;out(9))return 7;}out(f());` | 7 only |
| F08 | `let e={};try{for(;;out(9))throw e;}catch(x){out(x===e);}` | true only |
| F09 | `for(mark(1);mark(false);mark(9))out(8);` | trace1,false only; init discarded |
| F10 | `let i=0;for(;i<2;i++){switch(i){case 0:continue;default:break;}out(i);}out(i);` | 1,2 |
| F11 | `let i=0;for(;i<2;i++){for(;;)break;out(i);}` | 0,1 |
| F12 | `9;for(;false;);` / `9;for(;;)break;` | normal undefined each |
| F13 | `for(;;){7;break;}` | normal7 |
| F14 | `let i=0;for(;i<1;i++){7;continue;}` | normal7; update value ignored |
| F15 | `for(var i=0,j=i+2;i<1;i++)out(j);` | 2; binding order/hoist |
| F16 | `out(i);for(var i=4;false;);out(i);` | undefined,4 |
| F17 | `let a;let b;for(var i=0;i<2;i++){let x=i;if(i===0)a=function(){return x;};else b=function(){return x;};}out(a());out(b());out(i);` | 0,1,2; fresh block closures |
| F18 | `let a;for(var i=0;i<2;i++)a=function(){return i;};out(a());` | 2; shared var closure |
| F19 | `for(var f=function(){return 7;};false;);out(f.name);out(f());` | f,7; original function source/Realm |
| F20 | `for(var x=("p" in {p:1});false;);out(x);` | true; nested +In |
| U01 | `let x="7";out(x++);out(x);` | number7,number8 |
| U02 | host x=-0; `out(x++);out(x);` | -0,1 by SameValue |
| U03 | host x=NaN,+Infinity,-Infinity,9007199254740992 in separate Realms; `out(x++);out(x);` | each old/new same numeric value (NaN via SameValue) |
| U04 | host x=undefined,null,false,true,"", "0x10", "1e2", "bad"; same source | old NaN,0,0,1,0,16,100,NaN; new old+1 |
| U05 | `let x=1;out(x++*2);out(-x++);out(x);` | 2,-2,3 |
| U06 | `let x=1;out((x)++);out(x);` | 1,2 |
| U07 | host object/key/get/number-hook/set recorder; `out(base()[key()]++);` | base,key,key:string,get,old:number,set8,out7; each once; exact receivers |
| U08 | host getter returns object with no @@ hook, valueOf returns object, toString returns "7"; `out(o.p++);` | get,valueOf,toString,set8,out7 |
| U09 | key hook returns symbol; host symbol property=7; `out(o[k]++);` | one string-hint key hook; same symbol key Get/Set; 7 then stored8 |
| U10 | getter/number hook changes descriptor to setter B, or makes property nonwritable | B receives8, old7 returned; or TypeError after conversion, no out |
| U11 | inherited accessor on host primitive prototype; `out(p.x++);` | getter/setter this is original primitive, new8, out7; no own primitive property |
| U12 | host symbol x; `x++;` | TypeError, x identical, no write |
| U13 | `missing++;` / `x++;let x;` / `undefined++;` | ReferenceError unresolved / TDZ / strict TypeError write to immutable global property; no successful result |
| U14 | host nonwritable/getter-only o.p=7; `out(o.p++);` | Get/conversion precede strict TypeError; no out/set |
| U15 | `null[key()]++;` | key expression occurs, then TypeError; no key conversion hook |
| U16 | `(\nx\n)++;` with host x=7 | normal7, x=8; last-token line check |

F17/F19 saved functions must also be called from another strict unit and another
Script Realm in a separate ample-budget session: retained source/defining Realm,
prototype/name/length and closure values; no scope ID renumbering for old inputs.
U07 also mutates key hook during old-value conversion; still one key conversion.

| ID | Rejected source (strict prefix) | Required boundary |
|---|---|---|
| N01 | `for(let i=0;i<1;i++);` / `for(const i=0;;);` | lexical header excluded |
| N02 | `for(var k in o);` / `for(k of o);` / `for await(k of o);` | nonclassic excluded |
| N03 | `for(var x="p" in o;false;);` / `for(x="p" in o;false;);` | NoIn boundary |
| N04 | `++x;` / `x--;` / `--x;` / `x++++;` | neighbors excluded |
| N05 | `1++;` / `f()++;` / `(x+1)++;` / `x++=1;` / `(-x)++;` | invalid targets |
| N06 | `x\n++;` / `x/*\n*/++;` (also CRLF/U+2028/U+2029) | no LineTerminator before postfix |
| N07 | `for(;;)function f(){}` / `for(;;)let x;` / `for(;;){function f(){continue;}}` | branch/context rules |
| N08 | `for(;;){function f(){break;}}` / `for(;;)break label;` | function reset/labels |
| N09 | `let x;for(var x=0;false;);` / `{let x;for(var x=0;false;);}` | lexical-var conflict |
| N10 | `try{}catch(e){for(var e=0;false;);}` | H1 catch collision unsupported |
| N11 | `for(;;){break;class X{}}` / `let x;let x;for(;;){break;const y=0;}` | unsupported tail vetoes conflict certification |
| N12 | `for(;){};` / `for(var ;false;);` / `for(;;` / `for(x=0,y=0;false;);` | malformed/comma unsupported |
| N13 | `x++.p;` / `x++();` / `eval++;` / `arguments++;` | suffix/strict reserved boundary |
| N14 | unprefixed `for(;;){function f(){}}` | non-strict block-function planner rejection |

Every rejected whole source has no executable record, effects or session ticks;
N09 is existing structural conflict evidence, not public rule certification.
Positive neighbors include functions with their own loops, nested function var
not conflicting with outer let, and `for(;false;){var x;}` hoisting x despite no
body evaluation. Plan functions in each header position and body with source
spans checked against literal substrings, not reconstructed sources.

Freeze this declaration-association control (strict prefix), never execute its
test function in the source-only design audit:

```js
for(var f=function(){return 7;};function(){return false;}();function(){return 1;}()){
  let x;
  function g(){return x;}
  var y;
}
```

Expected scope IDs/kinds/parents: 0 script/null, 1 function/0 (f initializer),
2 function/0 (test), 3 function/0 (update), 4 block/0 (body), 5 function/4 (g).
Declarations in order: 0 f var scope0 variableScope0 with original initializer;
1 x let scope4 variableScope0; 2 g function scope4 variableScope0 functionScope5;
3 y var scope4 variableScope0. Root var IDs [0,3]; block lexical IDs [1,2], var
IDs [3]. All function/block bodies are original arrays. Scope1/2/3 source spans
are exactly their respective function expressions, not including following calls.
Header f gets inferred name f at runtime; test/update expressions stay anonymous.
Check detached inspections cannot mutate these associations or function source.
Also retain duplicate `var i,i` declaration order (two IDs, one global binding),
function-local header vars in FDI, outer-block header-var lexical conflict, and
switch/catch propagation controls from N09/N10.

## Abrupt, reentrancy and limits controls

X01: in separate runs return the same preallocated ThrowCompletion (object Value,
diagnostic900:9) at initializer, test, body, update, target base/key expression,
key conversion, getter, number conversion and setter. Earlier effects only;
no later stage. For-loop update failure comes after body effects; no next test.
Assert exact completion/Value identity and defining source/Realm lastAbrupt.
Repeat origins guest, engine-diagnostic, resource and unsupported; only first two
enter H1 catch. Setter failure prevents postfix result even after effects.

X02: preserve H1 C14 unchanged. Additionally A catches `o.p++` getter's reused
throw, then B's original-source function `function again(){for(;;)o.p++;}` returns
that identical completion from the same getter. Same-Realm two-unit and cross-
Realm calls must capture B on second propagation, not stale A; diagnostic900:9
and object identity remain unchanged. First-abrupt history is not overwritten by
loop unwind. The getter callback's defining Realm follows existing builtin rules.

X03: actual reachable host faults at every X01 callback position escape as exact
host sentinel. Run nested session B while A is active, then unwind to A: exact
outer active snapshot/calls/depth/Realm and pending permit restored, idle after A.
No guest catch and no arbitrary fake fault-at-tick hook. Saved authentic callbacks
cannot reuse consumed permits or wrong-owner contexts. Retain E4 boundary checks.

X04: host accessor/coercion callback reenters a guest function in another Realm
that itself increments; all calls and ticks use one session budget. With default
calls64 and depth256 run separately recursive getter and numeric hook (guest and
host-to-guest), assert resource origin, no host stack crash, exact restoration and
monotonic steps. Freeze measured large recursion totals only after implementation;
the small literal prefix oracle is already fixed, not deferred to measurements.

X05: direct trusted legacy AST guards above, original-node association/inspection
mutation controls, fresh/foreign activation rejection, source cap100000 and parse
depth128. Resource failures stay separate from syntax/language failures. Preserve
H1/H2 exact diagnostics and legacy ++ negatives verbatim. No cross-profile calls.

## Exact migration proposal and sources

Active Script negatives: test/script-execution.ts:852 `for(;;){}` and :859 `x++;`,
and test/harness-switch.ts:356 `switch(1){case 1:x++;}`. Replace the first two
array elements with `for(let i=0;;){}` and `++x;` respectively. Add scalar positive
`H3-empty` with `"use strict";for(;;)break;` expected undefined and `H3-postfix`
with `"use strict";let x=7;x++;` expected7. The original infinite for source
must remain a dedicated new resource control, and original unresolved `x++;`
must remain a runtime ReferenceError control; neither is silently discarded.
Replace only the switch negative source with `switch(1){case 1:++x;}` keeping N08;
new H3 positive `let x=7;switch(1){case 1:out(x++);}out(x);` must output7,8.
Machine-readable exact whole-file migration proposals are in evidence; never
exempt an entire test file from preservation.

Legacy negatives in compound-assignment P20, primitive-reads, property-assignment
and tools/run-guests increment remain unchanged under lex's false default.
Historical H1/H2 preservation scripts and design N08 still contain old negatives;
keep their bytes/results, do not run them as a new whole-file acceptance oracle.
The new H3 verifier compares exact two amended files against this base, retaining
all H1/H2 approved migrations and every other assertion. Audit inventory covers
all tracked executable mentions, separating host loops from guest expectations.

Pinned corpus assert.js's compareArray loop at170 must parse intact eventually.
It is dormant for the selected consumers, so syntax alone does not validate helper
execution. Its formatting helper at178–180 calls Array.prototype.map; that is
separate capability debt, not another loop to implement. Full unchanged assert/sta still require
new/instanceof, sloppy preparation, genuine errors/globals and later H7 controls.
H3 neither strips dead functions nor executes partial ASTs. All60 stay blocked.

Normative evidence: [ECMA-262 edition16](https://262.ecma-international.org/16.0/)
ForStatement/ForBodyEvaluation, postfix increment, ToNumeric, UpdateEmpty and
EvaluatePropertyAccessWithExpressionKey. SHA256 of full edition is
`6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713`.
Engine evidence: [engine262 LabelledEvaluation](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/LabelledEvaluation.mts)
and [UpdateExpression](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/UpdateExpression.mts),
pinned `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`; numbered source/hash/license
retained in upstream.json. Adopt ordering/reference preservation, not generators,
BigInt support or per-iteration lexical environments outside this subset.
No engine implementation code is copied. Specification governs disagreements.

Implementation acceptance: two frozen actual runtime-read inputs, all literal
F/U/N/X controls and every fresh/seeded prefix in both Node/native, a fresh native
build with unchanged static-only and separate zero-dynamic gate, 212 unchanged
records, all51 old gates plus one, H1/H2/E4 two-input and affected reference,
coercion, declaration, closure/metadata replays; typecheck, runner20, probes10,
host73, observations22, unchanged60blocked. Stop for actual and second review;
no successor, public admission or publication by the feature writer.
