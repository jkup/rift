# Symbol identity and property keys (TS-019P)

Frozen proposal for coordinator review, 2026-11-02. Assigned base `9b8b81d`;
inspected checkout `4e36a69`, branch `codex/primitive-computed-keys`. Runtime
baseline is accepted TS-018B `b63d882`: coordinator measured Node/native 164/164
each and 23 static gates. This document changes no runtime and proves no compiler
support. [Evidence and inspection inventory](validation/ts-019p/README.md).

## Decision and stage boundaries

**A is the next atomic batch:** ordinary symbol primitives, identity keys through
every existing object operation, primitive conversion/error behavior, and explicit
Symbol boxing. Host bridges can supply fresh ordinary symbols to runtime-read
fixtures. No guest Symbol global, well-known identities, registry, prototype
methods, parser changes or Object toString are part of A.

**B1 follows independent acceptance:** introduce the actual shared `toPrimitive`
symbol together with its lookup/call semantics. No identity is available earlier
for semantics to ignore. Preserve `ordinaryToPrimitive` as the ordinary helper.

**B2:** install three Symbol prototype conversion methods using B1. This is a
separate, small reviewed method batch; no description accessor or constructor.

**C:** introduce the actual shared `toStringTag` identity, Symbol prototype tag,
and Object toString together, after A/B1/B2. The existing partial Array/Function/
Boolean/Number/String default-conversion exposure described in
[primitive-wrappers.md](primitive-wrappers.md) still requires coordinator approval
before C is assigned. This document freezes the symbol-specific dependency, not
permission to implement C or claim complete standard intrinsics.

Guest `Symbol(description)`, `.for`, `.keyFor`, well-known static properties,
description accessor, reflection, implicit primitive member boxing, `new`, and
other well-known protocols each need later explicit contracts. Do not install a
catalog of ignored iterator/species/match/etc. keys. An ordinary symbol described
as `Symbol.toPrimitive` or `Symbol.toStringTag` never activates a protocol.

## Semantic evidence

The normative baseline is **ECMA-262 2025, edition 16**, not the living draft:

- [Symbol values and well-known identities, 6.1.5](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-symbol-type): identity is independent of description; well-known values are shared across Realms.
- [Conversions, 7.1](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-type-conversion): distinguish primitive conversion, property-key conversion, boxing and descriptive formatting.
- [Ordinary own keys, 10.1.11.1](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinaryownpropertykeys) and [String own keys, 10.4.3.3](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-string-exotic-objects-ownpropertykeys): key categories have separate ordering rules.
- [Symbol objects, 20.4](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-symbol-objects) and [Object toString, 20.1.3.6](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-object.prototype.tostring): Symbol.prototype is an ordinary object without SymbolData; the Symbol tag comes from a property, not a builtin Symbol fallback tag.

Pinned engine comparison: engine262
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171`, fetched 2026-11-02.
[value.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/value.mts)
uses SymbolValue instances and a module-wide well-known table.
[type-conversion.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/type-conversion.mts)
keeps hook lookup separate from ordinary conversion and preserves symbol keys.
[SymbolPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/SymbolPrototype.mts)
checks the primitive/slot for extraction;
[ObjectPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ObjectPrototype.mts)
uses tag lookup after classification.
[Symbol.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/Symbol.mts)
shows factory, registry and static exposure as distinct concerns. Adopt the
identity/conversion boundaries; reject its ambient agent API, generator machinery,
casts and wholesale intrinsic registration for this batch. Its living-spec
registry placement and extra well-known entries are not authority for a future
fixed-edition registry contract. No engine source is copied.

## A interfaces, ownership and lifetime

Proposed signatures are not compiled evidence:

```ts
// symbols.ts: imports only GuestString as a type; no runtime/Realm dependency
export class GuestSymbol {
    constructor(readonly description: GuestString | undefined);
}
export function symbolDescriptiveString(symbol: GuestSymbol): GuestString;
export function formatPropertyKey(key: GuestString | GuestSymbol): GuestString;

