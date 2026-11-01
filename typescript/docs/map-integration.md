# TS-005M: map integration proposal

2026-11-01. Inspected base `2cd4a0842ff092e84e214c75309b8c14ac7f3bf1` on
`typescript-scriptc-probes`. Awaiting coordinator review; no interface below is
implemented or frozen by this document. TS-005B remains blocked.

## Recommendation and first entry

Implement an internal `mapObjectDefaultArray` operation, exercised through a
host-seeded **test-only** builtin named `__testMapObjectDefaultArray`. Do not
install `Array`, `Array.prototype.map`, an instance `map`, or a public polyfill.
Use real parsed guest callbacks and the active evaluator. This teaches the
algorithm without presenting incomplete boxing/species behavior as a standard API.

The input is an already-created GuestObject (ordinary data object or GuestArray).
The result is a fresh GuestArray with the current null prototype. Array inputs
are accepted only when the algorithm's constructor Get returns guest undefined.
Other constructor values produce an explicit unsupported-constructor/species
runtime TypeError. This deliberately rejects some valid ECMAScript cases.
Generic non-array inputs never read constructor, even if that property exists.
Symbols, accessors, proxies, construction and object coercion remain unsupported.
There is no attempt to detect these features by enumerating keys or reading
`"Symbol.species"`; that string is not the well-known symbol.

| Entry option | Consequence | Decision |
| --- | --- | --- |
| Internal object-only helper and host-seeded test adapter | Works with today's storage, primitive length conversion and guest functions; limitations are explicit in its name and test-only visibility | First batch target |
| Install standard map but reject primitives/species | Looks standard while rejecting valid generic calls and constructor defaults | Do not ship this interface |
| Full standard installation | Needs ToObject, primitive wrappers/string exotic behavior, realm intrinsics, IsArray, symbols, constructor/realm/species and completion-aware property access | Later separately scoped work |

Primitive rejection belongs in the test adapter before length lookup: missing
argument defaults to UNDEFINED; every non-object input returns an explicit
`object-only test map: primitive receivers unsupported` TypeError. This is a
test entry policy, **not ToObject**. Null/undefined also throw in the standard
algorithm, but numbers/booleans/strings must eventually box. Never silently use
an empty object for those values. The core's GuestObject parameter makes the
boundary structural; no optional boxing flag or alternative map algorithm.

The test driver seeds a namespace `host` into its own realm and registers
`host.__testMapObjectDefaultArray(input, callback, thisArg)`. The builtin's
receiver is unused; args[0..2] supply those three values, each missing argument
defaults to UNDEFINED, and extra arguments are ignored after normal guest call
argument evaluation. It forwards the invocation context and location unchanged.
This adapter exists only in the host test driver, never in default bootstrap.

## Existing code and proposed call seam

At the inspected base:

- `src/evaluator.ts:5-13,186-211`: one Evaluator owns steps, active calls and
  evaluation depth. `call` invokes builtins directly with three arguments;
  guest functions use their captured Environment, translate return to normal,
  and preserve guest throws. Builtin code currently has no budget access.
- `src/interpreter.ts:6-10`: each top-level run constructs a fresh evaluator.
  Calling run again from map would reset limits and is forbidden.
- `src/runtime.ts:26-29`, `src/realm.ts:21-26`: Builtin/Callable and registration
  have a single invocation shape. Registration stores no active evaluator.
- `src/array-like.ts`: lengthOfArrayLike already performs one completion-aware
  Get followed by primitive ToLength. `internalHasProperty` and `internalGet`
  in runtime work on ordinary data chains; inherited undefined is present.
- `src/array-object.ts`: empty GuestArray uses private base storage and validated
  definitions. No intrinsic array prototype or alternate dense storage exists.

Proposed exact signatures (type-only Realm import in runtime avoids a runtime
module cycle; preserve the existing Completion definition):

