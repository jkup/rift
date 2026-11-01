# Array length definition and operation context

TS-015P design for review, 2026-11-01. Audited checkout
`f2fde9c6a4c29a720c3f2847b0d223c03dc158cd` on
`codex/primitive-computed-keys`; TS-014 final `d477b86` is accepted.
Paths below are relative to `typescript/`. This document authorizes no runtime
work. It completes the deferred definition boundary in
[object-coercion-integration.md](object-coercion-integration.md).

## Recommendation and review boundaries

Use required context on semantic Set/Define, and an explicitly named, validated
bootstrap entry that cannot request guest conversion. Remove ambiguous `define`.
Share ordinary descriptor validation and the array storage algorithm between the
two entries; do not expose raw property storage.

Recommend **two separately reviewed implementation batches**:

1. **Context/bootstrap plumbing**: migrate all callers and overrides atomically,
   extract the shared validated storage operations, keep semantic array length
   conversion primitive-only, and prove dispatch/context/bootstrap invariants.
2. **Effectful array length**: only after acceptance of (1), add two explicit
   number-hint conversions in semantic `setLength`, migrate the superseded
   object-length assertions and implement the effect matrix below.

Batch 1 is the smallest coherent next contract: changing a virtual signature
without its bootstrap split and all consumers leaves an unusable intermediate
API. Separating batch 2 makes descriptor refactoring reviewable before reentrant
guest execution is enabled. Neither batch requires global converter migration.

| Alternative | Assessment |
| --- | --- |
| Optional context, fake evaluator, or ambient current evaluator | Reject: silently changes semantics, budgets, or realm selection |
| Bootstrap calls semantic Define with a context whose call throws | Reject: bootstrap still enters guest lookup/tick machinery and requires fake semantic state |
| Separate unchecked bootstrap map writes | Reject: can violate frozen descriptors and array length/index invariants |
| Duplicate complete array algorithms | Reject: shrink/rollback fixes could diverge |
| Two named entries sharing validated storage | Recommend: modest explicit split with one descriptor validator and one shrink algorithm |
| One combined plumbing/coercion batch | Coherent, but larger review surface; no prerequisite forces combining them |

## Sources inspected

The living [ArraySetLength](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arraysetlength)
algorithm copies the descriptor, performs ToUint32 then ToNumber, compares, and
only then observes old length. Its descending own-index deletion and delayed
freeze govern the storage phase. [Array DefineOwnProperty](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-array-exotic-objects-defineownproperty-p-desc)
and [ArrayCreate](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arraycreate)
justify separate validated ordinary initialization of the first length slot.
[OrdinarySetWithOwnDescriptor](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinarysetwithowndescriptor)
rejects readonly descriptors before receiver definition; successful writes must
dispatch through the receiver's definition operation.
[OrdinaryDefineOwnProperty](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinarydefineownproperty)
and its validation algorithm remain the model for ordinary storage. Inspected
2026-11-01; these are living anchors, not a pinned specification revision.

Engine cross-check: engine262 revision
[`d553e7b52501fbc47eae981c8d0fa7a5c26d0171`, array-objects.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/array-objects.mts),
`InternalMethods.DefineOwnProperty`, `ArrayCreate`, and `ArraySetLength`.
It independently invokes both conversions, observes old length afterward,
collects present indices in descending order, restores failed-index-plus-one,
and initializes the first length through ordinary validated definition. Adopt
those algorithm boundaries, not its generator/ambient-agent machinery. Its
descriptor reconstruction does not establish a contract for mutable host-owned
records in Rift. No code copied. A guessed `ordinary-objects.mts` path returned
404; no conclusion relies on that fetch. Ordinary Set/Define were inspected in
the specification and Rift source.

## Exact semantic API

Keep the existing completion types, PropertyKey=GuestString and Value union.
These declarations belong to `GuestObject`; `GuestArray` and host observers
override with the identical signatures:

```ts
defineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate,
    context: OperationContext, loc: Location): InternalBooleanCompletion;
internalSet(key: PropertyKey, value: Value, receiver: Value,
    context: OperationContext, loc: Location): InternalBooleanCompletion;
set(key: PropertyKey, value: Value,
    context: OperationContext, loc: Location): Completion;
// GuestArray only
private setLength(desc: DataDescriptorUpdate,
    context: OperationContext, loc: Location): InternalBooleanCompletion;
```

