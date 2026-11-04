# TS-034H5-P: ordinary Construct and instanceof checkpoint

Design candidate, 2026-11-04, base `a0f3332` / accepted H4 `13fa6d2`.
This is a bounded implementation contract for review, not implementation
authorization or measured semantic success. Production and existing tests are
unchanged. Evidence: [audit and frozen controls](validation/ts-034h5-p/README.md).

## Boundary and evidence

Implement ordinary **base Script functions** only. All materialized declaration
and anonymous expression functions in either strict or bounded preparation get
the constructor slot. Legacy functions, builtin methods, Function.prototype and
the current Number conversion builtin remain nonconstructible in this slice.
Number construction is still unsupported capability debt, not a claim that the
ECMAScript Number constructor lacks [[Construct]]. Do not add native constructors,
classes, derived constructors, new.target, bound functions, Reflect, Proxy, Error
objects, Symbol factory, or public execution/admission APIs. Keep 60 variants
blocked, 212 old records/lane, 53 old static gates and all H1–H4 matrices.

The source audit finds callable metadata and an ordinary function's own
`prototype`, but neither implies an existing Construct operation. The shared
ExecutionEngine has one expression evaluator; `#callScript` owns active-frame,
callee Realm, call-depth, builtin permits, function activation and cleanup.
`OperationContext.call` is used by accessors/coercions/builtins across the source
tree. It must remain an ordinary call with its existing four arguments.

