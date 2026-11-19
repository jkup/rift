# Ordinary object coercion: integration design

TS-011P, 2026-11-01. Audited base `9235558c83d8e2a48b2e3fbd88aa578c417b222d`
on `codex/primitive-computed-keys`; accepted TS-010 implementation `8cf17fa`.
Proposal for coordinator review, not runtime implementation or an automatically
authorized successor. Paths below are relative to ``.

## Decision and boundary

Recommend **one helper-only implementation batch**: context-aware
`ordinaryToPrimitive` and partial `toPrimitive`, exercised through the real
Evaluator call boundary in a compiled host driver and runtime-read guest methods.
Do not change any existing conversion function or production caller yet.
This establishes the difficult guest-call contract without coupling it to
reference writes and the array exotic definition pipeline.

| Option | Benefit | Cost / acceptance boundary |
| --- | --- | --- |
| Helper-only (recommended) | Tests lookup, call, completion, reentrancy and budget semantics once | Guest operators still reject objects; this must remain explicit |
| Full caller migration | Makes hooks observable throughout existing language paths | Changes conversion APIs, operators, reference consumers, array definitions, bootstrap and host tests together; too broad for the next batch |

The helper is useful internal engine infrastructure, not a new guest intrinsic.
All current objects, including functions and arrays, start without standard
Object/Function/Array prototype methods. Explicit own methods work; inherited
data methods work on host-established prototype chains. Empty `{}`, `[]`, and
functions without methods fail ordinary conversion. No implicit `"[object Object]"`,
array joining, function source stringification, Date rule, wrappers, symbols,
BigInt, accessors, proxies, boxing or standard Array APIs are introduced.

## Sources and decisions

Consulted the living ECMAScript draft on 2026-11-01, using named anchors because
clause numbering differs between cached pages:

- [ToPrimitive and OrdinaryToPrimitive](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-toprimitive),
  [ToNumber](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-tonumber),
  [ToString](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-tostring),
  [ToPropertyKey](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-topropertykey),
  [IsLessThan](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-islessthan).
  Adopt sequential lookup/call and explicit hints; do not emulate symbols with
  a string property named `"@@toPrimitive"` or `"Symbol.toPrimitive"`.
- [Computed references](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-evaluate-property-access-with-expression-key),
  [GetValue / PutValue](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-getvalue),
  [binary arithmetic](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-applystringornumericbinaryoperator),
  [relational evaluation](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-relational-operators-runtime-semantics-evaluation).
  Retain raw reference capture and deferred key conversion from TS-007. Do not
  move conversion into reference creation based on an older specification.
- [ArraySetLength](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arraysetlength),
  [LengthOfArrayLike](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-lengthofarraylike),
  [map](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.map).
  Preserve distinct conversion invocations and snapshot only the numeric limit.