`putValue(ref, value, context, loc)` already has the right signature; forward
that exact context into `base.object.set`. `set` forwards it into `internalSet`;
both existing/new receiver-property branches call
`receiver.object.defineOwnProperty(..., context, loc)`. Retain original receiver,
RHS Value and source location, including inherited descriptor traversal. The
existing data-only iterative prototype walk stays; this is not general exotic
prototype dispatch support. Never substitute a base definition call for receiver
virtual dispatch. Preserve false versus throw: internal false is normal(false),
strict Set translates false to its located TypeError, and throws propagate by
record identity. Success returns the original RHS, not normalized length.

Ordinary Define accepts context but neither ticks nor converts stored values.
Object-valued ordinary `length`, array elements and callable metadata remain
ordinary data. Get/Has/Delete, reference shapes, evaluator call signatures,
array-like, operator and computed-key conversion APIs need no redesign.

## Bootstrap API and shared implementation

Replace `define` with this public trusted setup entry; descriptor form supports
partial numeric length updates without accidentally supplying forbidden flags:

```ts
bootstrapDefine(key: PropertyKey, desc: DataDescriptorUpdate): void;
// GuestObject: protected virtual setup dispatch; GuestArray overrides it.
protected bootstrapDefineOwnProperty(key: PropertyKey,
    desc: DataDescriptorUpdate, loc: Location): InternalBooleanCompletion;
// GuestObject: extracted current validation/commit body; no context or coercion.
protected ordinaryDefineOwnProperty(key: PropertyKey,
    desc: DataDescriptorUpdate): BooleanCompletion;
// GuestArray: shared non-length branch (index growth included).
private defineArrayProperty(key: PropertyKey, desc: DataDescriptorUpdate,
    loc: Location): InternalBooleanCompletion;
// GuestArray: shared storage phase, desc.value absent or normalized uint32 Number.
private applyLengthDescriptor(desc: DataDescriptorUpdate,
    loc: Location): InternalBooleanCompletion;
```

`bootstrapDefine` calls the protected bootstrap operation at synthetic 1:1 and
checks its completion. False or throw becomes a host initialization Error; no
result is ignored. The protected bootstrap implementations must not call
`defineOwnProperty`, `toPrimitive`, context.call/tick, or guest getters. Ordinary
setup delegates to `ordinaryDefineOwnProperty`. The array override routes
non-length keys to `defineArrayProperty`. For length it copies the descriptor;
an object-valued length is a host invariant fault **before any hook lookup or
storage mutation**. For primitive values it applies existing primitive ToUint32
and ToNumber, compares them, normalizes to +0/uint32, then delegates to
`applyLengthDescriptor`. Invalid primitives produce a completion consumed as a
host fault by `bootstrapDefine`; this does not become a semantic guest error.
Absent value goes directly to the shared descriptor phase. Object values on
other properties are allowed without inspection or conversion.

`GuestArray` constructor calls `super.ordinaryDefineOwnProperty` once with
length +0, writable true, enumerable/configurable false, and asserts success.
It never dispatches a subclass method while constructing, never invents a
context, and never uses the existing-array length path before its invariant
exists. `ordinaryDefineOwnProperty` retains private storage and complete
validation. It is an implementation primitive, not an external public bypass;
array internal calls use `super.ordinaryDefineOwnProperty` explicitly. No
consumer may invoke it to skip array invariants. `defineArrayProperty` uses it
for ordinary/index definitions and checked length growth; `applyLengthDescriptor`
uses it for length commits/restoration. Existing internal invariant failures
remain host faults. `getOwnProperty`, keys and deletion retain the current
trusted data-only behavior; hostile host subclasses are not a security boundary.

For a host subclass overriding only semantic Define, setup deliberately does
**not** invoke that override. It inherits ordinary or array bootstrap rules.
A bootstrap observer may override the protected bootstrap method, but its
contract prohibits guest execution and requires forwarding validation on
success. False/throw bootstrap observers test wrapper fault translation.
Semantic observer tests must call semantic Define/Set with a retained evaluator
context. Do not retain a `define` alias with different behavior by call site.