```ts
// runtime.ts
type OperationContext = {
    readonly realm: Realm;
    call: (callee: Value, receiver: Value, args: Value[], loc: Location) => ValueCompletion;
    tick: (loc: Location) => ValueCompletion;
};
type Builtin = (receiver: Value, args: Value[], context: OperationContext,
    loc: Location) => Completion;
normal(value: Value = UNDEFINED): ValueCompletion; // narrow actual normal result

// evaluator.ts
constructor(realm: Realm, maxSteps: number = 100000, maxCalls: number = 64);
readonly context: OperationContext;
tick(loc: Location): ValueCompletion;
call(callee: Value, receiver: Value, args: Value[], loc: Location): ValueCompletion;

// new src/array-map.ts; explicitly partial, no standard method registration
mapObjectDefaultArray(object: GuestObject, callback: Value, thisArg: Value,
    context: OperationContext, loc: Location): ValueCompletion;
```

Create context once in the evaluator constructor. Its full-parameter arrows
delegate to `this.call(callee, receiver, args, loc)` and `this.tick(loc)`;
realm is the run's existing Realm, never a new one. No counters live in the
context, objects, closures, Realm or a global singleton. Builtins receive the
invocation's context, never capture one at registration time. Internal functions
must not retain it for a later execution. Guest closures retain environments,
not the evaluator that happened to create them.

Keep Builtin returning broad Completion to minimize existing migrations.
Evaluator.call becomes the sole validating boundary: normalize guest return as
today; accept normal/throw; treat escaped break/continue and builtin return as
host invariant failures. Preserve the exact throw record, value, diagnostic and
location. A normal branch may construct a narrow normal record. After incrementing
calls, use host try/finally to decrement it on every exit, including host faults;
do not catch/translate host faults to guest throws. The guard precedes increment.
The step counter is monotonic and is never rolled back.

| Caller/file | Atomic migration in context batch |
| --- | --- |
| runtime Builtin | Add required context before loc; narrow normal helper only, not all control-flow completions |
| Evaluator constructor/tick/call | Construct context, narrow results as above, pass `this.context` to invoke, finally-release calls |
| interpreter run | `new Evaluator(realm)`; keep a fresh budget only at this top-level entry |
| realm console.log | Four-parameter arrow `(_receiver, args, _context, _loc)`; registration signature still accepts Builtin |
| builtins/number.ts predicates | Same four parameters; retain noncoercing behavior/metadata |
| test/realms.ts custom test builtin | Add unused context parameter |
| test/realms.ts direct predicate.callable.invoke | Replace with `new Evaluator(realm).call(predicateValue, receiver, args, loc)` using the matching a/b realm; no fake unlimited context |
| New compiled context/map host drivers | Construct evaluator with explicit realm/limits and call test builtin through evaluator; use parse + evaluator.block for controlled-budget guest programs |

Repeat `rg -n 'new Evaluator|\.invoke\(|registerBuiltin|type Builtin' src test`
at implementation time. The table covers all current occurrences, but does not
authorize missing a later caller. No context parameters are added to ordinary
property operations or primitive conversion in this batch: they cannot call
guest code. When accessor/object conversion work starts, migrate those operations
together with the required context described in array-prerequisites.md.

Realm preservation here means the active run's Realm is available, callbacks
resolve their original captured environment, registered builtin closures keep
their realm-owned state, and results share no mutable state across runs/realms.
Guest functions currently have no realm slot and builtins have no intrinsic
realm execution-context stack. This is not full cross-realm ECMAScript calling.
Do not use context.realm to rebind a guest closure's environment. Future standard
species/intrinsic allocation must add function-realm semantics before claiming
cross-realm support; a new Realm field alone would not solve that problem.

## Algorithm, observable boundaries and allocation

Proposed operation order for the accepted input subset:

1. Call lengthOfArrayLike(object, loc) exactly once; propagate throw. Snapshot its
   numeric result. No callback validation, constructor read, budget preflight or
   allocation before this operation.
2. Check callback's Value kind and internal callable slot (no guest property
   lookup). Noncallable means runtime TypeError, including when length is zero.
3. Classify the input with host `object instanceof GuestArray`, valid only for
   today's closed ordinary/array model. It performs no guest reads. For an array,
   Get `constructor` once with the input Value as receiver; propagate throw.
   If its Value kind is not undefined, return explicit unsupported TypeError.
   For an ordinary object, skip this Get entirely. This is a deliberately partial
   species boundary; never name it a complete ArraySpeciesCreate implementation.
