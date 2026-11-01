# Synchronous function Realm entry (TS-017P)

Design for coordinator review against `e515e7bc00633f3932eb8f11b9b142cf5ba7eaf8`.
No runtime implementation or new native evidence is supplied by this document.
The accepted baseline is TS-016B `59bd44e`: 163/163 Node and native cases,
22 static gates. See [review evidence](validation/ts-017p/README.md).

## Decision and boundary

Every callable retains an explicit, immutable defining Realm. Calling it uses
the calling evaluator's stable OperationContext, temporarily selecting that
Realm. All nested calls share that evaluator's counters and limits. A host
`finally` restores the previous Realm and active call count. Guest environments
remain lexical; moving a function never moves its environment or prototype.

Use this model only for synchronous execution. It is a small representation of
the necessary call semantics, not the complete specification execution context.
No constructors, species, wrappers, Error objects, bound/proxy functions,
async/jobs/modules/generators, proper tail calls or additional methods are added.
Strict receiver forwarding remains the current supported profile. Errors remain
guest strings plus diagnostics, so their Realm is not yet observable as an Error
prototype. No process-global current Realm and no evaluator per foreign call.

## Sources and interpretation

Consulted fixed **ECMAScript 2025, edition 16**, rather than the living draft:

- [Ordinary call, PrepareForOrdinaryCall, OrdinaryFunctionCreate](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ecmascript-function-objects): the function's retained Realm selects entry; its Environment separately supplies lexical bindings. Call removes its execution context on completion.
- [BuiltinCallOrConstruct and CreateBuiltinFunction](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-builtincallorconstruct): builtins also retain and enter a Realm, including when invoked from foreign code.
- [Execution contexts, 9.4](https://tc39.es/ecma262/2025/multipage/executable-code-and-execution-contexts.html#sec-execution-contexts): current Realm and lexical environment are distinct components; synchronous entry is stack-like. Our stable context is a view of the active entry, not a retained specification context.
- [Function root and call, 20.2.3](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-properties-of-the-function-prototype-object): the root is a builtin returning undefined; call forwards its receiver as target and forwards thisArg unchanged. Rift continues to omit tail-call elimination.

Engine comparison uses **engine262 `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`**:

- [function-operations.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/function-operations.mts): BaseFunctionObject has readonly Realm; OrdinaryFunctionCreate captures current Realm independently of Scope. PrepareForOrdinaryCall and BuiltinCallOrConstruct install F.Realm. Adopt explicit ownership and both call paths. Reject copying its surroundingAgent access, generator evaluator and full context machinery for this bounded interpreter. Its host-fault handling is not evidence for Rift's cleanup guarantee.
- [ExecutionContext.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/execution-context/ExecutionContext.mts): Realm and lexical environment are distinct; stack pop checks the expected context. Rift uses host stack locals/finally for the same synchronous nesting discipline; suspension requires a later design.
- [FunctionPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/FunctionPrototype.mts): bootstrap supplies both realmRec and Object prototype to CreateBuiltinFunction. Adopt explicit root ownership. Its call implementation performs PrepareForTailCall; do not copy that while Rift counts the intrinsic frame.

No engine code is copied. The specification determines guest semantics; our
resource guards and cleanup of host exceptions are embedding policy.

## Exact representation and factories

Replace mutable post-construction callable assignments atomically. The proposed
runtime signatures are:

```ts
export type Callable =
    | { readonly kind: "guest"; readonly realm: Realm;
        readonly params: string[]; readonly body: Stmt[];
        readonly environment: Environment }
    | { readonly kind: "builtin"; readonly realm: Realm;
        readonly invoke: Builtin };

// GuestObject: third argument defaults only for NON-callable objects.
constructor(proto: GuestObject | null = null,
            immutablePrototype: boolean = false,
            readonly callable: Callable | null = null)

// Realm: replaces createFunction(Callable).
createGuestFunction(params: string[], body: Stmt[],
                    environment: Environment): GuestObject
createBuiltin(name: string, length: number, invoke: Builtin): GuestObject
registerBuiltin(target: GuestObject, name: string,
                length: number, invoke: Builtin): Value
```

Factories construct the full record with `realm: this`. Guest factory uses
`new GuestObject(this.functionPrototype, false, {kind: "guest", realm: this,
params, body, environment})`. Builtin factory does the equivalent with invoke,
then validated metadata. Remove generic createFunction so callers cannot supply
a contradictory owner. No callable may omit realm or use null as its realm.
No fallback to active Realm, prototype traversal, registration target or lexical
global is permitted. Environment gains no owner slot.

Trusted low-level fixtures use `new GuestObject(null, false,
{kind: "builtin", realm: explicitRealm, invoke})`. Their null prototype, absence
of metadata and missing methods remain intact. Helper signatures become
`builtin(realm: Realm, invoke: Builtin): Value` (or the existing helper name with
that required first parameter). Even never-invoked sentinel callables need the
explicit owner. This is intentional source breakage, not a compatibility shim.

Readonly is a TypeScript internal invariant, not a host security boundary. Do
not use casts to rewrite it; do not add Object.freeze or guest-visible owner
properties. Arrays/AST and environments are retained references as before.
Trusted host code must not mutate callable records after passing them in.
Name/length descriptors remain configurable and prototype slots remain mutable
where already allowed; changing these never changes function ownership.

Bootstrap order stays O, F, A, methods/globals. Construct F directly with O as
prototype and its builtin record containing `realm: this`; its behavior returns
normal undefined. This stores a reference to the partially constructed Realm
without executing or inspecting it. F's name/length are then defined and A is
created. Factories/method registration run only after all roots exist. Cycles
Realm -> F -> Callable -> Realm are host-managed references, like existing
environment/closure cycles; no evaluator, tick or output is needed to bootstrap.

## Stable active context versus per-call contexts

Choose one stable context object per Evaluator. Public OperationContext remains
the current structural type, with readonly realm and unchanged call/tick
signatures. In evaluator.ts define a private, module-local backing type:

```ts
type ActiveOperationContext = {
    realm: Realm;
    call: (callee: Value, receiver: Value, args: Value[], loc: Location)
        => ValueCompletion;
    tick: (loc: Location) => ValueCompletion;
};
// Evaluator fields:
private readonly activeContext: ActiveOperationContext;
readonly context: OperationContext;
```

Initialize activeContext with constructor realm and the existing full-parameter
arrows bound to this.call/this.tick; assign `this.context = this.activeContext`.
Only Evaluator mutates activeContext.realm. Both references are the same object.
No getter closure, writable public realm API, `any`, unsafe cast or new shared
state abstraction is required. Evaluator already owns steps, calls, depth,
maxSteps and maxCalls; retain those exact fields and defaults (100000, 64, frame
limit 256). Each nested call has a local saved Realm on the host stack.

Alternative: immutable per-call OperationContexts plus a shared ExecutionState
containing counters and limits, with context threaded through evaluate, statement,
block, closure and every recursive path. This can preserve a saved caller's Realm
and better resembles a retained spec context. It requires comprehensive plumbing,
changes current identity assertions, and makes accidental use of the evaluator's
old context a second failure mode. It is valid but unnecessary for this synchronous
batch. Swapping `evaluator.context` alone is invalid: saved builtin contexts would
disagree with the active view. A fresh evaluator is invalid even if the Realm is
right, because it resets resource limits and loses shared reentry accounting.

A saved context is a live evaluator handle, not a Realm snapshot. In B builtin,
`saved = context` observes B before calling an A callback, A while that callback
runs, and B after it returns/throws. After the outer call finishes it observes
the evaluator's entry Realm. Save `const origin = context.realm` separately when
a host algorithm intentionally needs a fixed Realm. Never capture context in a
guest closure; closure retains only its defining Realm and lexical environment.
Later top-level run() still creates a separate evaluator and independent budget;
host code must use supplied context.call for callbacks, never run() to reenter.

The readonly backing alias and required reference slot use existing structural
records/class references. This is a compiler-risk assessment, not native proof.
There is no observed new compiler failure to justify a probe in this design.
The implementation must pass all static builds and coverage; isolate any actual
failure before selecting a workaround. Keep full parameter lists on Builtin arrows.

## Entry, completion and restoration

Keep call(callee, receiver, args, loc): ValueCompletion unchanged. In order:

1. Check object and callable; failure is the existing located TypeError `value is not callable`.
2. Save the nonnull callable in a local. Check calls >= maxCalls; failure is the existing located RangeError `call depth limit exceeded`. Neither failure enters a Realm, increments calls, or ticks.
3. Save activeContext.realm. Increment calls. Enter a try block, set activeContext.realm to fn.realm, then dispatch builtin or guest.
4. Builtin receives the stable context and exact receiver/args/loc. Guest creates `new Environment(fn.environment)`, binds parameters as before, and evaluates body. Never substitute fn.realm.global for fn.environment.
5. Normalize guest return to normal(same Value), guest fallthrough to normal undefined. Propagate a throw record unchanged. Builtin normal preserves its Value. Illegal builtin return/break/continue and illegal guest break/continue raise the existing host Error `invalid completion escaped call boundary: TYPE` inside the protected region.
6. In finally restore saved Realm and decrement calls. Never restore steps. Do not catch/translate host faults or recreate guest throw diagnostics.

Also put statementInner and expression execution inside try/finally after their
existing tick and depth guard. Each finally decrements its own admitted depth.
Preserve the guard's increment/decrement and failure location; ticks stay before
the depth guard. The baseline only decrements depth on ordinary host return, so
a host fault reached through an AST currently leaks active depth. This correction
is necessary for the promised reusable evaluator after foreign faults. Do not
reset depth wholesale at call exit: a caller's still-active AST frames must remain.

Call setup, Realm selection, root calls and finally add zero semantic ticks.
Call guards remain before entry; a guard failure while B is active leaves B
active until the enclosing B call unwinds. Step guard increments steps even when
exhausted, exactly as today. These host resource policies need not manufacture
callee-Realm Error objects, which are not supported yet.

## Allocation and reentry semantics

For evaluator initially A: A -> B guest/builtin -> A callback -> B continuation
-> A continuation. Allocations performed at each stage use that stage's Realm.
A nested function expression/declaration created in B retains B even when later
called from A; its captured environment remains the exact B activation object.
Transferred input, receiver, arguments, returned Values and thrown Values are
never copied or reparented. A function whose prototype is changed to C.F still
executes in its recorded B; a null-root function can also execute in B.

Borrow C's Function.prototype.call while evaluator is A and target is B:
`A -> C intrinsic -> B target -> C intrinsic -> A`. Intrinsic and target consume
two call slots. Its receiver validation happens in C; the target guard runs
while C is active; a successful target enters B. A call-chain through further
borrowed intrinsics repeats this rule, never using the final target Realm for
the entire chain. No tail-call removal is introduced.

Internal map keeps its explicit supplied-context policy. Direct host helper call
with E(A).context allocates A's result even for B input and C callback. If a B
builtin calls the helper with its supplied context, result is B; C callbacks
allocate C and return exact Values stored in B result. Length coercion occurs
first and must restore B before result allocation; each callback restores B
before definition/next index. Callback owner and source prototype never select
result Realm. Holes, constructor reads/rejection, iteration order and ticks stay
unchanged. No public Array.prototype.map or species support is implied.

Coercion uses context.call for each freshly read hook. An A conversion with B
valueOf enters B, restores A, then gets/calls C toString if required and restores
A. Hook mutations remain visible; receiver and location stay exact. The same
applies to computed keys, operators, array-like lengths and both array-length
conversions. Semantic Get/Set/Define operations themselves do not enter an
object's origin Realm. Direct primitive converters and bootstrap remain zero-hook.

Test-only context wrappers that override tick while forwarding active.context.call
remain explicit adapters: the call closure reenters the owning evaluator and
builtin sees its stable context, not the wrapper. A wrapper's stored realm is a
fixed helper-allocation choice; it is not a second execution context. Do not
install such wrappers in production or use them to test foreign call entry.

## Complete production migration inventory

| Baseline location | Next implementation action |
| --- | --- |
| runtime.ts Callable/GuestObject | Required readonly realm in both variants; readonly constructor callable; remove writable field initialization |
| realm.ts root F | Construct complete explicit-owner builtin before metadata; retain O/F/A ordering |
| realm.ts createFunction | Replace with createGuestFunction(params,body,environment), stamping this |
| realm.ts createBuiltin/registerBuiltin | Builtin constructor stamps this; existing registration delegates; metadata/descriptors unchanged |
| evaluator.ts closure | Call active Realm's createGuestFunction; declarations in block and expressions share this path |
| evaluator.ts constructor/call | Private mutable backing alias and protected Realm entry/restoration as above |
| evaluator.ts statement/evaluate | Finally release admitted AST depth on host faults |
| evaluator.ts object/array expressions | No algorithm change; existing context.realm now selects callee Realm |
| builtins/function.ts | Registration gains owner through factory; forwarding unchanged; update context comment if needed |
| builtins/number.ts and realm.ts console.log | Both Number predicates and log gain owner through factory; captured output callback remains defining Realm's output |
| array-map.ts | No algorithm change; supplied active context policy and callback restoration tested |
| runtime.ts getValue/putValue/internalSet/defineOwnProperty; array-object.ts; array-like.ts; conversion.ts; primitive-conversion.ts | No signatures/ordering changes; context forwarded as before |
| interpreter.ts run; cli.ts | No change: explicit top-level Realm and new evaluator per independent run remain |
| Realm createObject/createArray, O/A constructors | No callable ownership needed; preserve all prototype slots |

No other production callable creation or guest allocation site exists in the
retained search. Do not broaden changes to parser, conversion algorithms or harness.

## Host fixture migration inventory

Baseline line anchors below are for review navigation, not promises about future
line numbers. Every raw assignment must disappear; keep null-root constructors
and every noncallable storage fixture. Pass the intended setup Realm explicitly
at every helper invocation, including helpers reused by more than one evaluator.

| Raw callable sites in test/ | Required migration |
| --- | --- |
| addition.ts:16; numeric-operators.ts:14; relational.ts:17,153 | Required realm helper argument; direct relational throw sentinel gets its scenario Realm |
| primitive-conversion.ts:19,169; operator-coercion.ts:20,117 | Required realm helper argument; never-call function inputs also get scenario Realm |
| property-key-conversion.ts:28,265; key-coercion.ts:15,124 | Required realm helper argument and owner on direct never-call key objects |
| length-coercion.ts:26; array-length-coercion.ts:26 | Required realm argument; factories for each independently created evaluator use that evaluator's explicit Realm |
| array-map.ts:32 | Required realm argument at all uses; otherCallback at 447 belongs to otherRealm; callbacks reused in foreign helper tests keep original owner |
| operation-context.ts:16 | Required realm argument; realmCheck at 67 belongs to other, all ordinary helpers to realm; output-fault helpers retain outputFault where applicable |
| array-like.ts:167 | Construct method with active evaluator's Realm; preserve receiver/context assertion |
| array-storage.ts:116 | Explicit keyContext.realm owner; preserve two hook calls for semantic length conversion and zero calls on readonly Set; later foreign evaluators keep this same hook owner |
| conversion.ts:107 | Add an explicit fixture Realm (and Realm import) for the never-call hook; preserve existing side-effect array import/static workaround and primitive-only negatives |
| function-call.ts:62,118 | low and opaque remain null-root, explicitly owned by r; use inherited constructor arguments on NoLookup; opaque internalGet must still never run |

Factory registrations in realms.ts, array-literals.ts, operation-context.ts,
array-map.ts and length-coercion.ts need no signature changes: registering Realm
is the owner even if target is a foreign or null-root object. createBuiltin uses
in realms.ts and function-call.ts remain valid. No tests currently call generic
createFunction directly. Injected guest control fixtures use Evaluator.closure,
which stamps the active Realm independently of `new Environment(null)`.

Caller-context expectations to change, without deleting their original purpose:

- realms.ts:219-230 G11: lexical return identity stays; foreign body object now has r1.O, not r2.O. Assert foreignActive.context is unchanged and realm restores r2.
- function-call.ts:215-228: foreign result object/array/function now use r's O/A/F, and nested function owner r. Keep captured token/receiver/prototype identities. Foreign builtin keeps `context === foreignEval.context`, adds `context.realm === r` during invocation and other after return; rename caller-context labels.
- operation-context.ts:67 and array-map.ts:448 are previously ownerless other-Realm checks. Assign other/otherRealm explicitly; also call from a different evaluator to prove ownership rather than merely same-Realm coincidence.

All other existing context identity assertions remain: operation-context.ts
(37,60,86,108), function-call.ts (99,177), array-like.ts (169), array-map.ts
(403,448), definition-dispatch.ts (121), key-coercion.ts (56,75,130),
array-length-coercion.ts (118,220,421,554), operator-coercion.ts (39,123),
primitive-conversion.ts (175,207,236), property-key-conversion.ts (182).
Independent context comparisons in operation-context, map, length and primitive
drivers stay unequal. Saved context arrays still distinguish separate run calls;
they do not freeze a Realm. Test tick wrappers in key-coercion:174,
length-coercion:156 and array-length-coercion:225,559 retain their explicit
adapter semantics. Re-search all these patterns at implementation base.

## Fixed expected-result matrix for the next batch

Use existing compiled drivers and runtime-read fixtures. A/B/C are distinct fresh
Realms; E starts in A unless specified. `token` is one object Value, L is one
Location object, S is one throw completion whose value is token and diagnostic
loc is L. Assert identity, exact names/messages and locations, not lane parity.
Every successful/abrupt outer call restores E.context.realm=A, calls=0 and
depth=0 when it started idle; steps never decrease.

| ID | Setup/action | Required result |
| --- | --- | --- |
| R1 | Inspect guest declaration/expression, builtins log/predicates/call and F of A/B | callable.realm is defining Realm in every case; all roots distinct; F returns undefined; prototype/name/length/descriptors unchanged |
| R2 | B guest returns `{o:{}, a:[], f:function(){return {};}}`; call from A, then call returned f from C | first allocations B.O/B.A/B.F; returned f owner B and its later object B.O; E and C evaluator each restore their own entry Realm |
| R3 | B closure captures mutable n; transfer to A and call twice, same-name A global n=100 | B n becomes 2; A n stays 100; captured token exact; no environment replacement |
| R4 | A builtin -> B builtin -> A callback, allocate before/after each nested call | observed Realms A,B,A,B,A; all contexts exactly E.context; allocations follow those Realms; peak calls=3, then 0 |
| R5 | Save B builtin context, B realm snapshot; A callback reads both | saved context observes A inside callback, B after, A at idle; saved Realm remains B throughout |
| R6 | E.call(C.call, B target, [token,arg], L) | target observes B, calls=2, same E.context/L/token/arg; C.call owner C; after target caller C, final A; exact forwarded result |
| R7 | Third-Realm call failure with noncallable receiver; then target guard with maxCalls=1 | first TypeError `Function.prototype.call receiver is not callable`; second RangeError `call depth limit exceeded`; diagnostic.loc===L; no target effects, calls=0, realm A; no ticks |
| R8 | B target returns S through C.call and A bridge; separate guest `throw x` in B | S record/value/diagnostic/loc identical; parsed throw retains token and its actual AST throw location, not outer L |
| R9 | B host throws exact Error fault through guest AST and C.call; A host catches it | caught === fault; A active on recovery, outer active counts/depth equal values saved before nested call; subsequent callback works; idle depth/calls=0 |
| R10 | B builtin returns each return/break/continue; B injected guest body breaks/continues | exact host message `invalid completion escaped call boundary: TYPE`; full Realm/call/frame restoration; ordinary guest return/fallthrough still succeed |
| R11 | E maxCalls=0: call noncallable, then B.F | TypeError `value is not callable` precedes RangeError `call depth limit exceeded`; both loc===L; steps/calls/depth=0, Realm unchanged; same guard from inside B preserves B until B unwinds |
| R12 | Two builtin functions owned A/B alternate context.call with maxCalls=3, no ticks | entries A,B,A only; next B rejected at L; peak 3, final 0; steps=0; no fresh evaluator |
| R13 | A outer ticks once then B loop attempts three ticks, maxSteps=3 | two loop visits, failure fourth tick `execution step limit exceeded` at L; steps=4; next tick fails with steps=5; same calls/realm restored |
| R14 | Two E instances call same retained B function that ticks once | each steps=1 independently, contexts unequal, same lexical state shared by function identity; repeating first uses its existing budget |
| R15 | AST depth=256 at entry to evaluate literal and statement empty, remaining step budget | each attempt ticks once then RangeError `evaluation nesting limit exceeded` at exact AST loc, depth remains 256; separate real nested AST foreign-host fault unwinds admitted frames to prior depth |
| R16 | Change B function prototype to C.F then null; set name/length; call from A | owner B remains, allocations B, exact transferred Values; null-root host builtin explicitly owned B also observes B; metadata mutation never changes owner |
| R17 | Direct helper with E(A), B sparse array length3/hole1, C identity callback | result A.A, length3, hole1 absent, original element Values at 0/2; callback C, restored A after each; input B.A |
| R18 | B builtin invokes helper on A input, C callback returns C object; foreign length hook A | result B.A, element C.O, length hook A then restored B before allocation; callback receiver/indices/input exact; constructor/species errors unchanged |
| R19 | A ordinaryToPrimitive: B valueOf returns object and replaces toString with C hook returning 7 | hook trace B,C; receiver token, args empty, loc L; result number7, active A between calls and afterward; mutation visible |
| R20 | B coercion hook returns S or throws host fault through computed key/operator/length/array length | exact S or fault propagates, A restored; later hooks/writes suppressed as existing ordering requires; array-length double conversion order unchanged |
| R21 | Construct A/B with output callback that would throw if called; inspect roots | no output, guest call or tick; F owner points to respective Realm; no constructor/back-links/extra methods introduced |
| R22 | Same guest fixture under own Realm before/after entry change; root and builtin identity calls | existing exact step totals unchanged (operation-context recursion 11, bridge limit 3); entry/exit adds zero ticks; original 163 cases preserved |

R6's intermediate C can be checked with a test evaluator subclass overriding
call, observing context.realm immediately before/after `super.call` for the B
target. The override must delegate once and never alter counters or context.
This tests the actual borrowed intrinsic without modifying it or installing a
fake replacement. Also test C.F itself borrowed into A, with normal undefined,
owner C and restoration. Keep separate receiver/argument evaluation ordering
assertions from Function.call; Realm entry must not move argument evaluation.

## Smallest coherent implementation assignment (proposal only)

One atomic batch: runtime ownership/constructor contract, Realm factories/root,
Evaluator stable backing and finally cleanup, all raw host callable migrations,
and R1-R22 in existing operation-context.ts, function-call.ts, realms.ts,
array-map.ts and relevant coercion drivers/runtime-read fixtures. No manifest or
new harness entry is needed. Allow scoped README/architecture/feature inventory
updates to replace the caller-Realm limitation and update this design's acceptance
note, plus the assigned TASKS handoff and a new validation directory. Coordinator
continues to own COORDINATION. This document does not start or assign that batch.

Do not split ownership slots from call entry into independently accepted behavior:
that would leave factories and host fixtures misleadingly marked as Realm-aware.
Do not remove negative tests to keep counts green. Run typecheck, runner20,
probes10, rebuilt Node/native suites (at least 163 existing entries), and all
22 existing static-only plus separate coverage gates. Retain exact stdout,
failures/skips/timeouts and static counts. Probes for real compiler failures need
both hosts and both static checks. Design review and prose are not native evidence.