Batch 1 `setLength` still copies and performs the two primitive conversions,
then shares `applyLengthDescriptor`; context is required but unused there until
batch 2. Both phases share the entire storage algorithm, not a duplicate shrink
implementation. Numeric bootstrap updates still reject index growth at frozen
length, preserve nonextensibility, normalize -0, delete descending own indices,
and restore partial failures. Bootstrap failure may have partial deletion
effects, just as validated primitive length definition does; it is not a
transaction promising rollback of all deletions.

## Frozen effectful length order (batch 2)

`setLength` snapshots all four descriptor fields at entry into a local update
record and saves the original `Value`. Optional fields retain absent versus
false/guest undefined. Runtime never mutates the caller's descriptor. Host
descriptors must be plain engine-owned records, with no getters or concurrent
mutation during an operation; violating that is outside the public semantic
contract. Nevertheless use only the snapshot and saved Value after hooks, so a
host callback replacing `desc.value` cannot redirect conversion two. Guest
mutation of the saved object's properties is supported and observable. Copying
a Value does not clone that object. No deep freeze or host reflection is added.

If value is absent, ordinary validated definition runs with no conversion. If
present, execute these stages, each returning an abrupt record unchanged:

```text
savedValue = copied descriptor.value
first = toPrimitive(savedValue, "number", context, loc)
newLength = toUint32(first.value, loc)
second = toPrimitive(savedValue, "number", context, loc)
numberLength = toNumber(second.value, loc)
compare newLength and numberLength using numeric equality
updated.value = Number(newLength)
applyLengthDescriptor(updated, loc)
```

The numeric equality is SameValueZero here because newLength is finite and
nonnegative: NaN on the second side fails and either zero sign compares equal.
Do not reuse `first`, cache either method, or reject NaN/infinity/fractions
before conversion two. ToUint32 maps those first-stage numeric inputs before
the second result is compared: a hook returning 2.9 then 2 succeeds at length 2;
a hook returning 2 then 2.9 fails. A constant fractional/infinite/NaN result
fails after both conversions. Direct primitive converter signatures stay as-is.
Each helper invocation follows the accepted number hint (`valueOf`, then
`toString` fallback), lookup ticks, original receiver, zero args and active
budgets. Missing/both-object methods give the helper's located TypeError.

`applyLengthDescriptor` reads the **post-conversion** old length descriptor.
There must be no earlier array old-length read inside direct semantic length
definition. Set's earlier readonly checks are separate and intentional.
For new length >= old length, perform ordinary validated update (including
same-value frozen success if flags permit). For shrinking a frozen length,
return false. For writable shrink, postpone requested writable=false, validate
the temporary shortened descriptor, then delete present own indices descending.
Failed descriptor validation deletes nothing. Inherited/nonindex keys survive.
On a nonconfigurable index k, retain earlier deletions, restore length k+1,
apply requested freezing, and return false. On success, apply delayed freezing.
Use present sparse keys, never a loop over billions of absent indices. No guest
execution occurs during this data-only storage phase; throwing host deletion
overrides remain invariant faults, not new accessor/proxy semantics.

A first hook can change the second method, length, writable flag or indices;
the second invocation sees those changes. A second throw/mismatch leaves all
hook effects intact but performs no outer length write or deletion. Reentrancy
uses the same context; do not lock the array or cache its pre-hook descriptor.
A hook freezing length to the requested number permits a direct same-value
definition with absent writable; a different requested length fails. An outer
strict Set whose length was already readonly never reaches either hook, even
for invalid numbers. Direct Define on that array converts before accepting or
rejecting and can throw RangeError or the exact hook throw first.

## Complete migration inventory at the audited base

The retained [line-level inventory](validation/ts-015p/caller-inventory.txt)
includes false positives for host Map.set; those are explicitly excluded. Search
all `src/` and `test/` again at implementation time. Historical `probes/objects.ts`
has a separate toy class and is not a consumer of these runtime methods.