// runtime.ts
// Add this arm to Value:
// | { kind: "symbol"; value: GuestSymbol }
export type PropertyKey = GuestString | GuestSymbol;

// primitive-objects.ts
export class GuestSymbolObject extends GuestObject {
    constructor(readonly symbolData: GuestSymbol, proto: GuestObject | null = null);
}

// Realm additions; existing constructor(output: Output) stays unchanged
readonly symbolPrototype: GuestObject;
createSymbolObject(value: GuestSymbol): GuestSymbolObject;
```

Every `new GuestSymbol(description)` allocates a fresh identity, even when the
description is absent, empty or identical to another. No host Symbol, numeric ID,
string encoding, interning, owning Realm pointer or identity counter. Class
reference equality is identity. The Value record is just a carrier: two records
holding the same GuestSymbol compare equal. Descriptions are immutable UTF-16
strings or host undefined (absence), not guest Values; absent and empty descriptions
remain distinguishable even though both descriptive renderings are `Symbol()`.
Lone surrogates/NUL remain intact. Do not add a host `toString` method to the class.

Symbols are not guest objects and have no properties/prototype/callable state.
Guest properties named `description` or `symbolData` on a wrapper cannot change
slots. Ordinary symbols are retained by Values, keys, wrappers and descriptors;
host-managed collection releases them when those references disappear. No registry
retains all fresh symbols. Description is never an identity or serialization key.
Passing a Value/key between Realms preserves the exact reference, including when
the allocating Realm becomes unreachable. Guest objects/prototypes remain local
to their allocating Realm; callable ownership is unchanged.

Bootstrap symbolPrototype after existing roots as `new GuestObject(objectPrototype)`:
noncallable, extensible, initially no own properties, mutable prototype slot.
**Do not use GuestSymbolObject for the root.** Unlike Boolean/Number/String roots,
it has no primitive payload. Factories allocate fresh GuestSymbolObject instances
linked to their Realm's symbolPrototype. Two boxes of the same symbol differ as
objects but retain identical payloads. A foreign existing object passed to
ToObject remains itself. A symbol passed to ToObject allocates in the active
context Realm, with no Get/Call/tick. Borrowed B.Object.valueOf therefore boxes in
B, including A -> C.call -> B.valueOf; finally cleanup remains the existing one.

### Well-known lifetime and agents (B1/C, not A)

Use one module-level exported readonly identity per supported protocol:

```ts
// symbols.ts, introduced only in the respective protocol batch
export const wellKnownToPrimitive = new GuestSymbol("Symbol.toPrimitive"); // B1
export const wellKnownToStringTag = new GuestSymbol("Symbol.toStringTag");   // C
```

These are immutable semantic constants, not mutable ambient Realm state. No
per-Realm table or per-Evaluator allocation; Realm constructor and OperationContext
need no new parameter. They live for the runtime module instance's lifetime.
All Realms and independently created Evaluators within it use the same identities.
If execution agents are later added within that runtime, they also use those
identities. **Independent agent is not a reason to mint different well-known
symbols.** There is no Agent implementation or guest worker transfer API today.

Independent processes/isolated module instances cannot directly compare class
references. They currently have no transfer bridge. A future bridge must explicitly
map supported well-known protocol identities to the destination's canonical
identity, and preserve ordinary identity through a separately approved transfer
protocol or reject such transfer. Never reconstruct an ordinary symbol from its
description or silently remint a well-known symbol on Realm entry. No cross-process
identity guarantee or worker support is claimed here. No fresh-symbol ownership
restriction is introduced into existing direct host-to-Realm transfers.

The later registry is mutable and is a different lifecycle problem; it must not
be hidden in these constants or added to Realm now. Freeze its fixed-spec sharing,
retention and agent-boundary rules before implementing for/keyFor. No registry
API is proposed by A/B1/B2/C.

## A property operations and conversions

Keep a single `Map<PropertyKey, DataDescriptor>` in GuestObject. Native class-key
identity and union-map behavior must pass the integrated gates before acceptance.
Do not split storage speculatively or add string prefixes as a compiler workaround.
All descriptor copies and snapshot maps retain exact symbol key/value references.
Detached containers/descriptors remain detached; symbols themselves are immutable.

Ordinary ownPropertyKeys partitions stored keys: canonical array-index strings in
ascending numeric order, other strings in insertion order, then symbols in insertion
order. Updating an existing key leaves its place; successful deletion/reinsertion
moves it to the end of its category. A failed delete/definition moves nothing.
The ordinary `properties` snapshot keeps its existing storage insertion order,
not semantic own-key order; String's override keeps own-key order. Do not silently
unify those two existing observer contracts.

arrayIndex/stringIndex keep `(key: PropertyKey, ...)` signatures and immediately
return undefined for nonstrings. No formatting/coercion. A symbol described as
`0`, `length`, `-0` or `4294967295` is an ordinary key. Array length special cases
remain guarded by exact string equality. Shrinking length skips all symbols before
descending through numeric keys; symbol properties survive truncation, including
nonconfigurable ones. String virtual indices and readonly length are unaffected;
stored symbols follow all virtual/stored string keys. Prototype/Receiver dispatch,
data-only descriptors, false-versus-throw and extensibility rules are unchanged.

ToPropertyKey calls ToPrimitive with string hint, returns a symbol payload directly,
otherwise uses the existing primitive ToString. Ordinary hooks returning symbols
therefore work in A without a well-known protocol. Primitive symbols return from
ToPrimitive unchanged and cause no tick. No special hidden wrapper unboxing.

Add symbol cases to every Value switch: truthy -> true; equal -> other is symbol
and same payload reference; sameValue inherits this identity test; display ->
symbolDescriptiveString; ToObject -> factory above. Direct ToNumber and ToString
return located runtime TypeErrors respectively `cannot convert symbol to number`
and `cannot convert symbol to string`. Uint32/IntegerOrInfinity/Length propagate
that exact completion. Direct converters still reject all objects with their
existing unsupported-object message and zero hooks. Number.isNaN/isFinite return
false without coercion. Symbol wrappers remain objects/truthy; in A ordinary
conversion fails unless explicit hooks produce a primitive. Object.valueOf still
returns a box/object, not SymbolData.

symbolDescriptiveString explicitly concatenates `Symbol(`, the stored description
or empty text, and `)`. formatPropertyKey returns strings unchanged and uses that
formatter for symbols. Use it in runtime get/set/bootstrap diagnostic messages;
never `String(key)`, `"..." + key`, join on mixed keys, guest ToString, or hooks.
Thus rejected Set of a symbol described `x` reports `property is not writable:
Symbol(x)`; same-description diagnostics may match while identities differ.
Console and uncaught-throw rendering are host diagnostics, not guest coercion.
`throw s` retains the exact symbol Value and original location. No formatting
occurs during lookup, hashing, comparison, key ordering or successful writes.

Parser literal arms remain string/number/boolean/null. No symbol literal, typeof,
delete syntax, in, loose equality, reflection or computed object-literal keys is
added. Existing computed member access can carry a bridge-supplied symbol through
Reference.key: Value. Do not convert at reference creation or change current
primitive-base rejection. Existing assignment order is base expression, key
expression, RHS, then base validation/key conversion/Set; reads and calls convert
before Get, with call arguments evaluated after Get. Preserve that bounded profile.

## B1 exact protocol boundary

Keep `toPrimitive(input, hint, context, loc): ValueCompletion` and
`ordinaryToPrimitive(input, hint, context, loc): ValueCompletion`. Ordinary helper
never checks the well-known symbol, even when called directly. B1 changes only
the object branch of toPrimitive:

1. Tick once at loc before the real-symbol lookup; propagate exhaustion unchanged.
2. Call `input.object.internalGet(wellKnownToPrimitive, input, loc)` exactly once.
3. Propagate throw unchanged. Undefined/null mean absent. Any other noncallable
   value throws TypeError `symbol toPrimitive method is not callable`; do not fall
   back or format that value.
4. Call a callable using context.call, original input receiver, and one string
   argument exactly `default`, `number` or `string`. Use existing callable Realm
   ownership, active shared budgets and finally cleanup; no new Evaluator.
5. Return any primitive result, including symbol/null/undefined. An object result
   throws TypeError `cannot convert object to primitive`, with no ordinary fallback.
6. Only absent method falls back to ordinaryToPrimitive, mapping default to number.
   Its separate ticks, fresh lookups and two-hook behavior remain unchanged.

Current internalGet is completion-aware but data-only and has no context parameter.
B1 deliberately retains that signature. Host observers may capture the active
context for throwing/reentry evidence, just as existing tests do; they are not
guest accessors. No getter/proxy semantics are claimed. Adding accessors later
requires a separately audited context-aware Get/descriptor migration for all
callers; do not retrofit it as part of A or B1.

Object conversion through B1 costs one additional lookup tick per ToPrimitive
invocation even when the hook is absent. Primitive conversion and direct
ordinaryToPrimitive retain their old tick counts. Hook call uses existing call
depth accounting; Get itself adds no extra call. Array length still makes two
complete conversions from the saved original Value; no caching the first hook or
result. Abrupt first conversion skips the second. LengthOfArrayLike still fetches
length once. Non-nullish noncallable hooks are errors, unlike ordinary noncallable
valueOf/toString, which continue to be skipped.

## B2 methods and C tag consumer

B2 adds `registerSymbolConversions(realm: Realm): void` and
`thisSymbolValue(input: Value, loc: Location): SymbolCompletion`, where
`SymbolCompletion = { type: "normal"; value: GuestSymbol } | ThrowCompletion`.
The helper accepts a symbol primitive or GuestSymbolObject slot independent of
prototype/Realm, otherwise throws TypeError `receiver is not a symbol` at loc.
Symbol.prototype itself and objects merely inheriting from it fail.

Install Symbol.prototype.valueOf (name valueOf, length 0) returning a symbol Value,
toString (name toString, length 0) returning the descriptive string, and
[wellKnownToPrimitive] (name `[Symbol.toPrimitive]`, length 1) returning a symbol
Value while ignoring the hint/extra args. First two properties W/E/C T/F/T; symbol
hook F/F/T; all function metadata F/F/T, functions owned by the defining Realm and
linked to its functionPrototype. Use createBuiltin plus bootstrapDefine for the
symbol-keyed method; registerBuiltin's string name parameter need not widen.
No accessor, constructor back-link or tag yet. A boxed symbol now converts to its
payload for every hint; ToPropertyKey(box) preserves identity; implicit string/
number conversion rejects. Explicit prototype toString succeeds. Deleting the
hook exposes ordinary methods in their usual order; do not hard-code unboxing.

C adds `registerObjectToString(realm: Realm): void`, Object prototype method name
toString/length 0/WEC T/F/T, and symbolPrototype[wellKnownToStringTag] = `Symbol`
with WEC F/F/T. Null/undefined special cases return immediately without ToObject,
lookup or lookup tick. Otherwise ToObject in the defining Realm, compute builtin
tag, tick once, Get actual symbol once with the boxed object as Receiver, propagate
throw, use a string result verbatim (including empty), otherwise builtin fallback
without conversion. Existing tags are in primitive-wrappers.md.

**Newly representable Symbol objects have builtin fallback `Object`, not `Symbol`.**
The inherited real tag supplies `Symbol`. Deleting/changing the tag, relinking a
box to null, or giving it a nonstring own tag demonstrates the distinction.
Symbol.prototype has the tag but no SymbolData. An ordinary object inheriting
that prototype can display `[object Symbol]` yet cannot pass thisSymbolValue.
Prototype identity is never a slot test. B2 must precede C to avoid accidentally
turning default Symbol-wrapper coercion into an inherited Object string.

Guest Symbol factory/global remains separate: future internal creation takes a
typed description, whereas the guest factory must evaluate/convert description
with observable effects (undefined is absent), allocate fresh identity, reject
construction, and freeze metadata/global policy. Static well-known properties
may be exposed only after their consumers are supported. Full standard Symbol
surface cannot be claimed without registry/accessor/protocol follow-ups.

## Exhaustive production migration inventory

Line/function references below refer to `4e36a69`; repeat the searches recorded in
the evidence note at implementation time. No Value switch may rely on fallthrough.

| Area | A change or explicit no-change audit | B1/B2/C dependency |
| --- | --- | --- |
| runtime.ts Value/PropertyKey; storage, descriptors, properties, getOwnProperty, define/bootstrap/ordinaryDefine, internalDelete | Add identity union; retain key references, copy containers/descriptors | No accessor expansion |
| runtime.ts ownPropertyKeys | Three categories, symbols last | No reflection builtin |
| runtime.ts Get/Has/Set, get/set/bootstrapDefine | Preserve prototype/Receiver identity, false/throw; format all three key diagnostics explicitly | Get signature stays data-only |
| runtime.ts Reference/getValue/putValue | Value key and resulting PropertyKey already flow correctly; no eager coercion or primitive boxing | B1 conversion naturally reaches new hook |
| runtime.ts truthy/display/equal (three Value switches), sameValue | Add symbol arms; numeric NaN/-0 behavior unchanged | Display never delegates to methods |
| conversion.ts toNumber/toString (two Value switches), toPropertyKey | Reject symbols for numeric/string conversion; preserve symbols as keys | Direct object rejection stays; no recursive converter expansion |
| conversion.ts Uint32/IntegerOrInfinity/Length and numeric formatting/parsing | Propagate symbol errors; backend arguments stay typed scalars | Existing two array conversions unchanged |
| object-conversion.ts toObject (sixth Value switch) | Add Symbol boxing | Active defining Realm remains authoritative |
| property-keys.ts arrayIndex/stringIndex | Guard nonstring before length/char/numeric parsing | No description-based indexing |
| primitive-objects.ts String get/define/bootstrap/delete/keys/snapshot; new Symbol class | Symbol keys use ordinary path; symbol payload immutable | Root lacks payload; B2 slot methods |
| array-object.ts define/bootstrap/length shrink | Exact string length; index filter skips symbols; symbol length values reject before mutation | B1 adds lookup per object conversion, never caches |
| primitive-conversion.ts primitive/object guards, ordinary result check | Symbol results are primitives; ordinary helper otherwise unchanged | B1 real-symbol GetMethod behavior |
| realm.ts roots/factories, createBuiltin/registerBuiltin/console | Add unboxed Symbol root and wrapper factory; console uses display; metadata names stay strings | B2/C registration only at later stages |
| evaluator.ts statement/expression switches | AST switches, not Value switches: no new syntax arm; bridge Values flow through bindings/args/returns/throws | No new evaluator/context |
| evaluator.ts unary/binary/call/reference | Truthiness/equality and conversion helpers cover symbols; preserve operation-specific ordering below | Same budgets/Realm restoration |
| array-like.ts, array-map.ts | String length/index/constructor keys stay strings; symbol length errors; callback symbols not callable; symbol elements preserved | No species exposure or new boxing |
| builtins/number.ts | Predicates stay kind-guarded and false on symbols/boxes | No Number conversion constructor |
| builtins/function.ts, builtins/object.ts | call forwards exact symbols; Object.valueOf gets boxing through ToObject | No hidden extraction |
| cli.ts, interpreter.ts | display covers symbol uncaught values, run unchanged | No JSON serialization scheme |
| syntax.ts, parser.ts, lexer.ts, strings.ts | Grammar/names/backend strings remain strings; no PropertyKey widening for environment identifiers or AST object keys | typeof/delete/computed literal syntax still unsupported |

## Expected results: A (requirements, not measurements)

Let s/t be separately created symbols described `x`, v/v2 two Value records
containing s, and n a symbol described `0`. All errors are runtime TypeError at
the supplied loc unless a row specifies an existing earlier error. Host bridge
setup is allowed; fixtures must be parsed at runtime by Rift in both lanes.

| ID | Action | Exact expected result/invariant |
| --- | --- | --- |
| A1 | equal/SameValue(v,v2), v versus t, v versus string `Symbol(x)` | true, false, false; no conversion/ticks |
| A2 | absent/empty/equal descriptions; transport s through two Realms and separate Evaluators | fresh allocations distinct; transported payload identical; no Realm-owned symbol copy |
| A3 | define strings `Symbol(x)`, `@@x`, and s,t on one object | four distinct properties; updating s does not alter any other |
| A4 | insert s, `z`, `10`, t, `2`, `01`, `4294967295`; update s | keys [`2`,`10`,`z`,`01`,`4294967295`,s,t]; update unchanged |
| A5 | delete/reinsert s and z; failed delete nonconfigurable t | keys [`2`,`10`,`01`,`4294967295`,`z`,t,s]; failed delete no movement |
| A6 | readonly nonconfigurable property s holds v; define v2 versus t | same identity accepted; distinct rejected atomically; Set false even same value |
| A7 | mutate detached descriptor/keys/snapshot; use same s on another object | storage unaffected; key payload remains s; objects independent |
| A8 | prototype has s=undefined or readonly s; child Has/Get/Set/delete own absent s | presence true, undefined read; readonly Set false; delete own absent true; no inherited deletion; direct child definition can shadow |
| A9 | distinct Receiver with writable s and inherited readonly s | inherited descriptor blocks Set, Receiver unchanged; normal writable path writes exact s |
| A10 | array n and symbol `length`, then shrink string length | symbols do not extend/block length; survive shrink; numeric elements delete/rollback as before |
| A11 | box `ab`; add n,s, string `2`, z | keys [`0`,`1`,`2`,`length`,`z`,n,s]; virtual 0 stays `a`; symbol descriptors ordinary |
| A12 | arrayIndex/stringIndex on n, s; String virtual definition/delete, preventExtensions | symbol indices undefined; ordinary symbol rules; existing virtual readonly behavior retained |
| A13 | ToPropertyKey(v); ordinary string-hint hook returns v; both hooks return objects | s without formatting; s after existing hook order; old cannot-convert error unchanged |
| A14 | ToNumber/ToString(v), Uint32/IntegerOrInfinity/Length(v) | exact new messages; no hooks/ticks; numeric derivatives propagate original completion |
| A15 | truthy(v), !v, v && t, v || t, v ? 1 : 2; predicates | true,false,t,v,1; Number predicates false |
| A16 | ToObject(v) twice in B, existing foreign box/object, null/undefined | fresh boxes -> B root with s payload; existing object identical; nullish old located error |
| A17 | Symbol root versus boxes/relinked box/prototype lookalike | root no slot/own keys []; boxes slot survives relink; lookalike no slot; each Realm root distinct |
| A18 | borrowed B Object.valueOf through C.call with symbol receiver in A | box in B, s preserved; active Realm restores C then A on normal/throw/host fault; limits shared |
| A19 | direct converters on box, default ordinary conversion in A | existing object-unsupported errors/zero hooks for direct converters; ordinary conversion final cannot-convert error unless explicit hooks |
| A20 | display(v), rejected Set(s), bootstrap invalid definition, throw v | `Symbol(x)`; explicit diagnostic key text; host invariant message same prefix plus `Symbol(x)`; exact thrown payload/location |
| A21 | object[s] read/write/member call and detached call | exact key; member receiver original object; detached receiver undefined; existing base/key/RHS/Get/argument order |
| A22 | primitive/null base with key hook, assignment RHS effect | existing base rejection before key coercion; RHS effect still precedes assignment rejection; no implicit boxing |
| A23 | symbol as array length / array-like length / map callback or element | length TypeError before storage/callback validation; invalid callback old callable error after length; element passes through unchanged |
| A24 | A exposes symbols only via host bridge | no Symbol global, well-known constants, registry or extra prototype methods; previous negative fixtures remain negative |

Operation-specific order (capture operand evaluations before these conversions):

| ID | Expression supplied bridge values/hooks | Expected result/trace |
| --- | --- | --- |
| O1 | s + object returning string | RHS primitive hook runs before ToString(s) error; no concatenation |
| O2 | s - object with observable conversion (also *, /, %) | left ToNumber error; RHS expression ran but its conversion did not |
| O3 | s < object returning number (also >, <=, >=) | RHS primitive conversion runs before symbol numeric rejection; source order preserved |
| O4 | RHS expression throws sentinel in any binary expression | exact RHS throw before either operand conversion |
| O5 | object key hook returns s; read / assignment / call; hook throws sentinel | string hint, no stringification; exact Get/Set key; abrupt skips Get/Set and call arguments, assignment RHS already ran |
| O6 | array length object returns symbol on first versus second conversion | first numeric rejection skips second; second rejection preserves hook effects but performs no storage commit; no cached result |

## Expected results: later protocol batches

| ID | Stage/action | Expected result |
| --- | --- | --- |
| P1 | B1 same wellKnownToPrimitive imported by all Realms/Evaluators | same identity; ordinary same-description symbol/string `@@toPrimitive` never matches |
| P2 | own/inherited callable hook, hints default/number/string | tick, Get(real key), Call(original receiver,[exact hint]); primitive returned unchanged; no ordinary lookups |
| P3 | absent/undefined/null hook | one lookup tick then unchanged ordinary sequence; default maps to number only for fallback |
| P4 | false/0/string/noncallable object hook; callable returning object | first noncallable message or final cannot-convert message respectively; zero ordinary fallback |
| P5 | Get/call throws sentinel; first tick exhausted | exact throw/location; tick exhaustion prevents Get; no subsequent hooks |
| P6 | B hook reenters C then returns symbol, succeeds or throws/host faults | B/C/B then caller restoration; shared monotonic steps/call depth; no stale cached Realm |
| P7 | ordinaryToPrimitive called directly on object with exotic hook | never reads exotic hook; existing ordinary trace/ticks |
| P8 | first array length hook replaces itself before second conversion | second lookup observes replacement; first failure skips it; old length read after conversions |
| P9 | recursive exotic hook, exhausted call budget, absent-hook tight step limit | existing located limits, cleanup permits later bounded calls; extra lookup tick is charged, not hidden |
| P10 | B2 methods borrowed across Realms; root/lookalike as receiver | primitive/real box payload accepted; root/lookalike exact receiver error; no prototype-based slot inference |
| P11 | B2 boxed s default/string/number conversion, explicit toString, delete hook | s for all hints; descriptive string for explicit method; after deletion ordinary order observes current methods |
| T1 | C borrowed Object toString undefined/null | `[object Undefined]` / `[object Null]`, zero tag lookups/ticks/boxing |
| T2 | ordinary object with own/inherited real tag `Custom` or empty | `[object Custom]` / `[object ]`; Get once after classification |
| T3 | string `@@toStringTag`, `Symbol.toStringTag`, or distinct same-description symbol | no effect; ordinary fallback `[object Object]` |
| T4 | nonstring tag incl symbol/object with throwing conversion hooks | fallback; no conversion hooks called |
| T5 | primitive s/box/root with intact Symbol prototype tag; tag deleted or box relinked null | `[object Symbol]`; then `[object Object]` when no string tag; not a Symbol builtin fallback |
| T6 | B method boxes primitive s from A; B root custom tag versus existing A box | fresh box uses B tag; existing A box retains A tag; no identity remapping |
| T7 | tag Get throws/reenters; lookup tick exhausted | exact completion/cleanup; tick failure prevents Get; nullish fast paths unaffected |
| T8 | C default object conversion and prior negatives | apply primitive-wrappers C matrix exactly; explicit both-object/null-root negatives retained; Symbol wrapper stays governed by B2 |

## Caller/fixture scope and smallest next assignment

A owns new src/symbols.ts and scoped edits to runtime.ts, conversion.ts,
property-keys.ts, primitive-objects.ts, object-conversion.ts, realm.ts. Audit
array-object/primitive-conversion/evaluator even if their existing control flow
requires no executable edit. Do not move conversion earlier to simplify tests.

Extend existing compiled drivers rather than adding a 24th gate just for a new
driver. Use test/object-keys.ts for A1-A5/A7/A10-A12; object-descriptors.ts for A6;
object-prototypes.ts/definition-dispatch.ts for A8/A9; conversion.ts and
property-key-conversion.ts for A13-A15/A20-A22; realms.ts/object-valueof.ts for
A2/A16-A19; array-length-coercion.ts, array-like.ts, array-map.ts for A23/O6;
addition.ts/numeric-operators.ts/relational.ts for O1-O4. Runtime-read fixtures
for these drivers may receive bridge symbols and extend expected assertions.
Preserve all 164 existing entries and all 23 gates; no denominator reduction,
manifest churn or compiler pin change is necessary. A24 also checks exact original
O/F/A/B/N/String keys and the new empty Symbol root.

Required test API migration, even where the TypeScript method variance checker
would allow narrower overrides:

- Widen key-taking overrides from string to PropertyKey in array-like.ts,
  array-length-coercion.ts (including getOwnProperty), array-map.ts (Get/Has),
  function-call.ts, key-coercion.ts, length-coercion.ts, object-valueof.ts,
  operator-coercion.ts, primitive-conversion.ts, property-key-conversion.ts
  (Get/set/get), and realms.ts. Already-wide overrides in addition.ts,
  array-storage.ts, numeric-operators.ts and relational.ts remain wide.
- Observer traces explicitly use formatPropertyKey; identity assertions compare
  raw keys separately. Existing string-only put/read/binding helpers may stay
  string when genuinely restricted. Widen helpers used by new symbol cases.
- Change object-keys.ts's `list(actual: string[], expected: string[], label)`
  helper to accept PropertyKey arrays and compare entries directly. It receives
  ownPropertyKeys even in existing string-only cases; leaving it narrow would
  fail typechecking. Include definition-dispatch.ts's already-wide definition
  and bootstrap overrides in the preserved dispatch audit.
- Audit ownPropertyKeys/properties joins in array-length-coercion.ts,
  array-literals.ts, array-storage.ts, object-keys.ts, object-descriptors.ts,
  object-valueof.ts and realms.ts. Retain old string-only expectations only with
  an explicit all-string assertion; mixed-key cases compare length and each key
  by identity. Never hide distinct symbols behind equal rendered descriptions.
- Preserve tests in operation-context.ts, function-call.ts, definition-dispatch.ts,
  operator-coercion.ts and all existing direct-converter/object negatives. The
  new value kind is no reason to replace null-root fixtures or weaken observers.

B1 later audits every ToPrimitive consumer: key/property-key/primitive conversion,
length/array-length coercion, array-like/map, numeric/addition/relational/operator
coercion, object-valueof and Realm tests. Expected trace changes add precisely the
leading real-symbol Get/tick for each object ToPrimitive, not direct ordinary
helper calls. Recalculate exact tight budgets from the actual path and preserve
original failure intent. Generic throwing observers still throw on the first Get;
observers testing ordinary methods must explicitly return undefined for the new
key. Add independent exotic-hook negatives rather than erasing old negatives.
B2/C separately update root/method metadata expectations and the existing
primitive-wrappers migration inventory; no C positive coercion result belongs in A.

For A acceptance run typecheck, runner20, probes10, rebuilt Node and native guest
lanes, static-only build **and separate coverage parsing** for all 23 targets.
Measure union Map keys, subclass dispatch through GuestObject, readonly payload
and cross-module class reachability in the integrated build. Preserve conversion.ts's
accepted side-effect import and TS-018A/B test callback annotation workarounds.
Do not preemptively add imports/casts or relax signatures to any. If a genuine
compiler failure appears, retain failing and reduced two-lane/static evidence
before choosing a local workaround. No new probe was needed for this design:
existing isolated map evidence supports trying this representation, not declaring
the integrated program supported. No production implementation, compiler success,
performance measurement, corpus research or successor assignment is delivered here.

## B1 implementation status (2026-11-02)

B1 is implemented for coordinator review. The canonical identity and protocol
follow the frozen boundary above; P1-P9 and consumer/observer/budget migrations
are recorded in [TS-019B1 evidence](validation/ts-019b1/README.md).
This does not assign or implement B2 or C.
