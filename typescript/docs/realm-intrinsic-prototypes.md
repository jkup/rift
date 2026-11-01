# Realm intrinsic prototype foundation (TS-016P)

Design candidate, 2026-11-01. Baseline `bf8c129`, runtime milestone
`3a5d360`. This document authorizes no implementation. The smallest recommended
next batch is **graph, allocation and builtin metadata only**, described below.
No default coercion methods or constructor bindings belong in that batch.

## Decision and scope

Create three distinct roots per Realm: `objectPrototype`, `functionPrototype`,
and `arrayPrototype`. All production allocations use that Realm explicitly.
Keep low-level `new GuestObject()` / `new GuestArray()` as deliberate null-root
host constructions. Do not make their defaults depend on a current Realm.

An Object-only batch would be smaller in lines, but leaves callables and arrays
without their required intermediate roots; adding Object methods then exposes
misleading inherited conversions on both. All three roots are already expressible
with the current object, callable and array storage machinery. A graph-only batch
isolates allocation correctness from method semantics and keeps today's ordinary
coercion failures intact. Implementing graph plus methods together would couple
this review to boxing, tags, array string conversion and test migrations.

These are partial intrinsic roots, not complete standard intrinsic objects.
No global `Object`, `Function` or `Array`, no `constructor` properties, no
restricted function accessors, symbols, wrappers, `new`, species or reflection
APIs are introduced. Existing `Number` remains an explicitly partial, noncallable
namespace. Console formatting remains `display`, not guest ToString.

## Sources and adopted boundaries

Normative snapshot: **ECMA-262, 16th edition, ECMAScript 2025** (fixed edition,
not an unpinned living-spec revision), consulted 2026-11-01:

- [CreateIntrinsics, 9.3.2](https://tc39.es/ecma262/2025/multipage/executable-code-and-execution-contexts.html#sec-createintrinsics): allocate dependencies before use and keep intrinsic identities per Realm.
- [Object root, 20.1.3](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-properties-of-the-object-prototype-object), [Function root, 20.2.3](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-properties-of-the-function-prototype-object), [builtin function objects, 10.3](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-built-in-function-objects): root graph, callability and metadata.
- [Immutable prototype, 10.4.7](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-immutable-prototype-exotic-objects), [ArrayCreate, 10.4.2.2](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arraycreate), [ArraySpeciesCreate, 10.4.2.3](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arrayspeciescreate): root immutability, explicit array prototype and later species boundary.
- [Array root, 23.1.3](https://tc39.es/ecma262/2025/multipage/indexed-collections.html#sec-properties-of-the-array-prototype-object), [map](https://tc39.es/ecma262/2025/multipage/indexed-collections.html#sec-array.prototype.map), [join](https://tc39.es/ecma262/2025/multipage/indexed-collections.html#sec-array.prototype.join), [array toString](https://tc39.es/ecma262/2025/multipage/indexed-collections.html#sec-array.prototype.tostring): array exotic root and method dependencies.
- [OrdinaryToPrimitive](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-ordinarytoprimitive), [ToObject](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-toobject), [Object toString/valueOf](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-object.prototype.tostring): inherited methods are observable; boxing and symbol tags cannot be replaced by diagnostic formatting.

Implementation comparison: **engine262 `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`**,
resolved through the GitHub connector and inspected at that exact ref:

- [ObjectPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ObjectPrototype.mts) separates root creation (`makeObjectPrototype`) from method installation and supplies immutable prototype dispatch. Adopt that separation, using a private slot flag instead of replacing host methods.
- [FunctionPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/FunctionPrototype.mts) creates the callable root with an explicit Object prototype before registering methods. Adopt the explicit bootstrap exception; do not make the root inherit itself.
- [ArrayPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ArrayPrototype.mts) uses ArrayCreate(0, Object prototype). Its toString dynamically gets join and uses the intrinsic Object toString fallback. Do not copy its full library.
- [bootstrap.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/bootstrap.mts) centralizes method name/length/descriptors and installs constructor back-links separately. Adopt centralized metadata; retain Rift's validated bootstrap definitions instead of direct map insertion. No engine source is copied.

## Exact graph and initialization

For Realm R, `O = R.objectPrototype`, `F = R.functionPrototype`,
`A = R.arrayPrototype`:

```text
ordinary objects / console / Number namespace -> O -> null
guest functions / registered builtins         -> F -> O -> null
array literals / default map result           -> A -> O -> null
```

`O` is a GuestObject with immutable prototype slot, initially null. It is
extensible, has no own properties in this batch, and is not callable.
`F` is a GuestObject with builtin callable returning `normal(UNDEFINED)` for
every receiver/argument list. It has no own `prototype` or `constructor`.
Its own `name` is `""`, `length` is positive zero; both W/E/C = false/false/true.
`A` is a real GuestArray, not an ordinary object with a length property; its own
length starts at positive zero, W/E/C = true/false/false. Its ordinary prototype
slot is mutable; its length/index operations use the accepted exotic dispatch.

Order inside Realm constructor, before globals/console/Number registration:

1. Allocate O with explicit null and immutable-prototype flag.
2. Allocate F with explicit O, assign its no-op builtin callable, then validated
   bootstrap name and length. Do not invoke the callable.
3. Allocate A with explicit O; GuestArray's existing constructor establishes
   length directly through ordinary storage, bypassing virtual definition.
4. Assign the three readonly Realm fields. Only now use Realm factories and
   register builtins. Initialize existing bindings and host output closure.

No evaluator, OperationContext, guest Get/Set/Call, tick, or output is needed to
bootstrap. Descriptor failure is a host invariant failure, never a guest throw
silently ignored. Each Realm gets fresh roots, property maps, builtin objects and
callable records. Host code for the no-op body may be shared, guest objects may not.

There is no prototype cycle. Later Object methods will point to F while F points
to O: that is a property-reference cycle, allowed by host-managed memory. Later
constructors require a second installation phase after both endpoints exist;
none is synthesized now. No null placeholders, non-null assertions masking
uninitialized roots, or lazily consulted ambient Realm are necessary.

## Smallest next batch: exact interfaces and ownership

Proposed signatures (TypeScript notation, not executable evidence):

```ts
// runtime.ts; defaults intentionally preserve low-level host construction
GuestObject.constructor(proto: GuestObject | null = null,
                        immutablePrototype: boolean = false)
// private readonly immutablePrototypeSlot; private prototypeSlot initialized here
GuestArray.constructor(proto: GuestObject | null = null) // super(proto)

// realm.ts; direct typed fields, no generic intrinsic registry required yet
readonly objectPrototype: GuestObject;
readonly functionPrototype: GuestObject;
readonly arrayPrototype: GuestArray;
createObject(): GuestObject;
createArray(): GuestArray;
createFunction(callable: Callable): GuestObject;
createBuiltin(name: string, length: number, invoke: Builtin): GuestObject;
registerBuiltin(target: GuestObject, name: string, length: number,
                invoke: Builtin): Value;
// private helper within realm.ts, usable for F's bootstrap exception
setBuiltinMetadata(object: GuestObject, name: string, length: number): void;
```

`setPrototypeOf` first returns normal(true) for the existing slot value, then
returns normal(false) if immutable, then applies existing extensibility/cycle
checks. Thus O.setPrototypeOf(null) succeeds even when nonextensible, every
nonnull candidate fails, and defining/deleting O's properties remains possible.
The immutable flag has no setter. Constructor-supplied prototype references do
not invoke public setters or guest operations; a fresh object cannot already
appear in its supplied chain.

`createObject/Array/Function` select O/A/F respectively. `createFunction` sets
the supplied existing Callable without interpreting it; guest closure creation
keeps the same captured environment and does not implement constructors, inferred
names or own function metadata. `createBuiltin` adds own name/length using the
helper. Length is a host integer >= 0; reject invalid internal metadata with a
host Error. `registerBuiltin` creates that function, bootstrap-defines the target
method with W/E/C true/false/true, and returns its object Value. Full four-parameter
Builtin arrows remain required by the compiler contract.

The graph means guest closures without own name/length temporarily inherit F's
empty name/zero length. This is an explicit partial function-metadata limitation,
not correct arity/name inference. Do not claim ordinary function objects complete.
Do not add fake own `prototype` objects while construction remains unsupported.

Ownership for this proposed implementation assignment:

- `src/runtime.ts`, `src/array-object.ts`, `src/realm.ts`,
  `src/builtins/number.ts`, `src/evaluator.ts`, `src/array-map.ts` only for the
  above slots/factories, allocation migration and registration signature.
- Existing `test/realms.ts` for the G matrix below, `test/array-literals.ts` and
  `test/array-map.ts` for identity assertions; registration call sites in
  `test/operation-context.ts` and `test/length-coercion.ts` (plus the preceding
  three drivers). Runtime-read fixture `test/fixtures/realm-intrinsics.js` may
  be read by the existing realm driver, keeping current harness entries.
- Scoped README/architecture/feature inventory updates, this design's acceptance
  note, assigned task handoff and a new validation directory. Coordinator owns
  COORDINATION. No parser, conversion, manifests, pins or new harness needed.

Keep all 162 guest entries and 21 static gates; extend existing compiled drivers.
Run typecheck, runner20, probes10, rebuilt Node/native suites and both static-only
and coverage gates. Counts are minimums, not results of this design. Any new
compiler issue gets a real isolated reduction before a workaround.

## Complete production allocation and caller migration

Audited all `new GuestObject`, `new GuestArray`, `new Realm`, callable assignment
and registerBuiltin sites in `src` at the baseline. Environments and host Maps
are host structures, not guest prototype allocations.

| Site | Replacement / preserved behavior |
| --- | --- |
| `realm.ts` console object | `this.createObject()` after roots; host namespace, unchanged output callback/display |
| `realm.ts` registerBuiltin object | `createBuiltin(name,length,invoke)`; console.log length 0, name `log` |
| `builtins/number.ts` namespace | `realm.createObject()`; retain noncallable namespace and all constant descriptors |
| `builtins/number.ts` predicates | pass length 1 for isNaN/isFinite; remove duplicate metadata definitions, preserve descriptors |
| `evaluator.ts` closure (declarations + expressions) | `context.realm.createFunction({kind:"guest",params,body,environment})`; same Value wrapper and environment |
| `evaluator.ts` array expression | `context.realm.createArray()`; preserve slot ticks, holes, definitions and final length |
| `evaluator.ts` object expression | `context.realm.createObject()`; same evaluation/definition order and flags |
| `array-map.ts` result | `context.realm.createArray()`; keep captured length, definition path, holes and callback ordering |
| `array-object.ts` constructor | optional explicit proto forwarded to super; initial own length unchanged |
| `runtime.ts` base constructor | explicit initial slot and immutable flag; never choose a Realm |
| `cli.ts` new Realm | no signature change; bootstrap precedes evaluation |

No allocation changes are needed in interpreter, conversion, primitive-conversion,
array-like or property-keys. Error values remain strings, not new Error objects.

## Identity, execution context and map boundary

Putting an R1 object, array or function in an R2 binding/property retains its exact
object identity and original prototype chain. Neither Get/Set, arguments, return,
coercion nor map copies/reparents values. Mutating R1's root affects R1 objects
even when accessed via R2, but not R2's independently allocated roots.

The bounded internal `mapObjectDefaultArray` allocates from its **supplied
OperationContext.realm** for both ordinary and array inputs. An R1 input mapped
with R2 context produces an R2 array containing the exact returned element Values.
Callback origin and input prototype do not select the result Realm. The helper
still reads array `constructor` after length and callable validation; only guest
undefined is accepted. Generic objects skip constructor entirely. Inherited
nonnull constructor values remain rejected with `unsupported map constructor/species`.
Do not install even Object.prototype.constructor in this batch: arrays inherit it
and would immediately hit that rejection. Symbols/species and the spec's foreign
intrinsic Array constructor special case remain unsupported.

Current Evaluator.call has no function Realm slot or execution-context switching.
This batch does not claim standard cross-Realm function execution: a foreign
closure still executes with the calling evaluator's context and its lexical
environment, and allocations in its body use that context's Realm. Tests must
distinguish retained identity from this existing limitation. Before exposing
realm-sensitive standard methods (including map), design function-realm entry
with shared budgets and try/finally restoration; merely recording an owner or
constructing a new evaluator would not solve it. For the internal helper its
explicit context policy is intentional and testable now.

## Host-fixture checklist

The retained allocation search lists baseline sites, including hand-built callable
objects and subclasses. Keep low-level fixtures null-root by default: they test
storage, completion observers and deliberate missing methods independently of
standard library population. Do not mass-convert them to Realm factories.

| Driver group | Required action in graph batch |
| --- | --- |
| `array-literals.ts:shape` | replace null check with expected Realm.arrayPrototype parameter; pass the correct Realm for every shape assertion; preserve every length/keys/flags/hole assertion |
| `array-storage.ts:56`, `object-prototypes.ts:23` and cycle/frozen checks | retain null-root assertions: these call low-level constructors, not production factories |
| `realms.ts` | retain old bindings/output/receiver checks; add G matrix and root independence; target itself may stay null-root |
| `array-map.ts` | assert result A identity for own and foreign input; keep trace subclasses, constructor rejection, holes, all mutation and limits assertions |
| `operation-context.ts`, `array-literals.ts`, `array-map.ts`, `length-coercion.ts`, `realms.ts` | migrate registerBuiltin to required length argument; preserve callbacks/context/locations |
| `object-descriptors.ts`, `object-keys.ts`, `definition-dispatch.ts` | preserve explicit storage/prototype fixtures and observer semantics; no allocation migration |
| `array-like.ts`, `length-coercion.ts`, `array-length-coercion.ts` | preserve low-level inputs and exact TS-014/015 traces; parsed fixtures now get Realm roots with no conversion methods |
| `conversion.ts`, `property-key-conversion.ts`, `primitive-conversion.ts`, `key-coercion.ts` | keep primitive-only direct conversion boundaries, explicit hooks and null-root negatives |
| `numeric-operators.ts`, `addition.ts`, `relational.ts`, `operator-coercion.ts` | keep all explicit hook/order and parsed no-method assertions in graph batch |

Registration lengths: realms `test` 1; array-literals `stop` 0; operation-context
`observe` 1, `callback` 3, `thrower` 0, `reenter` 0; array-map
`__testMapObjectDefaultArray` 3, `observe` 5, `effect` 1; length-coercion
`length` 1, `map` 2, `remove` 2. These are host test adapters, not standard APIs;
their length metadata must not alter argument forwarding or implementation.

## Fixed graph acceptance matrix

Use fresh Realms where mutation occurs. Assert results, not merely lane parity.
Test source is parsed/read at runtime; root inspection/setup is host-side and
does not add a guest reflection API. G tests are proposed, not executed here.

| ID | Setup/action | Exact expected result |
| --- | --- | --- |
| G1 | new R1/R2; inspect O/F/A slots | O->null; F->O; A->O; all six objects distinct; roots extensible |
| G2 | O.setPrototypeOf(null), O.setPrototypeOf(fresh object); add property x=7 | true, false, own x=7; root remains null; repeat same-null after preventExtensions succeeds |
| G3 | ordinary factory object, low-level new GuestObject/null array | factory -> O; low-level -> null; ordinary relink/cycle/nonextensible assertions unchanged |
| G4 | call F via active.context.call with null/undefined/object receivers and arbitrary args | normal guest undefined, no output; callable nonnull; calls restored to 0; no own prototype/constructor |
| G5 | inspect F name/length, builtin log/predicates | F `""`/0, log `log`/0, predicates their names/1; metadata W/E/C false/false/true; installed methods true/false/true |
| G6 | inspect A; define index 2=9 then shrink length to 1 | instanceof GuestArray; initial keys `length`, length +0 T/F/F; index grows length 3; shrink removes index; length 1 |
| G7 | construct Realm with output callback that throws if called; no evaluator exists | construction succeeds, zero output/guest calls/ticks; bootstrap requires no context; invalid bootstrap definitions still host faults |
| G8 | runtime-read `{}`, `[]`, function declaration/expression, nested literals and repeated creation | each O/A/F identity matches active Realm; fresh object identities; nested Values retained; existing holes/flags/order unchanged |
| G9 | console and Number namespace, log and both predicates | namespaces -> O and noncallable; methods -> F and callable; Number() still TypeError; no Array/Object/Function globals |
| G10 | host define O.x=7, F.y=8, A.z=9; guest read and own shadow x=10 then host delete own x | inherited 7/8/9; shadow 10; after delete 7; no new own properties from lookup; readonly inherited Set rejects after RHS effects |
| G11 | mutate R1 O.x=7 and transfer R1 object/array/function to R2 | exact identity/chain retained, transferred x=7; R2 fresh object x=undefined; R2 roots unchanged |
| G12 | internal map with R1 array length 3, hole 1, identity callback, R2 context | result -> R2.A, length 3, absent own 1, exact element Values at 0/2, input still -> R1.A; generic input gives same result realm |
| G13 | array own/inherited constructor=undefined, then null/7/object; generic constructor=7 | arrays first succeed, latter reject exact existing species diagnostic; generic succeeds; length/callback/constructor order unchanged |
| G14 | graph-only default `{}`, `[]`, function coercion in numeric/addition/key/length consumers | existing located TypeError `cannot convert object to primitive`; explicit hook success/throws unchanged; primitive direct converters remain zero-hook |
| G15 | existing reentry/step/call-depth/host-fault tests plus F at exhausted call depth | exact existing RangeError diagnostics and abrupt identity; F respects call limit; cleanup restored; graph allocations add no ticks |
| G16 | A has inherited numeric 1=8 and child literal `[,,]`; internal map callback identity | child has own holes, inherited read at 1 is 8, map creates own result 1=8; deleting A index restores absence; other Realm unaffected |
| G17 | inspect all roots before test mutations | no own constructor/toString/valueOf/join/map; F has only name,length, A only length, O no own keys; missing methods never replaced by display |

## First methods and explicit prerequisites (separate review)

The smallest useful method follow-up is **Function.prototype.call**, length 1,
name `call`, installed W/E/C true/false/true. It can check callable receiver,
take first arg or undefined as thisArg, forward remaining args through active
context.call and propagate completion. It requires no wrappers, constructor,
array species or source serialization. Preserve existing strict receiver behavior
and shared resource limits; proper tail calls and full foreign-function Realm
entry remain explicit restrictions. It exposes only `f.call`, not a Function
constructor. This is a recommendation, not a successor assignment.

| Later method | Prerequisite / restriction before installation |
| --- | --- |
| Object.prototype.valueOf | real ToObject for supported primitives (including wrapper identity/internal slots and realm choice), null/undefined TypeError. Object-only return-this helper is not the standard method for primitive receivers. Do not return the primitive or fabricate an empty wrapper. |
| Object.prototype.toString | correct tags for every representable kind, undefined/null special cases, proper ToObject, and a declared symbol/tag boundary. Full method needs effectful @@toStringTag Get and symbol keys; no string property pretending to be that symbol. No unconditional `[object Object]` or display fallback. A future restricted profile must be reviewed explicitly. |
| Array.prototype.map | receiver ToObject or an explicitly reviewed object-only exposure; function-realm context policy; keep current species rejection unless separately expanded. Do not add constructor back-links ahead of policy changes. |
| Array.prototype.join | ToObject, LengthOfArrayLike, effectful separator and element string conversions, holes/null/undefined handling, shared budgets, reentry/cycle policy. No host Array.join over guest Values or console display. |
| Array.prototype.toString | ToObject, fresh Get(join), callable dispatch with original array receiver, intrinsic Object.toString fallback when join is not callable. Install with join for usable standard array conversion, not a hard-coded empty/comma string. |
| Function.prototype.toString | callable checks, builtin initial-name/native-function grammar and source text/HostHasSourceTextAvailable policy for guest functions. Current AST does not retain exact source. No `[function]`, reconstructed approximate source or blanket native string presented as complete semantics. |

Once Object valueOf/toString exist, default ordinary coercion becomes observable
via inherited lookup. Number hint first returns the object from valueOf, then
gets toString; string hint gets toString first. Replacing/deleting either method,
or installing own noncallable shadows, changes results immediately. Do not cache
method Values across conversions, especially the two array-length conversions.
Null-root host objects still have no methods. Direct primitive-only converter
APIs and bootstrap never gain hooks just because the graph changes.

Installing only Object methods would make arrays inherit a tag conversion
`[object Array]` and functions `[object Function]`; those are **not** standard
Array/Function default string conversion. Do not advertise default array/function
conversion at that intermediate milestone. Either freeze that partial exposure
explicitly with tests or defer installation until their methods are ready.

## Future positive migration matrix (not graph-batch changes)

Preserve old assertion purposes by keeping explicit no-method/null-root and
both-methods-return-object negatives alongside new positives. Do not weaken exact
throws, ordering, descriptor or budget checks. The results below assume the named
method milestone; they are not capabilities of `3a5d360` or this design.

| Existing location / new scenario | After correct Object methods | After correct array/function conversion |
| --- | --- | --- |
| `operator-coercion.ts:147` parsed `{}` across unary and operators | unary +/- and -,*,/,% -> NaN; `operand + 2` -> `[object Object]2`; all four relational comparisons with 2 -> false | same for ordinary object |
| same loop parsed `[]` | inherited tag gives NaN / `[object Array]2` / false, partial only | unary + -> +0, unary - -> -0; +2 -> `2`; -2 -> -2; *2 -> +0; /2 -> +0; %2 -> +0; <2,<=2 true; >2,>=2 false |
| same loop parsed empty function | inherited tag gives NaN / `[object Function]2` / false, partial only | numeric -> NaN, relation with 2 false; addition uses exact source/native representation chosen by approved source policy, never the tag |
| same loop both explicit hooks return objects | exact located TypeError remains | unchanged |
| `array-length-coercion.ts:174` mode missing after deleting own hooks on parsed rhs | RangeError `invalid array length`, target length stays 3, fixture hits 0 and trace empty; inherited calls happen twice each, assert separately with wrapper instrumentation | unchanged |
| `array-like.ts:135`, `array-map.ts:459`, `length-coercion.ts:187`, `key-coercion.ts:149`, `primitive-conversion.ts` no-method matrices | retain existing low-level null-root failures; ADD Realm factory object length -> 0, map with that length -> empty result, key -> `[object Object]`, primitive -> `[object Object]` | add Realm array length value `[]` -> 0 and `[2]` -> 2; array key [] -> empty string |
| object as computed key, read/write/call through `target[key]` | ordinary object key `[object Object]`; save base/key/RHS order and receiver identity; own toString shadow still wins | array `[1,2]` key `1,2`; function key requires source policy |
| array storage `a.length = {}` | RangeError after two number-hint conversions; do not confuse ToLength's 0 with ArraySetLength's failure | `a.length=[]` -> 0; `a.length=[2]` -> 2; `a.length=[2.9]` -> RangeError |
| explicit hooks in numeric-operators/addition/relational/key/length drivers | same successes/traces because own hooks win; test own deletion revealing inherited defaults as new positives | same; preserve array/function hook overrides |
| direct toNumber/toString/toLength/toIntegerOrInfinity and bootstrap object-length rejections | unchanged zero-hook boundaries until separately redesigned | unchanged |

Before any method implementation, re-search the retained sites and generated
runner cases against the new base, freeze exact additions/migrations and source
format expectations in its own task. No negative is deleted simply to keep a
denominator green. This design stops at coordinator review.

## TS-016A implementation note

The graph/allocation/metadata batch is implemented for coordinator review. The
interfaces and scope above are now exercised in the existing compiled drivers;
G1-G11/G14/G15/G17 live in realms.ts and G12/G13/G16 in array-map.ts, with all
array literal shape expectations selecting their explicit Realm. No later method
batch or foreign-function Realm entry is implemented. See
[implementation evidence](validation/ts-016a/README.md).