| Production site | Batch 1 change |
| --- | --- |
| `runtime.ts` GuestObject definitions and Set chain | Required context signatures; both receiver Define branches forward it; extract ordinary validation; replace define with bootstrap API |
| `runtime.ts:putValue` | Forward its existing context into set |
| `array-object.ts` constructor, override, setLength and all super definitions | Constructor validated ordinary initialization; separate semantic/bootstrap entries; shared array property/storage phases |
| `evaluator.ts` array literal element/final length | Pass `this.context`, retain throw propagation and false invariant checks |
| `evaluator.ts` object literal | Replace define with semantic full-descriptor Define at `expr.loc`, pass `this.context`, return exact throw, assert false impossible for fresh ordinary object; retain element evaluation order |
| `array-map.ts` result length and each mapped index | Pass existing context; preserve allocation/check order and all completion checks (numeric fresh-length failure remains invariant fault) |
| `realm.ts:registerBuiltin` | Bootstrap full descriptor writable=true/enumerable=false/configurable=true; Builtin signature unchanged |
| `builtins/number.ts` eight constants, predicate name/length | Bootstrap with identical full flags; namespace registration unchanged |

| Direct semantic test consumers | Migration and retained purpose |
| --- | --- |
| `array-storage.ts` element/defineLength helpers, internalSet/set/direct Define | Supply retained evaluator context deliberately; keep descriptor/receiver/rollback and caller-record assertions |
| `array-like.ts` direct array Define at line 48 | Pass existing deliberate context; all LengthOfArrayLike behavior unchanged |
| `object-descriptors.ts` direct Define/set and frozen loops | Pass retained context; keep SameValue/flags/extensibility/detached snapshots |
| `object-prototypes.ts` internalSet and freeze Define | Forward retained context, original receivers and inherited readonly expectations |
| `object-keys.ts` overwrite/reinsertion Define | Pass context; ordering/deletion unchanged |
| `definition-dispatch.ts` DefinitionObject override, internalSet/set/putValue | Add/record/forward context identity; keep every own/new, success/false/throw path and strict translation |
| `realms.ts` target/namespace/predicate sets | Use contexts belonging to each tested Realm; check currently ignored `ap.object.set("realmMarker", ...)` result explicitly |
| `property-key-conversion.ts` observed set override | Add context, record identity and forward to super; preserve exact Set sentinel and key ordering |
| `key-coercion.ts` observed set override | Same required context forwarding, exact sentinel and source location |
| `length-coercion.ts` storage set/Define boundary block | Pass retained context in batch 1; effectful expectation migration only in batch 2 |

There are no other semantic Define/Set overrides in `src/` or `test/`: the array
Define override, DefinitionObject Define override, and the two set observers
above are exhaustive at this base. No internalSet override exists. Get observers
retain their signatures; setup must not trigger their semantic hooks.

Every current `.define(...)` setup in the following files becomes
`bootstrapDefine(key, { value, writable, enumerable, configurable })`, preserving
flags and checking setup failure through its void wrapper:

- `test/array-like.ts`, `array-map.ts` (local `put` helper), `array-storage.ts`.
- `test/conversion.ts`, `definition-dispatch.ts`, `object-descriptors.ts`,
  `object-keys.ts` (local `add`), `object-prototypes.ts`, `realms.ts`.
- `test/primitive-conversion.ts` (local `define`), `operator-coercion.ts`,
  `key-coercion.ts`, `length-coercion.ts` (local `put`),
  `property-key-conversion.ts` (including observer constructor/method setup).

Method installation by host callbacks in these helpers remains explicit trusted
setup of ordinary data properties, even while a test is executing. Any test
intending semantic array length effects must instead use semantic Define and
the callback's context, checking its completion. `addition.ts`,
`numeric-operators.ts`, `relational.ts`, `operation-context.ts` and
`array-literals.ts` have no direct affected method calls now; their Realm builtin
registration flows through the migrated implementation. Host bindings and
descriptor snapshot Map.set calls are not GuestObject.set calls.

`definition-dispatch.ts` final two bootstrap false/throw modes currently observe
semantic Define dispatch. Preserve their assertion count and purpose by moving
them to a dedicated protected-bootstrap observer; assert synthetic 1:1, exactly
one bootstrap dispatch, host fault and absent property. Add an explicit check
that bootstrap on DefinitionObject does not call its semantic override, and
retain semantic false/throw identity assertions through context-bearing calls.
`object-descriptors.ts` nonextensible bootstrap host-fault test stays a rejection.

## Superseded rejection assertions (batch 2 only)

