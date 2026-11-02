# Primitive wrappers and default object conversion (TS-018P)

Design for coordinator review, 2026-11-02. Assigned base `d2c6087`; inspected
checkout `1ee6e7e` includes the coordinator's dispatch record. Runtime baseline
is accepted TS-017A `b02cfc3`. This is a design, not implementation evidence.

## Decision and stages

Implement **A: wrapper storage, String exotic dispatch, Realm roots and explicit
ToObject** together. This is the smallest coherent next assignment. No standard
methods are installed in A. Internal slots and observable String properties make
these real wrappers even before their conversion methods exist.

Then independently review **B: Object.prototype.valueOf only**. It needs A but
neither symbols nor wrapper prototype methods. It returns an object, never an
unboxed primitive. Default ordinary coercion still fails without toString.

**C: Object.prototype.toString is blocked on real symbol keys and a reviewed tag
lookup boundary.** Do not install a string-only approximation in A or B.
A restricted no-symbol profile would require a new explicit coordinator decision;
this design recommends deferral. Wrapper valueOf/toString methods, array join/
toString, and function source serialization are separate assignments. Installing
Object toString alone would expose inherited Array/Function/wrapper tag strings,
not their complete standard default conversions. A future installation must
freeze that partial exposure or include the relevant overrides.

## Evidence and sources

Read the actual runtime, Realm, evaluator, conversion, primitive-conversion,
property-keys, strings, array-object, array-like and array-map modules and their
host fixtures. The inspection inventory is retained in
[validation/ts-018p](validation/ts-018p/README.md).

Normative reference is the fixed **ECMA-262 2025, 16th edition**:
[ToObject and canonical numeric indices](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-toobject),
[String exotic operations](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-string-exotic-objects),
[Object methods](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-object.prototype.tostring).
These specify fresh primitive boxes, unchanged objects, virtual String descriptors,
and symbol-based tag lookup.

Implementation comparison, fetched at **engine262
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171`**:
[type conversion](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/type-conversion.mts)
separates boxing from primitive conversion;
[String objects](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/string-objects.mts)
synthesize indices and validate compatible definitions;
[Boolean](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/BooleanPrototype.mts),
[Number](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/NumberPrototype.mts)
and [String](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/StringPrototype.mts)
bootstrap slot-bearing roots;
[ObjectPrototype](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ObjectPrototype.mts)
keeps valueOf and tag lookup separate. Adopt those semantic boundaries, not its
generator machinery, casts, ambient agent or entire library. Its Number formatting
and other living-spec choices are not the fixed-edition oracle. No source copied.

## A: concrete interfaces and allocation

Proposed TypeScript signatures, not tested compiler code:

```ts
// primitive-objects.ts
class GuestBoolean extends GuestObject {
    constructor(readonly booleanData: boolean, proto: GuestObject | null = null);
}
class GuestNumber extends GuestObject {
    constructor(readonly numberData: number, proto: GuestObject | null = null);
}
class GuestStringObject extends GuestObject {
    constructor(readonly stringData: GuestString, proto: GuestObject | null = null);
    // overrides specified below, signatures identical to GuestObject
}

// realm.ts
readonly booleanPrototype: GuestBoolean;
readonly numberPrototype: GuestNumber;
readonly stringPrototype: GuestStringObject;
createBooleanObject(value: boolean): GuestBoolean;
createNumberObject(value: number): GuestNumber;
createStringObject(value: GuestString): GuestStringObject;

// object-conversion.ts
type ObjectCompletion =
    { type: "normal"; value: GuestObject } | ThrowCompletion;
toObject(input: Value, context: OperationContext, loc: Location): ObjectCompletion;