4. If length exceeds 4294967295, return runtime RangeError before allocating or
   visiting any index. ToLength's 9007199254740991 bound is not an array-length
   bound. Do not truncate/wrap the length or allocate a host array of that size.
5. Create one fresh empty GuestArray, then validated defineOwnProperty of its
   length using the numeric snapshot. Assert normal true as a fresh-array host
   invariant (range was checked). Length descriptor stays writable,
   nonenumerable, nonconfigurable. No elements are allocated for holes.
6. For each integer k from zero below the snapshot: context.tick(loc), then
   internalHasProperty(String(k), loc); on true, internalGet of that key with
   the original object Value as receiver; then context.call(callback, thisArg,
   [element, numeric k, original object Value], loc); then define an own result
   data property with all three flags true. Return each throw unchanged. A normal
   false definition becomes runtime TypeError (CreateDataPropertyOrThrow rule),
   though it cannot occur for today's fresh inaccessible extensible result.
7. Return result. Do not Set result indices, compact holes, copy descriptors,
   reread length, enumerate a key snapshot, or overwrite length after the loop.

String(k) here converts a bounded host integer to a property string; it does
not coerce a guest object. Keep original element identity in the callback args.
No host Array.map, guest eval, dynamic compilation or new evaluator is involved.
Array mutations affect future presence/value queries; only the iteration limit
is fixed. A present inherited undefined calls the callback and creates an own
result property. An absent index leaves a hole, even at the end of the result.
Define creates a new own property rather than triggering inherited setters.

The species boundary is checked at its normal algorithm position, even for
length zero. Do not pre-read constructor during entry validation, read it twice,
or use ownPropertyKeys/getOwnProperty to bypass an observable Get. A missing or
inherited-undefined constructor works. A non-array with constructor = 7 works.
An array with constructor = null is rejected; null constructor is different
from a constructor object's null @@species. An object constructor, including
one whose @@species would default, is explicitly unsupported. Future full
species may return an ordinary object rather than an array; its failures and
leaked partial result need a different allocation contract, not a hidden option
on this helper.

## Budget and reentrancy policy

Charge **one tick before each index's HasProperty**, whether a hole, inherited
value, guest callback or constant builtin callback. Reuse evaluator.tick's
increment-then-compare rule and runtime RangeError/location. Do not charge a
separate map-entry tick or reserve all length ticks in advance: that would
change validation/error and side-effect order. With starting steps S and limit
M, a hole-only map can complete max(0, M-S) index visits; the next tick fails
before Has/Get/Call/Define. A zero-length map consumes no loop ticks.

Example direct host-driver invocation: S=0, M=3, ordinary input length
4294967295, all holes. Get length and allocate sparse result; Has keys 0,1,2;
tick for key 3 throws, steps=4, callback count=0. No billions-of-holes scan and
no proportional allocation. Length 4294967296 instead fails allocation-range
validation before a loop tick. These are different RangeError causes.

The outer test builtin counts as an active call. Each callback enters the same
Evaluator.call and consumes one more call depth until it returns. Reentrant
map calls through guest callbacks get exactly the same context/counters;
neither calls nor evaluation depth are reset. Nested map loops add their own
ticks, plus existing guest statement/expression ticks. A pure builtin callback
does not need guest AST ticks to be bounded: the outer loop still ticks.
No map-specific recursion counter or independently replenished budget.

This is an engine resource policy, not an ECMAScript requirement. It bounds
index traversal; it is not a universal CPU/heap cap. Ordinary property lookup
can traverse a deep but finite chain per visit, and a trusted host builtin can
itself perform unbounded host work. Guest recursion still uses maxCalls=64
and existing expression/statement depth limits. Keep host-driver timeouts as
failure detection, not as evidence that a hung map passed.

## Deterministic acceptance matrix (proposed, not measured map support)

Use fixed assertions in rebuilt Node/native drivers. Ordinary data cases use
actual runtime objects and real guest functions; synthetic Has/Get overrides
only trace operation boundaries/throws and do not establish proxy/accessor
support. All guest failures assert runtime phase, error name and source location;
exact propagation cases also assert record/value/diagnostic identity. Use the
supplied map call location for internal failures, original throw location for
callback failures. Source references S1-S4 below govern semantic rows; B denotes
the explicit bounded profile proposed here.