- Engine comparison: V8 tag **12.0.267**, [src/objects/js-objects.cc](https://github.com/v8/v8/blob/12.0.267/src/objects/js-objects.cc),
  `JSReceiver::ToPrimitive` and `JSReceiver::OrdinaryToPrimitive`, fetched through
  GitHub. V8 separates exotic-symbol handling from ordinary fallback, looks up
  one candidate at a time and calls with the receiver and zero arguments.
  Adopt that separation; retain Rift explicit completions and OperationContext
  rather than V8 handles, isolate state or exception macros. No code copied.
- Cross-check: engine262 revision `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`,
  [type-conversion.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/type-conversion.mts),
  `ToPrimitive` and `OrdinaryToPrimitive`. Its sequential Get/IsCallable/Call
  implementation agrees; its generator/ambient-agent architecture is not adopted.

## Exact next-batch interfaces

New `src/primitive-conversion.ts`; import existing runtime types and `failure`.
No new Value alternative, completion variant, callable interface or Realm slot.

```ts
export type PrimitiveHint = "default" | "number" | "string";
export type OrdinaryPrimitiveHint = "number" | "string";

export function ordinaryToPrimitive(
    input: Value, hint: OrdinaryPrimitiveHint,
    context: OperationContext, loc: Location,
): ValueCompletion;

export function toPrimitive(
    input: Value, hint: PrimitiveHint,
    context: OperationContext, loc: Location,
): ValueCompletion;
```

`ordinaryToPrimitive` has an object precondition: a nonobject argument is a host
invariant fault, not a guest TypeError. Taking the original Value rather than a
bare GuestObject preserves its exact identity as the receiver. A normal result
is guaranteed nonobject; retain ValueCompletion to avoid new generic/type-level
compiler machinery solely to express that invariant. `toPrimitive` returns a
normal completion with the same input Value for primitives (including undefined,
null, NaN, signed zero, NUL and lone-surrogate strings), without ticking or reads.
For objects, map default to number and delegate. This is **partial ToPrimitive**:
there is no well-known symbol lookup. Full ToPrimitive's exotic hook takes one
hint argument and rejects an object result immediately; ordinary fallback takes
no arguments and may try a second method. Keep those algorithms distinct.

For an object, `ordinaryToPrimitive` performs:

1. Choose `valueOf`, then `toString` for number; reverse for string.
2. Before each attempted method lookup, call `context.tick(loc)` exactly once.
   Return a throw record unchanged. There is no additional entry or call tick
   in this helper; normal evaluator execution still charges its own ticks.
3. Call `input.object.internalGet(name, input, loc)` and return any throw record
   unchanged. Use semantic Get, never `.get`, descriptor snapshots or storage.
4. If the value is not an object with `callable !== null`, skip it. This includes
   undefined, null, booleans, numbers, strings and noncallable objects. Do not
   apply GetMethod's noncallable TypeError rule here.
5. Otherwise use `context.call(method.value, input, [], loc)`. Return an exact
   throw unchanged. Accept every nonobject normal result immediately, even
   undefined/null. For an object result continue to the next fresh lookup.
6. After both fail, return `failure("TypeError", "cannot convert object to primitive", loc)`.

Do not prefetch both methods, cache descriptors, recurse into object returns,
invoke the input object's own callable slot, stringify host Value wrappers or
swallow host exceptions. A first method may replace/delete the second, change
the prototype, reenter the helper, or mutate unrelated state before returning.
Those effects persist even if a later lookup/call fails.

## Context, resource and realm ownership

`Evaluator.context` already closes over the active evaluator; its `call` invokes
`Evaluator.call`, and `tick` shares `steps`. `call` checks maxCalls (default 64),
increments active calls, passes the same context to builtins, evaluates guest
closures in their captured Environment, and decrements calls in `finally`.
Statement/expression evaluation charges steps (default 100000) and limits
nesting to 256. Array/map loops already use this active budget.

Pass that exact context through nested coercion, including a builtin method
that invokes the helper again. Never construct an Evaluator, Realm, reset
counters, store an ambient context or call `execute()` inside a coercion helper.
Test-driver top-level `execute()` may prepare methods; actual helper calls use
one explicitly retained evaluator. Guest method bodies and nested calls then
consume that evaluator's budget. Two lookup ticks bound even builtin-only
recursive coercion together with call depth. Ordinary data lookup itself has
no guest callbacks; accessor support would require a separate context migration.

Return Get, tick and call ThrowCompletion **objects** unchanged, retaining value,
diagnostic object and source location. Only newly created final TypeErrors use
the supplied location. No catch converts a host fault into a guest exception.
The helper holds only local variables and has no depth counter to unwind.
Existing call `finally` releases call depth on normal, guest throw and host fault.
Existing expression/statement nesting counters do not use finally on host faults;
do not claim that a whole evaluator is reusable after an arbitrary nested host
fault. Test guaranteed call cleanup; track broader recovery separately if needed.

No mutable objects are allocated globally. Test independent realms with distinct
methods/state and check builtin `context.realm` and context identity. Guest
objects currently have no realm-owner slot: the design promises active-context
propagation and no accidental sharing, not a cross-realm call/ownership model.
Host embedding can deliberately share objects; that is not silently prohibited
or implemented as a new realm feature here.

## Complete production caller audit

All rows stay **unchanged and primitive-only** in the recommended helper batch.
The only callers of the new helper are the new compiled test driver and its
host-installed test builtin. This table is the later migration checklist.

| Current caller / edge | Active context source and eventual change |
| --- | --- |
| `conversion.ts:toNumber` object rejection | Later take context; object path requests number-hint ToPrimitive, then existing primitive numeric conversion |
| `toUint32 -> toNumber` | Forward same context; no cached conversion |
| `toLength -> toIntegerOrInfinity -> toNumber` | Forward context through each; retain numeric normalization/clamp |
| `toString` object rejection | Later string-hint ToPrimitive then primitive string conversion |
| `toPropertyKey -> toString` | Later explicitly string-hint ToPrimitive then ToString; preserve future symbol distinction |
| `evaluator.ts` unary + / - | `this.context`; convert after operand GetValue |
| `Evaluator.binary` numeric - * / % | `this.context`; source-left then source-right numeric conversion after both evaluations |
| `Evaluator.binary` + guard, both ToString and both ToNumber calls | Replace guard with two default-hint conversions before testing either result's string kind |
| `Evaluator.binary` relational guard and numeric pair | Two number-hint conversions in source order, then string/numeric comparison; retain explicit unordered state |
| `runtime.ts:getValue`, `putValue -> toPropertyKey` | Pass context from evaluator identifier/member, assign and call paths; convert after base validation |
| `putValue -> GuestObject.set -> internalSet -> receiver.defineOwnProperty` | Required context plumbing for array receiver length conversion; original receiver survives prototype traversal |
| `array-object.ts:defineOwnProperty -> setLength -> toUint32`, then `toNumber` | Same active context twice; old length descriptor read after both conversions |
| `array-like.ts:lengthOfArrayLike -> internalGet -> toLength` | New context parameter; one length Get then conversion |
| `array-map.ts:mapObjectDefaultArray -> lengthOfArrayLike` | Already receives context; forward it before callback validation |
| map result length/index definitions | Forward context into definition pipeline; result length is already numeric |
| evaluator array literal index and final length definitions | Forward `this.context`; element values do not themselves coerce |
| `GuestObject.define` convenience -> virtual defineOwnProperty; GuestArray constructor/base calls | Bootstrap currently has no evaluator; isolate trusted setup from effectful semantic definitions before general conversion changes |

`stringToNumber`, `numberToString`, `arrayIndex`, String(k) for known numeric
indices, `truthy`, strict `equal`/SameValue, display/console output and Number
predicates are not guest object-conversion sites. Do not change them. Plain
ordinary data-property value storage must never coerce its value.

### Later API migration shape (not next-batch authorization)

When each boundary is separately approved, append a required context before
the final Location, following the existing Builtin/map convention:

```ts
toNumber(value: Value, context: OperationContext, loc: Location): NumberCompletion;
toUint32(value: Value, context: OperationContext, loc: Location): NumberCompletion;
toIntegerOrInfinity(value: Value, context: OperationContext, loc: Location): NumberCompletion;
toLength(value: Value, context: OperationContext, loc: Location): NumberCompletion;
toString(value: Value, context: OperationContext, loc: Location): StringCompletion;
toPropertyKey(value: Value, context: OperationContext, loc: Location): PropertyKeyCompletion;
getValue(ref: Reference, context: OperationContext, loc: Location): Completion;
putValue(ref: Reference, value: Value, context: OperationContext, loc: Location): Completion;
lengthOfArrayLike(object: GuestObject, context: OperationContext, loc: Location): NumberCompletion;
```

Do not activate toNumber's object branch until *every* downstream numeric caller
has context or an explicit preserved primitive-only boundary. No optional context
that silently disables hooks. A reasonable subsequent bounded step is operators:
explicitly call toPrimitive in evaluator numeric/plus/relational paths, then use
the existing primitive converters. This avoids prematurely changing array APIs.
Next separate key integration adds context only to ToPropertyKey and reference
consumers (ToString can still consume the already primitive result).

Array definition integration needs its own frozen contract. Proposed semantic
signatures are `defineOwnProperty(key, desc, context, loc)`,
`internalSet(key, value, receiver, context, loc)`, `set(key, value, context, loc)`,
and private `setLength(desc, context, loc)`, with the existing return types.
All are required-context semantic operations. Trusted `define` and constructors
must instead use an explicitly named bootstrap path restricted to ordinary data
definitions and primitive array lengths; it must still validate descriptors and
must fault on a request for guest coercion. Finalize that bootstrap API in the
array task before changing virtual signatures; do not manufacture contexts.
Array-like/map integration can be separately bounded using explicit number-hint
ToPrimitive on the one fetched length and then the existing primitive toLength.

Thus dependency order is helper acceptance; independently approved operators,
keys, array-like/map; then array-definition/bootstrap migration. A single global
converter API switch is unnecessary. The eventual signature list is an audit
target, not permission to execute that entire sequence.

## Observable order to retain in future integrations

For operators let L/R be operand evaluation and GetValue, P/Q be left/right
coercion. Binary arithmetic, addition and all comparisons must trace `LRPQ`.
An L throw skips R; an R throw skips P/Q, including when L returned an object.
A P throw skips Q. For > and <=, preserve source-order P/Q even though the spec
reverses IsLessThan arguments. Convert both to primitives before addition's
string decision and before relational two-string selection. Do not use string
hint merely because the other addition operand is already a string.

For references, B/K/R/A = base/key/RHS/argument evaluation, C = key conversion,
G/S = property Get/Set, M = method invocation. Read: `BKCG`; simple write:
`BKRCS`; call: `BKCGAAM` for two arguments. Save base and key Values once.
RHS can replace the binding of either without redirecting the reference; mutation
of the saved key object's methods *does* affect the later conversion. C receives
the key as receiver, G/S/M receive the saved base. Invalid base rejects before C;
for writes RHS still runs first. Primitive bases remain explicitly unsupported.
Get/call conversion failure skips arguments; write RHS failure skips conversion.
Current simple paths consume each reference once. Reusing a raw reference in
host code would reconvert; compound/update syntax requires a separate cached-key
contract and is excluded, consistent with TS-007.

ArraySetLength must convert the original descriptor value via ToUint32 (including
one number-hint conversion) and then separately ToNumber (another). No replacement
with ToNumber once plus a numeric uint32 operation. First-call mutation of the
method, array indices, length or writable flag is visible to the second call.
Second-call failure preserves those guest effects, but performs no subsequent
outer length update. Compare the two numeric results before reading old length;
then retain the existing shrink/rollback/nonconfigurable-index algorithm. A
strict Set can reject a nonwritable length before reaching ArraySetLength; direct
DefineOwnProperty with a value reaches conversion before its later rejection.

LengthOfArrayLike gets length once, converts the saved Value once, and clamps.
Map completes that conversion before callback validation, constructor/species
checking or result allocation. Coercion may modify callback callability (host
test), constructor, elements or length; subsequent checks see that mutation.
The numeric iteration bound is fixed afterward; indexed presence/values remain
live during callbacks. Keep map holes, result limits and unsupported species.

## Existing test migration inventory

No old test changes in the helper batch. When a caller is integrated, retain
every scenario/assertion purpose and convert only superseded expectations:

| File / anchor at audited base | Later disposition |
| --- | --- |
| `test/conversion.ts` object hook block (~100), toNumber/toUint32 | Positive hook result/call count after converter integration; new no-method and both-object TypeErrors |
| `test/array-storage.ts` coercible/unsupported (~110) | Replace throwing host trap with counting method, assert two conversions and valid shrink; retain invalid-length, descriptor and rollback coverage |
| same file frozen internalSet (~129), assignment mode loop (~190) | Frozen Set still skips hooks; object-valued length assignment becomes positive with two calls, keeping invalid/readonly/partial-failure modes |
| `test/array-like.ts` unsupported helper and calls (~129-164) | Positive explicit methods; no-method failure remains meaningful; observed length Get count stays one per operation |
| `test/array-map.ts` absentLength/conversionError (~455) | No-method length still fails before invalid callback; add successful length coercion followed by callback failure and exact hook throw precedence |
| `test/property-key-conversion.ts` ForbiddenKey/ForbiddenArrayKey/callableKey (~260-290) | Replace no-read traps with traced methods and positive keys in direct ToString/ToPropertyKey and read/write/call paths; retain RHS-wins tests and add exact lookup/call throws |
| same file primitiveBases (~245), readonly, Get/Set throws | Invalid base still prevents hooks; keep all primitive-base, readonly, receiver, location and exact completion assertions |
| `test/numeric-operators.ts` hook-bearing objectSource loops (~142-158) | All 3 object kinds x 10 expressions become fixed numeric results using valueOf=6, exactly one call; add no-method/both-object failures |
| same file ObservedObject loop (~100-109) | Replace zero-read rejection with one lookup and exact sentinel propagation, retaining every expression |
| `test/addition.ts` ObservedObject loop (~124), hook-bearing loops (~159-181) | Traced lookup now propagates exact sentinel; 3 kinds x 4 expressions become 8, 8, '6x', 'x6', one valueOf call |
| `test/relational.ts` ObservedObject/ObservedArray/callable loops (~143-157), hook loops (~185-208) | Exact sentinel lookup throws; 3 kinds x 16 expressions become fixed boolean rows with valueOf=6; string 'x' numeric comparison is unordered, all false |
| operator left/right call/property throw loops in all three files | Preserve exactly; RHS throws still dominate left conversion, left throws skip RHS |
| `test/fixtures/number.js`, `test/realms.ts` Number predicates | Keep noncoercion assertions unchanged forever for isNaN/isFinite |
| `test/cases.json`, generated `tools/run-guests.mjs` coercion case | Already positive primitive addition; no remaining object-coercion rejection entry here to remove |

Direct reference callers requiring context migration are in
`test/object-descriptors.ts`, `object-prototypes.ts`, `definition-dispatch.ts`,
`array-storage.ts`, and `property-key-conversion.ts` (five files, not five calls).
Conversion-only callers are `test/conversion.ts`, `array-like.ts`, and
`property-key-conversion.ts`. Array-like production caller is only array-map;
its direct test callers are `test/array-like.ts`.

For definition/context signature migration inspect all semantic calls and host
overrides in `test/array-storage.ts`, `array-literals.ts`, `array-map.ts`,
`definition-dispatch.ts`, `object-descriptors.ts`, `object-prototypes.ts`,
`object-keys.ts`, `property-key-conversion.ts`, and `realms.ts`. Setup `.define`
also occurs in `addition.ts`, `array-like.ts`, `numeric-operators.ts`,
`relational.ts`, `operation-context.ts`, and `conversion.ts`; keep setup explicit.
Preserve override dispatch tests, full builtin parameter lists, and bootstrap
registration in `realm.ts` / `builtins/number.ts`. Do not replace assertions with
parity checks or change the suite denominator by dropping entries.

## Fixed expected-result matrix

Rows H are required for the helper batch; F rows are acceptance requirements
only for later integrations. Host subclass traces test Get abrupt plumbing,
not guest accessors. Use fixed traces and payloads, not expectations calculated
by the helper under test. Run guest method source through Rift, never host eval.

| ID | Scenario | Required result / trace |
| --- | --- | --- |
| H1 | Each current primitive with all three hints | Same Value identity, zero ticks/Get/calls; distinguish -0 and preserve raw UTF-16 |
| H2 | Ordinary number/default, first method returns 7 | `tick,Get valueOf,Call valueOf`; number 7; no second lookup |
| H3 | String hint, toString returns 'k' | `tick,Get toString,Call toString`; string 'k' |
| H4 | First method returns object, second returns 9 | Two tick/Get/Call groups in hint order; 9, no conversion of returned object |
| H5 | Missing/undefined/null/boolean/number/string/noncallable object first method | Skip Call, attempt second; second returns 9; two lookup ticks |
| H6 | Each primitive returned from either method, both hints | Accept undefined, null, both booleans, numbers incl. NaN/-0/infinities, empty/NUL/surrogate strings without fallback |
| H7 | Both methods missing, noncallable or returning objects | Located final TypeError 'cannot convert object to primitive'; exactly two lookups |
| H8 | First call replaces second method then returns object | Newly installed method returns 11; old method not called; reverse hint version too |
| H9 | First call deletes second or changes prototype | Fresh lookup observes missing or inherited replacement; failure or fixed 12 respectively |
| H10 | Own versus inherited method, ordinary/array/function input | Exact original input receiver to Get and Call, args length 0; input function itself never called |
| H11 | First/second Get and first/second Call throw sentinel | Exact record/value/diagnostic/location identity; no later tick/read/call; earlier mutation survives |
| H12 | Tick sentinel before first / second lookup | Exact sentinel; 0 / 1 lookups; no second call; no reset |
| H13 | Builtin recursively invokes helper via same context | Shared steps and calls; finite nesting returns 13; runaway reaches guest RangeError, never native overflow |
| H14 | Guest method loop and guest recursive method through test bridge | Shared active step/depth limits; call count restored to 0 on unwind |
| H15 | Builtin throws host Error / returns illegal break or continue | Host fault escapes; no guest wrapping; active call count restored, no second lookup |
| H16 | Two realms, repeated calls and method state mutation | Independent counters/methods; exact active context/realm; no shared arrays or cached method state |
| H17 | Existing operators/converters given hooks after helper addition | Existing unsupported errors and zero reads/calls remain unchanged |
| F1 | Left object valueOf=6, right=2, numeric operators | -:4, *:12, /:3, %:0; reversed -:-4, /:1/3, %:2; unary +:6, -:-6; `LRPQ` for binaries |
| F2 | Addition objects return '10' and 2 | '102', both default hints; `LRPQ`; first primitive string does not skip Q |
| F3 | Comparisons return '10' and '2' vs '10' and 2 | `< > <= >=`: true false true false vs false true false true; same `LRPQ` each |
| F4 | Any operator L/R/P/Q throws | Exact throw with trace prefix; R wins over left unsupported/no-method conversion |
| F5 | Object key returns 'x', read/write/method | `BKCG`, `BKRCS`, `BKCGAAM`; original base receiver; assigned RHS returned |
| F6 | RHS replaces base/key bindings and saved key.toString | Write original base at newly returned key; replacement base untouched; B/K each once |
| F7 | Key conversion throws or invalid base | Exact key throw skips G/S/A; base restriction prevents conversion; RHS throw dominates write conversion |
| F8 | Array length method returns 2 then 2 | Two method calls; final length 2, index 2 removed; valid -0 gives +0 |
| F9 | Array length returns 2 then 3 | RangeError, no outer shrink; any hook mutation remains |
| F10 | First length call changes second method to throw | Exact second throw; original hook side effects survive; no outer descriptor commit |
| F11 | Hook changes array length/writability/indices | Old descriptor observed after both conversions; frozen/shrink rollback rules preserved; distinguish direct Define from strict Set |
| F12 | Array-like Get returns object, hook returns 2.9 | One Get, one hook; length 2; map calls indices 0 and 1 only if present |
| F13 | Length hook throws, invalid callback also present | Exact length throw wins; callback/constructor not read or called |
| F14 | Length hook changes constructor/elements and length | Map sees changed constructor/elements; iteration uses converted saved bound, not new length |

## Proposed next implementation ownership and acceptance

After coordinator freezes this proposal, own only new
`src/primitive-conversion.ts`, `test/primitive-conversion.ts`,
`test/fixtures/primitive-conversion.js`, its one registration in
`tools/build-native.mjs` and `tools/run-guests.mjs`, scoped feature/API notes,
task handoff and `docs/validation/ts-011/`. A tsconfig edit is only needed if its
existing test glob does not include the new file. No runtime/evaluator/conversion
production edits are necessary. New driver imports the helper, Evaluator and
Realm; guest methods loaded from the fixture are invoked using the retained
Evaluator context. A host-installed test bridge enables nested guest-to-helper
calls without adding a production intrinsic.

Implement H1-H17 with readable assertions and documented stdout. Run typecheck,
runner regressions, existing probes and rebuilt Node/native suites, retaining
all 157 existing entries plus the new driver. Every native entry must pass both
static-only build and separate coverage gates (16 existing gates plus the new
driver). The helper must be statically reachable in the driver, not merely an
unused source file. Record actual counts, skips/failures and environment issues.
No compiler/pin workaround without a reduced reproducer. The new runtime module
has only one-way imports into runtime; evaluate actual compiled evidence rather
than proactively redesigning module cycles.

This design task runs no new semantic probes: existing context/call/static
mechanics are already exercised, and no uncertain compiler construct is proposed.
Implementation acceptance remains future work. Stop after committing/pushing
the design for coordinator review; do not dispatch or implement the successor.