// property-keys.ts
stringIndex(key: PropertyKey, length: number): number | undefined;
```

Payloads are typed host scalars, not mutable Value records or guest properties.
No setters; no callable argument in wrapper constructors. No generic optional slot
on every object. Slot presence is represented by class identity, independent of
prototype linkage. A child of Boolean.prototype has no BooleanData unless it is
itself a GuestBoolean. A wrapper relinked to null retains its payload.
Booleans/numbers use ordinary property operations. Preserve NaN, infinities and
negative zero without formatting/normalization. Every object is truthy.

Bootstrap after O/F/A exist and before builtin/global registration:
allocate B(false,O), N(+0,O), S("",O), assign readonly Realm fields, then use
factories. All three are noncallable, extensible, with mutable prototype slots.
B/N own keys are empty; S owns only length=+0 with W/E/C false/false/false.
Each factory allocates a fresh wrapper linked to its own root. Roots link directly
to O, never themselves. All six roots are per-Realm objects. No constructor
back-links; the existing noncallable Number namespace still points to O and is
distinct from N. No Object/Boolean/String globals or Number constructor changes.

ToObject switches on input.kind: objects return the exact GuestObject; booleans,
numbers and strings use the active context Realm factories; null and undefined
return located runtime TypeError with message
`cannot convert null or undefined to object`. Error Value remains the existing
string representation. No property reads, calls, ticks, coercion hooks or user
constructors. Bootstrap uses constructors directly, never ToObject or a context.
Adding future Value kinds requires an exhaustive new branch, not an empty object.

Calling a B-defined builtin from A enters B before ToObject; a primitive box
therefore points to B's root. An A object passed to that builtin stays the same
A object. A direct host ToObject call uses the supplied live context's current
Realm. A saved context is not a saved Realm; after nested C call returns it again
observes B. Do not cache a Realm across an intentional call boundary. No wrapper
owner slot is needed: the prototype is chosen at allocation; function ownership
already lives in Callable. Existing shared steps/calls/depth cleanup is unchanged.

## String storage and dispatch

Use virtual code-unit indices, plus ordinary storage for length and added
properties. Length is installed once through ordinary validated storage in the
constructor, exactly as Array installs its own length but with W/E/C F/F/F.
Do not eagerly allocate one descriptor per code unit or model strings as arrays.
Use stringLength/stringUnit: a surrogate pair occupies two indices, a lone
surrogate is preserved, and an embedded NUL is an ordinary unit.

stringIndex recognizes a canonical numeric string whose numeric value is an
integer other than negative zero and lies in [0,length). Implement with the
existing stringToNumber and numberToString backends, exact round-trip comparison,
explicit "-0" exclusion, integer/range checks. It performs no guest conversion.
Do not reuse arrayIndex: the latter's 2^32-2 ceiling serves a different rule.
Rejected keys ("01", "+0", "1.0", "-0", negatives, fractions, NaN, Infinity,
out-of-range indices) remain ordinary property names, not errors. Numeric -0
converted by ToPropertyKey becomes "0"; the literal string "-0" stays distinct.

GuestStringObject overrides:

| Operation | Required implementation |
| --- | --- |
| getOwnProperty | Check super ordinary own descriptor first, otherwise synthesize indexed unit descriptor W/E/C F/T/F; return detached descriptors |
| defineOwnProperty and bootstrapDefineOwnProperty | For a virtual index accept only compatible data/generic updates: omitted or SameValue unit, writable absent/false, enumerable absent/true, configurable absent/false. Return true without storage insertion, even if nonextensible. Otherwise delegate ordinary definition, including length |
| internalDelete | Virtual index -> normal(false); otherwise ordinary delete. No guest throw; public Set/definition wrappers decide error policy |
| ownPropertyKeys | Virtual indices ascending, then stored array indices >= length ascending, then stored non-array strings in insertion order (length first among these). No duplicates; detached array |
| properties snapshot | Include all own virtual and stored descriptors in ownPropertyKeys order; mutating snapshot/descriptors must not affect object |

Override the String properties getter locally using its keys/getOwnProperty.
Keep the base getter's storage-only implementation, which remains complete for
ordinary objects and arrays, avoiding unrelated observer changes.

**Required runtime migration:** internalGet, internalHasProperty and descriptor
search in internalSet must consult each object's virtual getOwnProperty rather
than private propertyStorage. Keep iterative prototype traversal, original
Receiver, method signatures and completion propagation. Do not call semantic Get
from HasProperty. Existing receiver getOwnProperty/defineOwnProperty dispatch in
Set remains. This handles String objects anywhere in an ordinary prototype chain.
An inherited readonly unit blocks Set even if Receiver already has a writable
property; direct DefineOwnProperty on that child can create a shadow. Deleting
a child's absent own index succeeds without deleting an inherited unit.

No general proxy/accessor dispatch is claimed: getOwnProperty is still synchronous
and nonabrupt. Existing host internalGet/HasProperty observers still intercept
operations invoked on them; inherited arbitrary overridden internalGet behavior
is outside this data-descriptor traversal contract. Symbols/accessors later need
a separately audited interface expansion.

## Explicit boundary: boxing does not change language references

A introduces no production caller of ToObject beyond its exported internal API.
Test through host bridges with explicit builtin ownership. getValue/putValue
continue rejecting primitive bases before key conversion with their existing
error; evaluator method calls keep original object receivers; function calls and
Function.prototype.call keep primitive/null/undefined receivers unchanged.
Implicit member reads/writes, transient boxes, strict versus sloppy receiver
binding, and nullish member evaluation order need a separate reference-semantics
task. Do not fix those by putting ToObject into Evaluator.call.

lengthOfArrayLike and mapObjectDefaultArray keep GuestObject parameters. They
can consume an explicitly supplied String wrapper through existing operations;
neither boxes primitives. Map still allocates in the active context Realm, visits
every String unit, and preserves callback receiver/argument identity. No Array
species/constructor exposure is added.

Direct toNumber/toString/toUint32/toIntegerOrInfinity/toLength still reject ALL
objects, including wrappers, without hooks. toPrimitive keeps ordinary method
lookup; A wrappers have no conversion methods and therefore fail unless explicit
hooks are installed. No hidden unboxing in operators, keys, length or display.

## Fixed A acceptance matrix

All results below are requirements, not measured results. Host setup/inspection
may expose wrappers to runtime-read guest fixtures; no new guest reflection API.

| ID | Setup/action | Expected result |
| --- | --- | --- |
| W1 | two fresh Realms | B/N/S distinct across realms; -> own O; payload false/+0/""; roots extensible/noncallable; keys [],[],["length"]; original O/F/A unchanged |
| W2 | ToObject twice for false, 0, -0, NaN, infinities, "", "ab" | different objects each time; correct prototype/payload; -0 reciprocal -Infinity, NaN preserved; false/0/empty boxes truthy |
| W3 | ToObject ordinary, array, callable, wrapper, foreign/null-root object | exact object identity and original chain; no mutation, Get/Call/tick count zero |
| W4 | ToObject null/undefined at saved loc | exact TypeError message above and same loc; no allocation or hook; context/counters unchanged |
| W5 | box `"A\ud83d\ude00\ud800\0"` | length 5 F/F/F; units A, high surrogate, low surrogate, lone high surrogate, NUL; each F/T/F; own keys 0,1,2,3,4,length |
| W6 | box "ab", query 0/1/2 and invalid spellings listed above | 0/1 units, others absent until ordinary definitions; numeric -0 key reaches a, string "-0" may be independently defined |
| W7 | define index 0 with {}, same "a", W=false/E=true/C=false, individually and combined | true; no new stored index, descriptor unchanged; also true after preventExtensions |
| W8 | define 0 with "z", W=true, E=false or C=true; Set same "a"; delete 0/length | definitions false atomically; Set false even same value; deletes false; public set TypeError "property is not writable: 0" |
| W9 | length same 2 versus 3/W=true/E=true/C=true; define 2="x" | same length accepted, incompatible updates false; new index ordinary T/T/T when fully specified; length stays 2 |
| W10 | box "ab"; add z,10,2,"01","-0","4294967295" in that order | keys 0,1,2,10,length,z,01,-0,4294967295; deleting/readding z moves it last among non-array strings |
| W11 | preventExtensions on fresh "ab" | reads/keys unchanged; compatible index/length definitions true, new key false; prototype change false, same prototype true |
| W12 | ordinary child -> "ab" box; Get/Has/Set/delete index 0 | Get a, Has true; Set false with no child property; delete child's absent own true; direct child definition can shadow; original unit unchanged |
| W13 | ordinary base Set into String receiver, and String base Set into distinct ordinary receiver with own writable 0 | both reject virtual readonly index; ordinary added writable key can be set normally; all existing array receiver tests preserved |
| W14 | mutate returned descriptor, keys array, properties Map | storage and virtual descriptors unchanged; payload unaffected by guest property named stringData/numberData/booleanData or prototype mutation |
| W15 | A -> B builtin boxes, nested C boxes, B boxes again, return to A | prototypes B,C,B; returned objects retain identity; context A restored after normal/guest throw/host fault; shared limits unchanged |
| W16 | map explicit box "ab" with identity callback, context R | result R.A, length 2, own a/b, callback third argument exact box; lengthOfArrayLike returns 2; no constructor read for String |
| W17 | direct primitive converters on wrappers; parsed primitive members; existing G14/coercion failures | original errors and zero-hook contracts retained; no implicit unboxing/boxing or new globals/methods |
| W18 | bootstrap with throwing output callback; invalid bootstrap index update | no output/evaluator/calls/ticks during bootstrap; compatible update succeeds, invalid update throws existing host invariant error |
| W19 | stringIndex("4294967295",4294967296), without allocating huge string | 4294967295 accepted; arrayIndex same key undefined; exercise helper only, no huge allocation claim |

## B: Object valueOf, a separate small method batch

Add registerObjectValueOf(realm: Realm): void in builtins/object.ts, invoked after
roots. Install name "valueOf", length 0, method W/E/C T/F/T, metadata F/F/T;
function -> F and immutable defining Realm supplied by createBuiltin.
Body calls toObject(receiver,context,loc), propagates throw exactly, otherwise
returns normal({kind:"object", object: result.value}). Ignore args without
coercion. No own constructor or toString installation. No new evaluator/ticks.

| ID | Requirement | Expected result |
| --- | --- | --- |
| V1 | borrowed valueOf on every object kind incl foreign/null-root | exact object identity, no Get/Call hooks inside ToObject |
| V2 | borrowed on booleans/numbers/strings twice | fresh meaningful boxes in method's defining Realm, W2/W5 payload/shape |
| V3 | detached/missing this, null; argument expressions with effects | existing argument effects occur first; located W4 error; extra args ignored |
| V4 | A caller, C.call forwarding to B.valueOf | entry A,C,B; allocation B; restoration B->C->A; receiver unchanged |
| V5 | per-Realm installation, delete/replace/shadow | independent method identity/state; ordinary lookups observe changes; metadata exact |
| V6 | ordinaryToPrimitive parsed {} and []/function with no own hooks | still final cannot-convert TypeError; now inherited valueOf is called and returns receiver, then missing toString; existing lookup ticks remain, call budget participates |
| V7 | primitive converter APIs, explicit both-hooks-return-object and null-root negatives | unchanged errors/traces; borrowed valueOf does not mutate their chains |
| V8 | exhausted call budget or host/guest error from surrounding bridge | original exact error/completion and finally cleanup; no reset/fresh budget |

B migrates G17's O keys to ["valueOf"] and inherited missing-method assertions,
but does not turn G14 into positive coercion. Reassess exact tight call budgets:
new inherited calls are real semantic work, not ticks to suppress. Add expectations
for this work while retaining existing explicit-hook and null-root budget tests.

## C dependency contract and eventual result matrix

Current tags: undefined -> Undefined, null -> Null; GuestArray including A ->
Array; callable objects including F -> Function; GuestBoolean/GuestNumber/
GuestStringObject including B/N/S -> Boolean/Number/String; all other objects
including O, console and Number namespace -> Object. Prototype lookalikes retain
Object; relinked wrappers retain their slot tag. Error diagnostics are strings
and therefore String, not Error objects. Arguments, Error objects, Date, RegExp,
Symbol and BigInt values are not representable yet.

Before C: introduce real symbol identity in Value/PropertyKey and storage,
well-known symbol identity shared appropriately across Realms in the same agent,
string-versus-symbol key ordering, symbol-preserving ToPropertyKey, primitive
conversion rejection rules, and wrapper coverage for newly representable values.
Audit all exhaustive switches and diagnostics; this is a new design task, not an
implicit assignment. A symbol cannot be a spelling such as "@@toStringTag".

Then Object toString performs nullish special cases; ToObject in defining Realm;
builtin tag classification; effectful Get of the actual well-known symbol on the
boxed object with that object as receiver; exact abrupt propagation; use returned
string tag or builtin fallback without coercing a nonstring. Accessor invocation
requires a context-aware Get interface and descriptor model, currently absent.
If C precedes accessors, its data-only limitation must be explicit and tested with
existing completion observers; do not claim accessor support.

| ID | Eventual C scenario | Expected result |
| --- | --- | --- |
| T1 | every representable kind above | exact "[object Tag]" strings; null/undefined perform no boxing/tag Get |
| T2 | own/inherited real symbol tag "Custom"/""; nonstring tag object with throwing hooks | "[object Custom]"/"[object ]"; nonstring uses builtin tag, hooks never called |
| T3 | ordinary string keys "toStringTag"/"@@toStringTag"/"Symbol.toStringTag" | no effect; same-description distinct symbol also no effect |
| T4 | tag Get throws sentinel or reenters C from B | exact completion/location and B restoration, then caller restored; Get once after classification |
| T5 | borrowed B method on primitive in A, B prototype tag differs from A | B prototype tag wins; existing A wrapper retains A chain/tag |
| T6 | ordinary {} through number/default/string hints | valueOf then toString for first two; toString first for string; primitive "[object Object]", numeric NaN, key "[object Object]" |
| T7 | replace/delete/shadow methods or mutate them during first hook | fresh second lookup, exact order; both object results still TypeError; null-root negative retained |
| T8 | array length={} after C | two complete number conversions; RangeError "invalid array length"; length unchanged; no caching between conversions |

## Caller and fixture migration inventory

A changes only runtime descriptor traversal, new primitive-objects/object-conversion,
property-keys helper and Realm roots/factories. No production ToObject callers
exist today. Existing object/array/function allocations are already correct;
do not migrate them to boxes. Keep all raw null-root fixtures and callable owners.

| Existing area | A | B / future C migration |
| --- | --- | --- |
| runtime getValue/putValue; evaluator references/call | unchanged signatures/primitive-base rejection | unchanged; member boxing remains separate |
| conversion.ts, primitive-conversion.ts; numeric/addition/relational evaluator paths | unchanged; add wrapper rejection coverage | direct converters unchanged; C adds inherited positive ordinary-object conversions |
| array-object.ts length conversion/bootstrap | unchanged; existing two conversions retained | C array-length-coercion.ts:173-190 missing mode becomes RangeError, length 3, own hits 0/trace ""; both-object remains TypeError/oo; instrument inherited calls separately |
| array-like.ts, array-map.ts | unchanged consumers; add W16 | null-root failures in array-like.ts:134, array-map.ts:460 remain; add factory-object length -> 0/map empty after C |
| realms.ts G1/G17/G14 and realm fixture | extend roots, retain existing O/F/A keys and failures | B updates valueOf presence only; C updates keys and G14 conversion results |
| operator-coercion.ts:147 loop | all current failures remain | C {} numeric operations NaN, +2 "[object Object]2", relational comparisons false; both-object remains located TypeError |
| same loop [] and function | unchanged | if C alone approved, NaN / "[object Array]2" or "[object Function]2" / false are explicitly partial; array join/source-policy follow-ups must replace them later |
| primitive-conversion.ts:123; length-coercion.ts:187; key-coercion.ts:149 | retain missing/noncallable/object negatives and exact locations | keep low-level null-root negatives; add Realm-object positives after C; parsed cases with own overriding hooks retain outcomes |
| numeric-operators.ts, addition.ts, relational.ts, property-key-conversion.ts | preserve explicit hooks, abrupt order, primitive-only fixtures | add deletion revealing inherited defaults; never replace explicit-hook tests with defaults |
| object-descriptors.ts, object-keys.ts, object-prototypes.ts, definition-dispatch.ts | preserve snapshot, order, false/throw and receiver assertions; add String chain/receiver cases | no bulk fixture conversion |
| array-storage/literals/map and all observer subclasses | preserve holes/length/order and entry observers | no assumption that changing storage dispatch authorizes accessors/proxies |
| function-call.ts, operation-context.ts and TS-017A reentry tests | retain strict receivers/owners/limits; extend W15 | V4/V8 extend same shared-context assertions |

For C, a factory ordinary object used as length becomes 0 via NaN->ToLength,
but array length assignment is RangeError; computed object keys become
"[object Object]" with existing base/key/RHS/call order. Own conversion hooks
continue to win. Array [] numeric +0 and key "" require join/toString, not C;
function string output requires exact source policy. Do not weaken denominator,
negative intent or observer assertions to accommodate new defaults.

## Smallest implementation assignment and validation

Recommend A only. Own src/primitive-objects.ts, src/object-conversion.ts,
src/property-keys.ts, scoped runtime.ts dispatch and realm.ts bootstrap/factories.
Extend existing compiled realms, object-descriptors/prototypes/keys,
definition-dispatch and array-map drivers; runtime-read fixtures can be added
under those drivers. Preserve all 163 current guest entries and 22 static gates,
including conversion.ts's accepted side-effect import. No manifest/pin change
is needed if existing compiled drivers hold W1-W19. Scoped docs/validation and
task handoff accompany that implementation; coordinator owns COORDINATION.

Run typecheck, runner20, probes10, rebuilt Node/native expected-result suites and
every static-only build plus separate coverage gate. Particularly test subclass
dispatch through a GuestObject reference, inherited String indices, class imports
through Realm cycles, readonly scalar payloads, and the properties getter.
The prior Array import reachability issue makes new subclass reachability a real
risk to measure, not a reason to add speculative imports/casts. Existing UTF-16
probes support the string backend, not the new integrated wrapper path.
Only reduce compiler failures actually observed; retain failure and successful
reduction results before adopting any workaround. No native support, benchmark,
or resource-bound claim follows from this prose. Virtual indices avoid eager
boxing cost, but ownPropertyKeys necessarily allocates proportional to length.

Excluded: production implementation in this task; constructors/new/globals,
implicit member/receiver boxing, wrapper methods, Object toString, symbols,
accessors/proxies, species, Error objects, async/jobs/generators, full standard
intrinsics, corpus selection and successor dispatch. Stop for coordinator review.

## C implementation status (2026-11-02)

TS-019C implements the frozen C contract after TS-019B2, including real symbol
tags. The earlier design's unavailable-Symbol statement is historical: symbols
and boxes are now represented, with Object fallback supplied by classification
and Symbol supplied only by the canonical prototype property. Both this document's
T1-T8 and symbol-foundation's complementary T1-T8 are mapped in
[TS-019C evidence](validation/ts-019c/README.md). Default Array/Function/Boolean/
Number/String conversions remain explicitly partial inherited tag strings.