| Existing location | Required positive or exact-abrupt replacement |
| --- | --- |
| `array-storage.ts:110-120`, coercible/unsupported block | Replace host-crashing method with counting return-2 method; two conversions, normal(true), length 2 and delayed freeze false, index 2 removed; retain descriptor-copy assertion. Add separate no-method/both-object negatives |
| `array-storage.ts:129`, frozen internalSet with coercible | Still false with zero hooks; use separate/reset count from positive definition |
| `array-storage.ts` guest assignment mode `object` (~189 onward) | Two hook calls, success, original RHS identity, `rhs` then `after` output and length 2; preserve other invalid/readonly/partial modes and their expected errors |
| `length-coercion.ts:312-315` hook-bearing storage set/Define | Explicitly set that fixture's `returned` binding to 2 (its default is 2.9) before the storage calls. Each then succeeds with two calls (four total across both); assert numeric storage and RHS identity. Preserve a separate constant-2.9 RangeError case with two calls. Assert zero hooks for direct primitive converters separately before semantic calls |
| `length-coercion.ts:329-330` ForbiddenHooks storage calls | Each returns the exact sentinel with one Get; total two reads. Keep primitive converter zero-read assertions isolated before these operations |

Direct `conversion.ts` object rejection, `primitive-conversion.ts` H17 direct
numeric/string boundaries, and `property-key-conversion.ts` direct ToString
negative remain unchanged. Already supported array-like/operator/key behavior
needs no semantic change; setup rename is mechanical. Do not contaminate their
zero-hook counters with newly supported array storage operations. Retain every
existing suite entry, expression count and assertion purpose.

## Fixed acceptance matrix

Use runtime-read parsed guest assignments/methods plus explicit direct Define
host cases (guest reflection is not implemented). Host bridges use the active
context; no host eval/Function/vm. Synthetic subclasses observe internal calls,
not guest accessors or proxies. Expectations are fixed, not computed by Rift.

| ID | Scenario | Required result |
| --- | --- | --- |
| P1 | Semantic ordinary Define/Set via own/new/inherited receiver | Same context/location identity at override, stored object RHS identity, no coercion; exact false/throw behavior |
| P2 | Bootstrap ordinary frozen/nonextensible, array frozen/index growth and primitive lengths | Same validation as semantic primitive definitions; host fault on failure, zero hooks; numeric length never object |
| P3 | Array construction and subclass setup | Initial +0/true/false/false descriptor; no premature subclass dispatch; semantic override excluded from bootstrap |
| P4 | Bootstrap object length with throwing Get observer | Host fault, zero reads/calls, no storage change; ordinary object-valued length and array object-valued element stored untouched |
| P5 | Bootstrap sparse shrink hitting fixed index 3 after deleting 5 | Fault wrapper, length 4; index 5 gone, 3 and 1 retained; requested freeze applied; same shared algorithm as semantic case |
| P6 | Existing guests/metadata/literals/map | Same outputs, flags, holes, ordering, counts and realm independence; no new ticks |
| L1 | Assignment and direct Define, methods return 2 then 2 on length-3 array | Two fresh number-hint calls; length 2, index 2 absent; assignment yields original object, Define true |
| L2 | Returns 2 then 3 | Located RangeError; no outer shrink; existing indices survive except hook mutations |
| L3 | First call replaces valueOf with return-2 method or deletes it exposing inherited method | Second lookup uses replacement/inheritance; trace old,new once each; original receiver and zero args |
| L4 | First/second lookup, method call, or helper tick throws sentinel | Exact record/value/diagnostic/location, no later stage; previous hook effects persist; first throw skips conversion two |
| L5 | Ordinary/array/function length object, own/inherited methods, noncallable-first and object fallback | Both number-hint conversions use valueOf before toString; fixed 2 or meaningful final TypeError; no implicit standard methods |
| L6 | Both calls return -0, or -0/+0 and +0/-0 | Stored +0, both calls occur, all own indices removed; original returned Values retain signs |
| L7 | Constant null/false/empty string/true/'2'/'0x10', undefined/NaN/infinities/-1/1.5/2^32/'x' | First group lengths 0/0/0/1/2/16; second group RangeError after two conversions. 2^32-1 succeeds sparsely; no giant scan |
| L8 | Returns 2.9 then 2; returns 2 then 2.9; returns Infinity then 0 | Success length 2; RangeError; success +0 respectively, proving no premature invalid check or conversion reuse |
| L9 | Hook grows array to 6/adds index 5, then returns 2 twice | Outer sees length 6 and deletes own 5 down to 2; low/inherited/nonindex properties remain |
| L10 | Hook shrinks to 1 then returns 2 twice | Outer takes growth branch from 1 to 2; previously deleted indices do not reappear |
| L11 | Hook sets length 2 readonly; returns 2 twice versus returns 1 twice | Direct Define with absent writable succeeds same-value case; lower request false. Strict assignment reached before hook translates later false to TypeError |
| L12 | Initially readonly length, object RHS; direct Define valid same/different length, invalid result, or throw | Set zero hooks and TypeError; Define runs two conversions then true/false, RangeError on mismatch, or exact earlier throw |
| L13 | First/second hook changes indices then throws or mismatches | Hook-created/deleted indices and length changes remain; no outer length commit/deletion/freeze |
| L14 | Shrink 6 to 1 with fixed index 3, configurable 5, requested writable=false | Delete 5 before rejection at 3; restore length 4 readonly, retain 3/1; Define false, strict Set TypeError (without requested freeze on Set) |
| L15 | Same shrink succeeds, descriptor has writable=false; or incompatible enumerable/configurable | Successful deletion then readonly; incompatible flags false before deletion, but after both conversions; caller descriptor unchanged |
| L16 | Ordinary base internalSet('length', object, arrayReceiver, context, loc); array base to ordinary receiver | First path array double conversion and correct receiver/context; second stores object unchanged and leaves base array alone |
| L17 | Guest nested `other.length = inner` in outer valueOf; bounded same-array reentrancy | Shared active context, deterministic two calls per reached conversion, post-hook descriptor used; no stale snapshot/lock |
| L18 | Guest infinite loop, recursively coercing assignment, nested keys/operators/map during hook | Exact step-limit/call-depth RangeErrors, monotonic shared counters, call cleanup to zero; no native overflow or fresh budget |
| L19 | Two independent realms with hooks mutating counters and arrays | Independent state and exact active context; no cross-call method caching |
| L20 | RHS throws; key conversion throws; ordinary/index stores object RHS | Earlier failure skips length hooks, preserves accepted reference order; data values never coerced |
| L21 | Host fault/illegal completion inside hook | Existing evaluator host-fault behavior and call cleanup, no guest wrapping; do not claim broader cleanup guarantees |