Normative evidence is edition 16: [EvaluateNew](https://262.ecma-international.org/16.0/#sec-evaluatenew),
[ordinary [[Construct]]](https://262.ecma-international.org/16.0/#sec-ecmascript-function-objects-construct-argumentslist-newtarget),
[GetPrototypeFromConstructor](https://262.ecma-international.org/16.0/#sec-getprototypefromconstructor),
[InstanceofOperator](https://262.ecma-international.org/16.0/#sec-instanceofoperator),
[OrdinaryHasInstance](https://262.ecma-international.org/16.0/#sec-ordinaryhasinstance),
and [Function.prototype @@hasInstance](https://262.ecma-international.org/16.0/#sec-function.prototype-%symbol.hasinstance%).
Exact edition SHA and excerpts are retained. Engine evidence is engine262
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171`, function-operations.mts
337–391 (separate construction, pre-context allocation, shared body evaluation)
and RelationalExpression.mts (operand order, hook dispatch). Adopt these
semantic separations, not its generator machinery, class initialization or bound
function support. No code is copied. Retained upstream LICENSE applies to the
source evidence. H4 retained OrdinaryCallBindThis/FDI remains normative.

## Exact proposed production ownership and API amendment

Seven existing production files, subject to actual/second approval:

| File | Exact changes / consumers |
|---|---|
| `src/runtime.ts` | Add fourth optional GuestObject constructor parameter `readonly constructorSlot: ScriptGuestCallable \| null = null`. Keep callable independent and all three old positional arguments/defaults unchanged. No class field named prototype; no change to Callable, OperationContext, Builtin, Reference, Completion or failure. |
| `src/script-execution-internal.ts` | `materializeFunction` supplies the identical branded callable as fourth argument. Shared expression switch handles new; binary routes instanceof only in active Script mode. Add private `#construct(callee: Value,args: Value[],loc: Location): ValueCompletion`. Factor function activation/body portion of `#callScript` into private `#executeScriptFunction(fn: ScriptGuestCallable,receiver: Value,args: Value[]): ValueCompletion`, called only inside established call/construct boundary. Keep builtin dispatch in #callScript. No public construct method or context projection. |
| `src/syntax.ts` | Expr arm `{kind:"new";loc:Location;callee:Expr;args:Expr[]}`. Existing binary node represents instanceof. |
| `src/parser.ts` | Structural-plan-only bounded new grammar below; instanceof at relational precedence6. No legacy/return-audit widening. |
| `src/script-declarations.ts` | `visitExpression` visits new exactly as call: push args in reverse then callee, yielding callee-first traversal. Required for anonymous functions, strictness and unsupported tails in operands/args. No scope/node IDs change for old sources. |
| `src/builtins/function.ts` | Add `ordinaryHasInstance(callee: Value,value: Value,context: OperationContext,loc: Location): ValueCompletion` and `instanceofOperator(value: Value,target: Value,context: OperationContext,loc: Location): ValueCompletion`. Install Script-only @@hasInstance using createBuiltin and bootstrapDefine. Allow exact native initial name `[Symbol.hasInstance]` alongside existing `[Symbol.toPrimitive]`; do not permit arbitrary bracket names. |
| `src/symbols.ts` | Export single module-level `wellKnownHasInstance = new GuestSymbol("Symbol.hasInstance")`. Identity shared across Realms, no new guest factory. |

This is **not** the old seven-file outline: declaration traversal replaces Realm
behavior. Realm stays unchanged: its existing registerFunction call bootstraps
the Script-only method, and createBuiltin keeps its default null slot. These
seven paths are the complete proposed production ownership, not permission for
unrelated edits. MetadataCollector in
script-metadata.ts uses legacy `parse`, which rejects new/instanceof; its visitor
cannot receive these nodes through its public API. No widening or edit there.
The script-record/execution facades, record association validation, lexer,
environments, reference helpers, public evaluator/CLI, observation/transport,
manifests and compiler stay unchanged. The audit retains all expression-switch,
factory, call/context and capability consumers to make this reachability claim
reviewable. An unexpected exhaustive consumer or compiler failure requires a
bounded amendment, never silent ownership expansion.

Every existing `new GuestObject` callsite keeps its semantics through the default
null slot; only materializeFunction supplies the fourth argument. GuestArray and
primitive-box super calls are unchanged. Realm.createBuiltin, functionPrototype,
createGuestFunction and all old host fixtures remain call-only. Read typeof,
accessor endpoint validation and Function.prototype.call/toString through
callable, never constructorSlot. No changed signature at any OperationContext
consumer or host fixture. No new Builtin signature or construction permit.

## Grammar and whole-source gate

Only declaration-plan/bounded-plan parser purposes accept the new forms; strict
entry keeps requiring actual strict source. The legacy parse/return audit and
inspectScript remain unchanged. Prefix `new` accepts a supported primary
(identifier, this, literal, anonymous function, object/array literal, or
parenthesized supported expression), followed by zero or more member suffixes
`.` name / `[` expression `]`, then optional argument list. New has its own AST
location at the new token, callee keeps its actual first token location. The
constructor member chain must **not** consume calls. After an explicit argument
list the usual member/call chain resumes: `new C().x`, `new C()()`.

For the no-argument form, a member suffix belongs to the callee:
`new ns.C` = new (ns.C), `new C.x()` = new (C.x)(). Parentheses allow call-valued
targets `new (choose())(7)` and `(new C).x`. `new C(7).x` is property access on
the instance. Explicitly reject unparenthesized nested `new new C()` in this
bounded slice; parenthesized `new (new C())()` is permitted and checked normally.
Do not parse `new -1`, spread, trailing argument comma, optional chaining or
`new.target`. Reuse bounded expression/depth counters, including constructor
operand recursion; no recursive helper bypass of depth128/source100000.
`instanceof` is a word operator at precedence6, left associative like `in`;
`allowIn=false` suppresses only `in`. Neither token becomes an identifier.

Collector walks every retained node including dormant nested bodies. Validate
`new (function(){return 7;})()` and functions inside constructor arguments, with
source identity and inferred-name rules unchanged (no inferred constructor name
from the new node). Unsupported nested syntax vetoes the entire unit before any
record or effects. Preparation supplies no new certified early-error rule.
Legacy trusted AST evaluation must explicitly reject new and instanceof before
operand evaluation with a host Error (`Script construction unavailable` /
`Script instanceof unavailable`); legacy source rejection remains byte-for-byte.

## Construct algorithm, guards and ownership

New expression consumes its usual expression tick, evaluates callee with
`#eval` and GetValue **once**, then arguments left-to-right once. Do not use
call-expression receiver selection; `new obj.C()` never binds obj as this.
Check IsConstructor only after all argument values. For the bounded model this
means object with nonnull constructorSlot; a prototype property or callable is
insufficient. Nonconstructor -> existing runtime TypeError diagnostic string,
no receiver allocation, prototype Get or function body. Argument throws win.

`#construct` begins with #active. After constructor presence, require slot.kind
script-guest, slot===callee.object.callable, slot.realm.profile===active Realm
profile, and existing ExecutableScript.readFunction brand/record/source checks.
Malformed slots/foreign legacy callables are host invariant faults, not guest
TypeErrors. Slot data is metadata, not authority: no host entry into #construct,
no exposed closure/token. A trusted host may construct an ordinary GuestObject
with an existing authentic callable and matching slot for getter tests; this is
a host fixture, not guest reflection or an unbranded callable bypass. Forged or
mismatched slots cannot pass readFunction/check. Brand checks add zero ticks.

Check call limit before prototype access; reserve **one** call depth for the
whole construction, including prototype access. Save frame/Realm/calls before
reservation and restore in host finally on every exit. This is the engine's
explicit resource boundary (not a spec-observable allocation). Never call
#callScript from #construct and count the same constructor twice.

Read `callee.object.internalGet("prototype",callee,context,loc)` once in the **caller**
frame/Realm before installing the function frame. Getters run through ordinary
context.call, with their own defining Realm and the existing one-use permit;
their call depth includes the reserved constructor. If the result is not an
object (including null), choose slot.realm.objectPrototype. No coercion or
lookup of global Object, no caller-Realm fallback. Consume one allocation tick
at the new location in the caller frame **after** Get/fallback and before
allocating the GuestObject. Receiver is fresh, extensible, no own properties,
with the chosen [[Prototype]]. No Get of `prototype.constructor`.

Then enter the defining function Realm/frame with instantiation phase and call
the factored #executeScriptFunction. It does exactly existing readFunction,
createFunctionEnvironment, instantiateFunction, functionBodyEnvironment, body
#list, capture and return normalization. No duplicate evaluator. Strict and
sloppy constructors both bind the allocated object unchanged; sloppy FDI still
allocates its separate lexical environment/tick. Bare calls retain H4
undefined/null substitution and primitive boxing. Object return (including any
callable, array, box or cross-Realm object) overrides the receiver by identity;
primitive/null/undefined return and falling off use receiver. An abrupt result
never becomes an instance. No derived-return restrictions, fields or newTarget
slot: `newTarget=callee` is the only interface, not an optional public parameter.

Preserve existing call behavior exactly when extracting the shared body helper:
call depth and Realm switch still precede activation; all setup/body ticks stay
at original locations. On construction, caller-source prototype/allocation
failure captures before callee entry; function setup/body failure captures the
defining record even across Realms. Catch consumes propagation identity as H1;
reused ThrowCompletion must capture its new source. Host errors escape with
identity and are never caught by guest catch. Nested sessions restore the outer
pendingBuiltin tuple even on host fault. Calls/depth/frame/Realm unwind; steps
remain monotonic. All callbacks capture their engine owner; a context from an
idle session cannot borrow another session's active construction.

## instanceof and symbol metadata

Evaluate/GetValue left, then right before type checking or hook lookup; no
ToPrimitive. Check RHS object, then GetMethod at wellKnownHasInstance (ordinary
Get with RHS as receiver). Undefined **or null** means absent. Noncallable
present method -> TypeError; callable hook -> context.call(hook,RHS,[left],loc),
then truthy(result), preserving any abrupt result. A noncallable RHS object can
have a valid custom hook. Only absent-hook fallback requires RHS callable.

OrdinaryHasInstance first returns false if callee is not callable; then false
if LHS is primitive, without prototype Get. Otherwise Get callee.prototype,
require object (null also TypeError), and traverse LHS's internal prototype
chain by exact object identity. Consume one tick at operator/builtin call loc
**before each GetPrototypeOf**, including the link yielding null. No tick for
hook/property lookup itself beyond reachable callbacks. Do not inspect name,
constructor property, own properties or stringification. Existing ordinary
prototype cycle prevention remains in force. No bound-function branch.

Before touching a callable RHS's properties, reject cross-profile metadata as
host fault, matching the existing captured-owner/profile boundary. Repeat the
same check for callable receiver in ordinaryHasInstance (including borrowed
method calls). Ordinary unbranded objects have no Realm slot and remain usable
as hook holders. Callback dispatch performs its existing profile/permit checks.
This is host-object isolation, not a new guest language error.

On each Script Realm.functionPrototype define the shared symbol key with value
a fresh Realm-owned guarded builtin, W=false/E=false/C=false. Builtin name is
`[Symbol.hasInstance]`, length1, each own metadata W=false/E=false/C=true;
no own prototype and constructorSlot=null. Its [[Prototype]] is that Realm's
functionPrototype. Method performs ordinaryHasInstance(receiver,arg0 or
UNDEFINED,context,loc). Cross-Realm methods differ; key identity is shared.
Function.prototype remains callable/nonconstructible. Legacy Realm properties
and its key ordering remain unchanged.

There is **no guest Symbol global** today; do not install a fake namespace
object or throwing placeholder factory. This slice exposes the well-known key
internally and installs its actual inherited method. Host test setup may supply
the symbol as `hasInstanceKey` and define custom own hooks. A guest can then use
`obj[hasInstanceKey]`; this is a test input, not harness source rewriting.
Default inherited hook requires no Symbol global. Symbol.hasInstance static
metadata (W/E/C=false) belongs to a later real Symbol constructor/factory
assignment. Do not claim it is installed by H5. Existing Symbol conversion and
toPrimitive/toStringTag metadata are unchanged.

## Literal semantic and negative matrices

All rows below are future assertions, unexecuted here. `out` is a host recorder
of exact Values; C/objects/hooks are defined in a fresh Script Realm unless
stated. Default entry is prepareBoundedScript; run applicable rows also through
prepareStrictScript with actual strict prefix. Host fixture getters use guarded
builtins and actual GuestObject.internalGet; no replacement evaluator. Never
use the host-inspection `get` convenience method: it converts abrupt completions
to host Error and would destroy this contract's guest abrupt identity.

| ID | Source / setup | Required result |
|---|---|---|
| C01 | `function C(x){this.x=x;}var c=new C(7);out(c.x);out(c instanceof C);out(c.constructor===C);` | 7,true,true; fresh own x W/E/C=true |
| C02 | `function C(){return 7;}out(new C() instanceof C);` | true; same for null, undefined, true, string and host symbol return |
| C03 | `var o={};function C(){return o;}out(new C()===o);` | true; repeat with callable, array, box and Realm B object |
| C04 | `function C(){}var a=new C;var b=new C();out(a===b);out(a instanceof C);` | false,true; no own constructor on a/b |
| C05 | `function C(){}C.prototype=7;out(new C());` | fresh object with defining objectPrototype; repeat null/undefined/boolean/string/symbol |
| C06 | `function C(){}var p={};C.prototype=p;var a=new C();C.prototype={};out(a instanceof C);` | false; a.[[Prototype]] remains exact p |
| C07 | host o.C is C; `out(new o.C(7));` | C receives new object, never o; o untouched |
| C08 | `new o.C(a(),b());` getter records G, args A/B, C records C | G,A,B,C exactly; getter receiver o, argument values7/11 |
| C09 | `new (choose())(arg());` | choose then arg then C; each once |
| C10 | `new 7(arg());` arg records A | A then runtime TypeError; no prototype/body |
| C11 | `new f(arg());` f is builtin with fake prototype | A then TypeError; same Function.prototype/Number/noncallable object |
| C12 | real matching constructor-slot host object with prototype getter returning p | one Get with exact callee receiver; instance proto p; getter changing property does not cause second Get |
| C13 | strict C from A transferred into B, primitive prototype | instance proto A.objectPrototype; C body active Realm A; calling B recorder still restores A |
| C14 | sloppy C and strict C each `return this;` called with new from strict/sloppy callers | exact allocated object in all four cases, never global or wrapper |
| C15 | `function C(){if(!(this instanceof C))return new C();this.x=7;}out(C().x);` | 7; call-form recursion path of sta.js, bounded budget |
| C16 | `new (function(){return {x:7};})().x;` | number7, retained nested function source/scope correct |
| C17 | `function C(f){this.f=f;}var c=new C(function(){return 11;});out(c.f());` | 11; nested argument function traversed/planned |
| C18 | `new C()();` C returns callable f returning7 | number7; no mistaken second construction |
| I01 | host x with proto C.prototype; `x instanceof C;` | true; null-proto unrelated x false |
| I02 | host x primitive and C.prototype getter that would throw | false and no prototype getter; inherited default hook is called |
| I03 | `left() instanceof right();` right returns primitive | L,R then TypeError; neither left conversion nor hook |
| I04 | object RHS custom hook, even noncallable RHS; `x instanceof o;` | hook this=o,args=[exact x]; return object =>true,0/null/undefined=>false; no primitive conversion |
| I05 | RHS own hook getter records G and returns hook H | G,H once; hook mutation cannot trigger a second lookup |
| I06 | RHS hook=7 | TypeError before ordinary prototype access |
| I07 | RHS hook undefined/null with callable C | ordinary fallback; object x checks prototype, primitive x false |
| I08 | RHS noncallable object hook undefined/null | TypeError (distinct from directly borrowed default returning false) |
| I09 | object x, callable C with nonobject prototype | TypeError for all primitive prototypes, including null |
| I10 | borrowed default `method.call(o,x)` with o noncallable | false, no prototype Get |
| I11 | same-name C in A/B; instances a/b | a instanceof A.C true, a instanceof B.C false; mutate B.C.prototype=A.C.prototype then true |
| I12 | object with own constructor=C but unrelated proto | false; object without constructor property on matching proto true |
| D01 | inspect own prototype/constructor metadata for ordinary C | C.prototype W=true/E=false/C=false; prototype.constructor W=true/E=false/C=true |
| D02 | inspect @@hasInstance and builtin metadata in A/B | exact flags/name/length above; same symbol, different methods, no constructor slot |
| D03 | strict `C[hasInstanceKey]=h;` vs sloppy same | strict TypeError/sloppy silent due inherited W=false; host define own hook allowed |
| D04 | `typeof Symbol;` in unmodified fresh Script Realm | `undefined`; no fake Symbol namespace |
| D05 | C callable slot nonnull, constructor slot same; builtin callable only; plain object neither | independent slot checks; adding prototype never grants constructibility |

Preparation negatives (each with `out(9);` before it, expect no ready record,
no out, zero session steps): N01 `class C{}`; N02 `function C(){new.target;}`;
N03 `new C(...a);`; N04 `new C(7,);`; N05 `new C?.();`;
N06 `new new C();`; N07 `new (function(){return arguments;})();`;
N08 `new C(function(){const x=1;});`; N09 `new C();try{}finally{}`;
N10 `new C();for(let i=0;;){}`; N11 `new (function named(){})();`;
N12 `new C();function f(a,a){}`; N13 `new C();with(o){}`;
N14 `new C();eval('1');`; N15 `new -1;`; N16 `new C();let f=()=>1;`.
Retain each existing rejection category rather than certify syntax rules. Also
legacy `new C();`/`x instanceof C;` keep old unsupported parse behavior; strict
preparation of non-strict `new C();` remains blocked. Runtime missing C is
ReferenceError before arguments, **not** a preparation negative. Missing Reflect
or Proxy is an unresolvable reference under existing grammar, not a new parser
claim. No dynamic test invokes host eval/Function/vm.

## Abrupt, host and guard matrix

For each reachable site A01 callee getter, A02 first argument, A03 second
argument, A04 prototype getter, A05 function activation tick, A06 FDI tick,
A07 constructor body callback, A08 @@hasInstance getter, A09 custom hook,
A10 ordinary prototype getter and A11 prototype walk tick, freeze both guest
and host outcomes where reachable: callback sites return the identical guest
ThrowCompletion sentinel or throw the identical host Error; tick sites exhaust
the actual budget (do not label host helper injection as runtime callback).
A02 stops before A03/prototype/body; A04 stops before receiver allocation;
A08 stops before hook; A09 stops before ordinary fallback. Body side effects
before abrupt completion remain. Catch sees only language throws; resource and
unsupported origins bypass it. Host faults bypass guest catch and leave idle
session with calls=depth=0, active=null, restored context Realm and permits.
No allocating an Error object or matching diagnostic names as identity.

The following fixes the literal source and injection position for that matrix.
Each callback row has two independent runs, G returning a preallocated
`{type:"throw",origin:{kind:"guest"},value:q,diagnostic:{phase:"runtime",name:"Sentinel",message:"sentinel",loc:{line:900,column:9}}}`
and H throwing exact host Error `hostSentinel`. q is an ordinary guest object.
Neither identity is reconstructed at propagation/catch. Surround the source
with `try { SOURCE } catch(e) { out(e); }` in separate ample-budget controls:
G records exact q once; H records nothing and escapes. Resource rows record
nothing in that wrapper. Record the direct-row completion source before the
wrapper consumes propagation identity.

| Row | Literal SOURCE and setup | Exact pre-abrupt effects / provenance |
|---|---|---|
| A01-G/H | `new o.C(a(),b());` o.C getter injects | G only; no A/B/body; source T for builtin getter |
| A02-G/H | `new C(a(),b());` a injects, b records B | A only; no B/prototype/body; T |
| A03-G/H | `new C(a(),b());` a returns7, b injects | A,B; no prototype/body; T |
| A04-G/H | `new K();` matching-slot K.prototype getter injects | P only; no allocation/activation/body; T |
| A05-resource | `new C();` C from P01; limit4 | receiver allocated; activation tick5 fails at H2:1; no body |
| A06-resource | `new C(o);` C from P03; limit7 | receiver/activation/formal TDZ exist; initialization tick8 fails H2:12 |
| A07-G/H | `new C();` H=`"use strict";\nfunction C(){\nfault();\n}` fault injects | allocated receiver, then F; G source H900:9, H escapes |
| A08-G/H | `x instanceof o;` symbol getter injects | G only; no hook/prototype; T |
| A09-G/H | `x instanceof o;` symbol getter returns injecting hook | G,H; no ordinary fallback; T |
| A10-G/H | `x instanceof C;` x object, C callable matching-slot host object with injecting prototype getter | default hook then P; no traversal; T |
| A11-resource | `x instanceof C;` P09 setup, limit4 | default hook/prototype read; first traversal tick5 fails T1:1 |

Callback labels in this table are effects, independent of G/H outcome suffixes.
Builtins with diagnostic900:9 retain that Location while the record/Realm comes
from T (or H for the body callback); guest-language getters/functions defined in
a separate source G must instead retain G provenance, tested for A01/A04/A08/
A09/A10 by using `function getter(){throw q;}` and exact q as the captured global.
Host injection at low-level allocation/FDI helpers is inherited host-only seam
coverage, not an additional reachable guest callback claim.

X01 reuse the same guest completion in prototype getters from T in A then T in
B after catch: second lastAbrupt is B/T, identical value retained. X02 body
throw from constructor source H in A called by T in B: lastAbrupt A/H, while
final ScriptEvaluation phase is body in T. X03 constructor calls builtin which
starts independent session B, normal/guest-throw/host-fault variants: restore
outer frame/Realm/calls/depth/permit and monotonic separate steps. X04 same
session reentry from prototype getter/body/hook -> existing host error before
nested effects. X05 use captured idle context A while session B active ->
inactive Script session, zero A/B tick change from denied call. X06 direct
guarded @@hasInstance invoke with fabricated context -> existing Script
execution unavailable, no ordinary prototype access. X07 replay used permit
and vary context/Realm/invoke/receiver/args/loc one at a time -> all denied;
callback still runs once via legitimate dispatcher. X08 malformed constructor
slot, mismatched slot/callable, forged ScriptGuestCallable, legacy callable and
profile mismatch -> host fault before prototype getter. X09 recursive new and
recursive hook exhaust call depth64 before host stack; no guest catch. X10
expression-depth256/parse-depth128/source100000 boundaries remain, steps default
100000. X11 caught guest body throw followed by new unit succeeds, with last
abrupt reset as existing runScript. X12 getter calls ordinary C (not new): retain
H4 call this behavior, no receiver allocated by context.call.

Native controls use typed callbacks and actual guarded builtin entry, not
Node-only reflection as proof. Node-only recovered-constructor/forged-shell
attacks remain supplemental inherited checks.

Guard controls use literal target units: X01 `try{new K();}catch(e){out(e);}`
then a second unit `new K();`; X02 `new C();` with H=`function C(){throw q;}`;
X03 `new C();` with H=`function C(){bridge();}` and nested B unit `leaf();`;
X04 variants `new K();`, `new C();`, `x instanceof o;` whose reachable callback
attempts evaluateScript on the same session; X05/X06/X07 use those same callback
sites with the tuple attacks specified above; X08 `new K();` with getter trap;
X09 `function C(){return new C();}new C();` and custom hook defined by
`function h(x){return x instanceof o;}`; X11 `try{new C();}catch(e){out(e);}`
then `7;`; X12 `new K();` whose prototype getter does context.call(C,UNDEFINED,[]).
For X10 generate the same inherited exact-boundary parenthesis/deep-expression/
source-length controls with new in the innermost supported position and retain
the source hashes before execution. Guest finally syntax stays unsupported;
every cleanup above means host finally in the shared engine.

## Budget oracle, inputs, migrations and acceptance

[prefixes.json](validation/ts-034h5-p/prefixes.json) freezes literal source,
ordered unit/line/column ticks, effects and final result. Helpers H are prepared
and evaluated in a separate ample session; target session starts fresh (0) or
seven-seeded by evaluating `0;0;0;` (six ticks) then `;` (one). No mutated limits.
For N ticks, test every residual limit k=0..N for both seeds. k<N fails at tick
k+1 with steps=seed+k+1, guard steps, limit=seed+k; only effects after successful
ticks <=k occur. Final k=N has exact normal/guest outcome and seed+N steps.
All target sources have zero root declaration ticks; ScriptEvaluation.phase is
body even on constructor FDI failure; lastAbrupt unit comes from failing tick
or original guest throw, not outer caller. Every prefix ends idle; compare
caller Realm, calls/depth, lastAbrupt source/location and object publication,
not only result text. Prototype getter effects precede the allocation tick and
therefore survive its failure; allocation itself does not. Failed construction
never publishes a returned instance, but explicit body writes to host sinks
before a later failure remain. P03/C17 cover formal FDI; inherited H4 full
function declaration/lexical matrices are replayed as well.

Two runtime-read complete source files input-seven.js and input-eleven.js create
instances storing7/11 and assert resulting value, instanceof and constructor
identity; hash them before compilation. Each input run executes all fixed
controls/prefixes too. Changing an output label alone is not runtime evidence.

Exactly two old source-negative replacements are proposed for later approval:

* test/script-execution.ts:855 replace only `'"use strict";new f();'` with
  `'"use strict";new f(...xs);'` in whole-source negative array. Add focused H5
  positive preparation of the original; executing original throws unresolvable
  f ReferenceError before arguments. Do not claim it successfully constructs.
* test/harness-nonstrict.ts:100 replace only `"function f(){return 7;}new C();"`
  with `"function f(){return 7;}new C(...xs);"`. Preserve N13 ordering and all
  assertions. H5 asserts original ready, then missing C runtime ReferenceError
  (hoisted f exists). Keep historical H4 design/negative text/evidence unchanged.

No old result denominator or expected-record changes. Any other executable old
negative failure stops for exact migration review. New driver
test/harness-construct.ts, fixtures/harness-construct/, one additive gate in
tools/build-native.mjs, scoped feature inventory/task status and new
docs/validation/ts-034h5/ are future implementation outputs, not owned now.
Historical preservation verifiers may report the two approved source edits;
retain their reports and add exact-baseline migration verification in H5, never
rewrite historical verifiers to pretend bytes were unchanged.

Implementation acceptance requires fresh54 static-only builds with separately
parsed zero-dynamic coverage, Node/native212/212, new two-input semantic and
prefix matrix, H1/H2/H3/H4 and E4 replay (with exact migrations), all inherited
17 groups/both Node boundary checks, typecheck/runner20/probes10/host73/
observations22,60blocked and preservation. This design performs **none** of
those runtime/native builds. A new compiler problem must be retained/reduced
and reviewed before workaround or API widening. Commit candidate design/evidence
and stop for actual and independent second review; no successor or publication.