| Setup | Required result / trace | Basis |
| --- | --- | --- |
| Test adapter given any primitive, including missing input | Explicit object-only TypeError; no length Get/callback | B; full standard differs per S3 |
| Get length throws sentinel, callback noncallable | Exact sentinel; no callback validation effects/constructor/indices | S1 |
| Length is object, callback noncallable | Existing unsupported object conversion TypeError first; no constructor | B, accepted TS-005N/H |
| Length missing/-1/NaN/"0"; invalid callback | TypeError despite effective zero length | S1,S3 |
| Length "2.9", indices 0=4,1=5,2=6; callback doubles | Own result 0=8,1=10; length=2; only two calls | S1,S3 |
| Empty input; callable callback | Fresh result length=0, no index queries/calls/ticks | S1,B |
| Ordinary length=1, constructor=7 | Constructor never read; mapping succeeds | S2 |
| Array with undefined constructor, own or inherited | Exactly one constructor Get after length/validation; succeeds | S2 |
| Array constructor Get throws; callback invalid vs valid | Invalid: TypeError, no constructor Get. Valid: exact Get throw | S1,S2 |
| Array constructor null/number/object, length=0 | Explicit unsupported TypeError; no loop; never read species or fake string key | B |
| Generic length=4294967296 or Infinity; callable vs invalid callback | Callable: RangeError before index access; invalid: TypeError first; no wrap | S1-S3 |
| Generic length=4294967295, all holes, M=3 S=0 | Has 0,1,2 only, no Get/Call, steps=4 then limit RangeError | B |
| Length=3, own 0=undefined, hole 1, inherited 2=7; identity callback | Calls (undefined,0,O),(7,2,O); result own 0 and 2, hole 1, L=3 | S1 |
| Length=3, only index 0=1; callback returns undefined | Own 0 present undefined, trailing 1/2 holes; L=3 | S1 |
| First callback changes next value and fills future hole below saved length | Later calls see new value and filled property | S1 |
| First callback deletes future own property | Future call skipped if absent; inherited fallback visited if present | S1 |
| First callback grows input/adds index at original length | New beyond-bound element not visited; result keeps saved length | S1 |
| First callback shrinks array length from 3 to 1 | Later deleted own elements skipped; inherited elements still visited; result L=3 | S1 |
| Explicit thisArg object/number/null/undefined; omitted adapter thisArg | Exact Value passed; omitted is UNDEFINED; current strict-call profile preserved | S1,B |
| Guest closure increments captured counter and returns element | Counter persists across callbacks; callback third arg is input identity, index is number | S1 |
| Has false / Has throws / Get throws at index 1 | False: no Get/Call. Throws: exact record, stop immediately, retain prior callback effects | S1 |
| Guest callback throws at index 1 | Prior effects remain, no result returned, no index 2 query; exact throw record retained | S1 |
| Callback returns object | Result element aliases that object; flags W/E/C true | S1 |
| Pure constant builtin callback on long dense input | One outer tick per visit bounds calls; no dependence on AST execution | B |
| Nested map callback consumes remaining ticks | Same context identity; total step delta includes both loops, no reset | B |
| M=3,S=0; builtin callback at outer k=0 invokes hole-only inner len=3 | Outer tick=1; inner Has 0,1 at ticks 2,3; inner tick=4 throws; no outer k=1 | B |
| Recursive guest callback reenters test map | Shared maxCalls RangeError before native stack overflow; calls returns to zero | B |
| Callback or host output throws host Error | Host Error escapes; calls unwinds to prior count, never guest-wrapped | B |
| Inject impossible builtin return/break/continue completion | Host invariant error; calls released | B |
| Two maps/two realms and retained closure from earlier run | Fresh results/storage; active context is current run; retained lexical state still correct | B |