For descriptor snapshots test all present/absent flags and verify input records
unchanged after success, false, throw and partial deletion. A defensive test may
replace the host input record during a hook and verify saved fields/original
Value are used; this documents snapshot behavior, not support for descriptor
accessors or concurrent mutable records. In L11 also check requested writable=true
cannot thaw the hook-frozen property. In L14 without requested freeze, restored
length stays writable. Readonly Set tests must separately cover inherited readonly
base and readonly receiver, and no value must be coerced just to reject either.

## Next implementation ownership and validation contract

After explicit coordinator assignment, batch 1 owns the required edits in
`src/runtime.ts`, `src/array-object.ts`, `src/evaluator.ts`, `src/array-map.ts`,
`src/realm.ts`, `src/builtins/number.ts`, and only the test consumers/setup helpers
listed above; scoped architecture/feature notes, task handoff and new evidence.
Extend existing descriptor/dispatch/array-storage drivers for P1-P6 rather than
inventing another harness. No manifest changes are necessary if those drivers
suffice. Run typecheck, runner regressions, compiler probes, rebuilt Node/native
guest suites and every static-only build plus separate coverage gate. Retain all
161 baseline entries and 20 gates, report actual totals and failures honestly.
New extracted methods/module reachability are unproven until this real build;
reduce a genuine compiler blocker before proposing any workaround.

Batch 2, separately assigned, owns semantic `setLength` conversion integration,
the exact migrations above, a focused compiled `test/array-length-coercion.ts`
driver and runtime-read fixture, their registration, scoped docs/evidence. It
must pass P1-P6 and L1-L21, preserve all prior entries and add the new driver/gate
(expected minimum 162 guest entries and 21 native gates). Stop for review after
each batch; these names/contracts are proposals, not claimed/ready successor tasks.

No standard Array intrinsics/species, symbols, boxing, accessors/proxies, new
syntax, full converter migration, pins, C++/Claude changes, main merge or
successor dispatch. TS-015P itself makes documentation-only changes, runs no
new semantic/compiler probes, and makes no new native capability claim.