Synthetic boundary traces should record `Get length`, `Get constructor` only
when applicable, then `Has 0`, `Get 0`, callback, etc. Source data-only object
operations need no general observer framework. Guest mutation fixtures can use
ordinary assignment; host callbacks handle deletion until guest delete syntax
exists. Check definition flags and result holes with getOwnProperty, not just
Get. Do not expose the result early merely to test impossible definition failure.
When species later permits user-returned targets, add false/throw definition,
inherited setter bypass and observable partial-result tests then.

## Source evidence and scope of reuse

Consulted 2026-11-01; specification baseline ECMA-262 16th edition (June 2025).

- **S1** [Array.prototype.map, 23.1.3.21](https://tc39.es/ecma262/2025/multipage/indexed-collections.html#sec-array.prototype.map): ordered length/validation/allocation, per-index presence/read/call/definition, captured length and callback arguments.
- **S2** [ArrayCreate and ArraySpeciesCreate, 10.4.2.2-3](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arrayspeciescreate): ordinary inputs skip constructor; array constructor and species lookups have distinct positions; default allocation has uint32 length bound, custom species can return non-arrays. The proposed unsupported boundary is our policy, not a spec rule.
- **S3** [ToObject and ToLength, 7.1.18/20](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-toobject): primitive boxing versus nullish failure; length clamps rather than wraps. String wrappers require UTF-16 code-unit indexed properties and correct immutable descriptors (S2 page, 10.4.3).
- **S4** engine262 revision **d553e7b52501fbc47eae981c8d0fa7a5c26d0171**, [ArrayPrototype.mts, ArrayProto_map](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ArrayPrototype.mts) and [array-objects.mts, ArraySpeciesCreate](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/array-objects.mts), fetched via GitHub connector: confirms a small direct loop with separate operations and early abrupt propagation. Adopt that readable decomposition. Do not copy its generators, ambient surroundingAgent or full intrinsic framework; Rift already uses explicit completions and per-run evaluator state. No upstream code copied.

Measured evidence is reused, not extended: compiler-contract.md records uniform
full-arity function dispatch/closures, explicit completions and host try/finally;
TS-005P records subclass dispatch (33/33 static); accepted TS-005D/A/H integrated
drivers exercise definition throws, sparse GuestArray storage, presence and
length. TS-005H retained Node/native suites pass 135/135 with nine fully static
entry points. These are previous results, not a new TS-005M execution claim.
No genuinely new language capability requires an isolated probe for this design.
The combined context/recursion/map behavior and exact static coverage remain
unmeasured until implementation. If integration reveals a compiler failure,
reduce that specific failure then; do not preemptively build a toy second engine.

## Two bounded batches for coordinator freeze

1. **Active operation context and call boundary.** Own runtime type annotations,
   evaluator/context/call cleanup, interpreter construction, console/Number
   arrows and all callers in the migration table; compiled context driver and
   necessary harness registration. No map or property/coercion changes. Test
   guest-to-builtin-to-guest calls, exact this/args/throw, retained closure across
   runs, realm isolation, nested shared ticks/call depth, invalid completion and
   host fault cleanup. Run typecheck, runner, probes and both rebuilt guest lanes
   with static gates. Review this interface before the next batch.
2. **Internal default-array map and integration tests.** Depend on accepted batch
   1. Own new array-map.ts, compiled host driver/runtime-read guest fixtures,
   necessary harness registration and scope/evidence docs. Implement only the
   algorithm and matrix above, test-only adapter with four-parameter Builtin
   arrow, no default Realm registration. Keep GuestArray/runtime/conversion APIs
   unchanged unless a concrete integration issue is returned for review. Run all
   existing gates plus all map rows in both hosts, including bounded huge sparse
   and reentrant cases with subprocess timeouts. No source/test exclusions or
   reduced denominator; distinguish failures, timeouts and crashes.

Both are proposals ready for a coordinator contract, not permission to start.
Standard API installation is a later design boundary: implement ToObject and
wrapper semantics, function/realm intrinsic ownership, IsArray including future
proxy behavior, symbols/@@species/Construct, context-aware coercion/accessors and
generic result property creation before removing explicit restrictions. Add full
boxing, species-default/custom/error-order and cross-realm tests there. Do not
bundle those subsystems into the first map task. Stop here for review.
