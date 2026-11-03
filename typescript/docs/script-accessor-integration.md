# TS-033ER-P: ordinary accessors before Script execution

Design for independent review at `b33fae6`, 2026-11-03. No implementation or
execution admission. This refines the mandatory ER prerequisite already frozen
in [script-execution-integration.md](script-execution-integration.md#er-prerequisite-inherited-restricted-function-properties).
That file is outside this writer's ownership and remains unchanged. E4 remains
blocked until the separately assigned ER implementation is independently accepted.
E3B is accepted; its 212 records per lane and 46 static gates are the baseline,
superseding the older 42-gate count in the execution design, without deleting it.

## Decisions and scope

Use real ordinary data/accessor descriptors, with absent update fields distinct
from guest undefined. Get and Set invoke through the caller's OperationContext,
preserving Receiver, abrupt record identity, call budgets and defining Realm.
No spelling checks, parser blacklist, poison data properties or function-only
lookup. Script Function.prototype alone receives the two restricted accessors;
legacy bootstrap stays exact. Generic accessors may be installed by trusted host
controls in either profile. This does not add guest descriptor reflection,
accessor literal syntax, Proxy, Object.defineProperty, eval or execution entry.

**Ownership expansion requiring explicit coordinator acceptance before ER-A:**
the earlier ER list is incomplete. Add `src/script-environment.ts` (E2 reads),
`src/realm.ts` host read/definition APIs, and the exact existing host-test files in
[migration-files.md](validation/ts-033er-p/migration-files.md). The earlier list
already includes runtime, array-object, primitive-objects, global-environment,
array-like, array-map, primitive-conversion, builtins/object and builtins/array.
Do not treat this proposal as permission to edit them now. `src/evaluator.ts`,
`src/script-record.ts`, `src/script-global-declarations.ts`,
`src/builtins/function.ts` are audited preservation seams, not authorized ER
production edits: their existing context paths and guards suffice. If compiling
the proposed interface needs edits there, return a bounded ownership revision
first. E4 will separately own evaluator/session activation.

## Concrete representation and API

In `src/runtime.ts`, retain DataDescriptorUpdate for data-only construction sites
but widen the internal definition entry to PropertyDescriptorUpdate:

```ts
type DataDescriptorUpdate = {
  value?: Value; writable?: boolean; enumerable?: boolean; configurable?: boolean;
};
type PropertyDescriptorUpdate = {
  value?: Value; writable?: boolean; get?: Value; set?: Value;
  enumerable?: boolean; configurable?: boolean;
};
type DataDescriptor = {
  kind: "data"; value: Value; writable: boolean;
  enumerable: boolean; configurable: boolean;
};
type AccessorDescriptor = {
  kind: "accessor"; get: Value; set: Value;
  enumerable: boolean; configurable: boolean;
};
type PropertyDescriptor = DataDescriptor | AccessorDescriptor;
type DescriptorValidation = { valid: false } |
  { valid: true; descriptor: PropertyDescriptor };
function validatePropertyDescriptorUpdate(desc: PropertyDescriptorUpdate): void;
function validatePropertyDescriptor(current: PropertyDescriptor | undefined,
  extensible: boolean, desc: PropertyDescriptorUpdate): DescriptorValidation;
```

Host `undefined` means absent, including an explicitly host-undefined optional
field, preserving existing array copies. `UNDEFINED` means a present undefined
guest value (including get/set reset). Classify by present value/writable or
get/set; neither means generic. Do not classify by truthiness: writable=false
and get=UNDEFINED are present. Stored descriptors are complete tagged records;
no stored generic descriptors, no opposite-kind fields. Accessor get/set Values
are either guest undefined or objects whose callable is non-null. All three
callable variants count as callable, even though Script execution is blocked.
Callability validation must not invoke, materialize, change Realm or probe a guard.

`validatePropertyDescriptorUpdate` throws a host invariant Error for mixed
data/accessor updates or invalid getter/setter Values before storage, conversion
or calls. This is a trusted internal-record contract, not ToPropertyDescriptor
or a guest TypeError claim. A future guest reflection API must separately perform
the specified field-read order and guest errors before constructing this record.
Both semantic and bootstrap definition entries validate before subclass work;
subclass overrides must call the validator too. Plain host records are the trust
boundary; hostile host JS proxies/getters and wrong primitive field types are not
guest descriptor inputs. Do not accept malformed records by silently discarding
get/set during an array descriptor copy.

`validatePropertyDescriptor` is a pure validate-and-construct helper, after
structural validation: no storage mutation, no guest code, return fresh descriptor
on success. OrdinaryDefineOwnProperty commits it once. String virtual indices use
the same helper without committing. Keep snapshots detached, preserving Value,
GuestObject and GuestSymbol identities. `getOwnProperty`, `properties`, and
OwnPropertyKeys never execute getters. Snapshots discriminate before reading
value/writable; accessor snapshots expose only get/set/E/C plus the internal tag.

Definition rules (fixed2025 10.1.6.3):

* Missing property: reject if nonextensible, otherwise default to data for generic
  updates; default value/get/set=UNDEFINED and all flags=false.
* Existing property: empty update succeeds, even on a nonextensible object.
  Generic updates preserve kind and unspecified fields. Existing properties may
  change on nonextensible objects subject to their attributes.
* Nonconfigurable: reject configurable=true, enumerable changes, kind changes;
  for accessors reject any present get/set not SameValue to the stored endpoint.
  For nonwritable data reject writable=true or a non-SameValue present value.
  NaN is SameValue to NaN; +0 and -0 are different. Rejections leave all fields
  and key order unchanged, including combined requests with an allowed field.
* Configurable kind change: retain E/C unless supplied, discard old kind's fields,
  fill new kind's unspecified fields with defaults. Same-kind partial updates
  retain unspecified fields. A writable nonconfigurable data property may change
  value and become nonwritable, but cannot become writable again.
* Delete still tests only configurable. Delete/reinsert changes insertion order;
  in-place redefinition never does. Symbols use identity, not descriptions.

Concrete GuestObject signatures:

```ts
getOwnProperty(key: PropertyKey): PropertyDescriptor | undefined;
get properties(): Map<PropertyKey, PropertyDescriptor>;
defineOwnProperty(key: PropertyKey, desc: PropertyDescriptorUpdate,
  context: OperationContext, loc: Location): InternalBooleanCompletion;
protected bootstrapDefineOwnProperty(key: PropertyKey,
  desc: PropertyDescriptorUpdate, loc: Location): InternalBooleanCompletion;
protected ordinaryDefineOwnProperty(key: PropertyKey,
  desc: PropertyDescriptorUpdate): BooleanCompletion;
bootstrapDefine(key: PropertyKey, desc: PropertyDescriptorUpdate): void;
internalGet(key: PropertyKey, receiver: Value,
  context: OperationContext, loc: Location): ValueCompletion;
internalSet(key: PropertyKey, value: Value, receiver: Value,
  context: OperationContext, loc: Location): InternalBooleanCompletion;
get(key: PropertyKey, context: OperationContext, loc: Location): Value;
```

`get` remains explicitly trusted host convenience: forwards those exact arguments
to semantic Get, throws the existing host inspection error if completion is
abrupt. Tests needing abrupt identity must use internalGet, not this adapter.
No default context/location and no fresh evaluator. For descriptor-only inspection
use getOwnProperty plus explicit data-kind checks; do not change a formerly
semantic read to descriptor lookup merely to avoid a context migration.
All test overrides adopt the full Get signature, including ignored context
parameters and super forwarding. No overload retaining the old signature.

## Receiver and context algorithm

Preserve the current iterative ordinary prototype walk and dispatch to each
object's getOwnProperty (String virtual data included). Production has no Get/Set
overrides; future exotic Get/Set needs a separate dispatch contract. Trusted test
overrides continue to instrument their existing root entry; do not claim generic
Proxy support. HasProperty walks descriptors only and treats accessors as present
without invoking them.

Get stops at the first descriptor. Data returns its exact Value. Missing property
or absent getter returns normal UNDEFINED. Otherwise return exactly
`context.call(desc.get, receiver, [], loc)`, with no direct invoke, boxing of the
receiver, exception wrapping or new session. Getter receives zero arguments.

Set stops at the first descriptor. For an accessor, absent setter returns false;
otherwise call `context.call(desc.set, receiver, [value], loc)`. Return the same
throw completion, or normal true ignoring a normal return Value. Never create a
receiver property after a setter call. Primitive receivers are valid for an
accessor call. Data or entirely absent lookup uses the ordinary data branch:
nonwritable returns false, primitive receiver returns false; receiver own accessor
returns false (do not call it), receiver nonwritable data returns false; otherwise
define value-only on existing receiver data, or new W/E/C=true data. Definition
dispatches on the receiver, preserving ArraySetLength and String exotic behavior.
The public strict Set adapters retain their existing false-to-diagnostic-TypeError
translation; internal false is not itself an exception.

Descriptor lookup, validation, Has, Delete and absent accessor paths add **zero**
ticks. Accessor dispatch adds **zero** wrapper ticks and exactly one context.call;
callee behavior supplies its existing ticks. This preserves old totals and avoids
double-accounting. The current evaluator call boundary checks guards before
call count, enters the callee Realm, and restores calls/Realm in finally. Its
statement/expression finally paths restore depth. ER changes no counters or
guards. Tests cover nonzero starting counters and monotonic steps; no code catches
host faults and rebrands them as guest throws. E4 separately owns Script frame,
source/lexical restoration and authorized Script context provenance.

## Exhaustive production migration ledger

Line-level source/host inventory, base hashes and lexical counts live in
[audit.json](validation/ts-033er-p/audit.json). Counts include definitions and
overrides, not just calls; `.get` additionally includes unrelated Map reads.
The production semantic Get surface is eleven call sites in seven files:
runtime (host get and getValue), array-like (length), array-map (constructor and
element), global-environment (object binding), primitive-conversion (ordinary
method and @@toPrimitive), builtins/array (join element and join method),
builtins/object (@@toStringTag). Each forwards its already available context.
No new context is allocated anywhere in this migration.

| Exact file under src/ | Required change or verified preservation |
|---|---|
| runtime.ts | Storage union, pure validation, detached snapshots, Get/Set and contextful host get; getValue passes context while preserving successful key caching and primitive Receiver. putValue/set preserve strict failures and RHS/key timing. Environment/Reference/Completion unchanged. |
| array-object.ts | Widen every descriptor entry/helper; assert stored length kind=data and numeric. Accessor length request has no value and reaches ordinary validation, returning false without coercion. Accessor index definition may extend length; reject before insertion when length nonwritable. Clone all six update fields before reentrant value conversion. Keep two coercions, late old-length read, descending deletions, partial rollback/freeze. Bootstrap remains primitive-only for length. |
| primitive-objects.ts | String virtual descriptors gain data tag, snapshots use union, overrides widen. Virtual index accessor requests reject via common compatibility helper; ordinary nonindex keys may be accessors. String length remains nonconfigurable data. Boolean/Number/Symbol wrappers inherit ordinary behavior. |
| global-environment.ts | getBindingValue and getStrictGlobalBinding gain context; CanDeclareGlobalFunction narrows kind before writable check. Configurable accessor may become data through CreateGlobalFunctionBinding then mandatory Set(false); nonconfigurable accessor rejects. HasBinding/restricted-property checks do not Get. Captured references stay live; no descriptor capture or repeated resolution. |
| script-environment.ts | getScriptBinding and ScriptLocalBindings.getBindingValue gain context, forwarding to global or local record. Local implementation ignores it, still preserves TDZ and exact identity; no context retained in references. |
| realm.ts | readScriptGlobal gains explicit context. defineScriptGlobal accepts PropertyDescriptorUpdate, validates before effects and applies its existing callable profile-transfer check to each present value/get/set (undefined is allowed), then bootstrapDefine. No bypass for getter/setter endpoints. ER-B adds restricted bootstrap below. |
| array-like.ts | length Get forwards context before existing ToLength. |
| array-map.ts | constructor and present element Gets forward context; Has-before-Get, callback order, default allocation, species/constructor refusal and same budget remain. |
| primitive-conversion.ts | Both Get sites forward context; getter may return method, throw or mutate later lookup. Keep hint/order, @@toPrimitive noncallable rejection and fallback semantics. |
| builtins/object.ts | Tag Get forwards context; getter throw propagates; receiver remains the boxed object as specified here. |
| builtins/array.ts | Element and join Gets forward context; existing tick/string conversion/order/fallback and captured Object toString preserved. |
| evaluator.ts (read-only) | Existing stable context reaches runtime getValue and all conversions; call receiver remains original base. No direct Get call. Closed script-guest/Script/profile guards, calls/depth finally paths unchanged. |
| script-record.ts (read-only E3) | No Get/descriptor inspection in production; materialization bootstrapDefines stay data-shaped. FDI/block/D2 methods already pass shared context to writes. No new ticks, private-state exposure or setup retry. E3 test inspections need kind checks/context. |
| script-global-declarations.ts (read-only D2) | Delegates global checks/definitions; no direct Get. Eleven orchestration ticks and E3B factory additions unchanged. |
| builtins/function.ts (read-only) | call/apply use context.call; pure source-text helper and exhaustive variants unchanged. No endpoint direct invocation. |
| conversion.ts, object-conversion.ts, abstract-equality.ts, delete-reference.ts (read-only) | Context already threaded into conversion/boxing/reference APIs; no direct semantic Get or descriptor slot assumption to migrate. |
| Other src files | Full source scan finds no other descriptor/Get/Set/host GuestObject.get consumer. Map.get in planner/private record/environment storage is unrelated. Bootstrap data literals remain valid update records. |

New binding signatures are:

```ts
GlobalEnvironment.getBindingValue(name: string, context: OperationContext,
  loc: Location): ValueCompletion;
ScriptLocalBindings.getBindingValue(name: string, context: OperationContext,
  loc: Location): ValueCompletion;
getStrictGlobalBinding(reference: StrictGlobalReference,
  context: OperationContext): ValueCompletion;
getScriptBinding(reference: ScriptBindingReference,
  context: OperationContext): ValueCompletion;
Realm.readScriptGlobal(name: string, context: OperationContext,
  loc: Location): ValueCompletion;
Realm.defineScriptGlobal(name: string, descriptor: PropertyDescriptorUpdate): void;
```

Resolve/Put signatures and reference shapes do not change. E2/E3 tests pass their
existing explicit context, including direct local record reads. An inspection-only
driver lacking a context must declare one named host context once, at its existing
Realm scope, with full call signature throwing a host invariant if unexpectedly
called and a tick implementation retaining its existing policy. Never hide that
inside a get helper. This is an explicit no-call host fixture, not a Script session
or evidence of restricted thrower invocation. Existing test .get calls through
instrumented overrides must still exercise those overrides and retain traces.

## Script restricted bootstrap

ER-B owns new `src/builtins/restricted-function.ts` exporting only
`registerRestrictedFunctionProperties(realm: Realm): void`. Call once from Realm
construction after Function.prototype and its metadata exist, before registration
of the remaining methods. Require profile=script as a host invariant. Legacy
constructor never calls it. No bootstrap flag allowing Script execution.

Create exactly one thrower with `realm.createBuiltin("", 0, callback)`; this keeps
the existing private guardBuiltin wrapper. Callback has full Builtin signature
and returns `failure("TypeError", "restricted function property", loc)` only when
eventually authorized. Redefine name/length configurable=false through validated
bootstrap definition, then preventExtensions. It inherits this Realm's
Function.prototype, has own name="" and length=+0, both W/E/C=false; has no own
prototype/caller/arguments. No other own keys. Both restricted properties on
Function.prototype are accessor(get=T,set=T,E=false,C=true), using the same T
Value/object; other Realms have distinct T. A local bootstrap variable suffices
for the intrinsic identity in this subset; no new public getter or global binding.
All four endpoints retain T even if one descriptor is later deleted/redefined.

New strict Script functions inherit these descriptors, with no own caller or
arguments. Ordinary objects with Object.prototype do not inherit them. A host can
define own data on a function, delete/redefine the configurable prototype
accessors, or replace a configurable endpoint; ordinary lookup must reflect it.
The thrower is itself a builtin inheriting Function.prototype; do not add own
restricted properties to it. No changes to legacy Function.prototype or metadata.

While E4 is closed, actual invocation of T through either direct invoke or an
Evaluator remains a **host guard failure**, not diagnostic TypeError. Host dispatch
controls may record that the expected T/receiver/args/context would be passed and
return a sentinel, but must label this as dispatch evidence, never actual T
execution. Generic invocation/cleanup controls use existing legacy Evaluators
and ordinary trusted legacy builtins. Never unwrap a guarded callback, create an
ungated Script builtin or special-case T in evaluator. E4 must subsequently prove
the actual builtin TypeError, cross-Realm and frame/budget cleanup on its
authorized context; engine diagnostic string errors remain nonconformance debt
until genuine Error objects are implemented.

## Staged implementation assignments (proposed, not started)

| Slice | Exact ownership and gate |
|---|---|
| ER-A: ordinary descriptor and context integration | Eleven production migration files above (runtime, array-object, primitive-objects, global-environment, script-environment, realm, array-like, array-map, primitive-conversion, builtins/object, builtins/array); exact host migration allowlist; new test/property-accessors.ts and fixtures/property-accessors/a.txt,b.txt; additive tools/build-native.mjs gate only; own TASKS entry, docs/feature-inventory.md and new docs/validation/ts-033er-a/ including focused two-input replay driver. Existing tools/run-guests.mjs stays unchanged. R01–R28,R33–R34. One coherent atomic signature migration; do not commit a half-migrated production API. Stop for review. |
| ER-B: restricted Script intrinsic bootstrap | realm.ts only bootstrap hook plus new builtins/restricted-function.ts; new test/script-restricted-properties.ts and fixtures/script-restricted-properties/a.txt,b.txt; additive tools/build-native.mjs gate, own TASKS/docs/feature-inventory.md/evidence docs/validation/ts-033er-b/ including focused two-input replay driver. R29–R32,R35. No existing tests need semantic expectation changes; if an exact Script own-key assertion needs additive expected surface, propose that specific migration for review first. Stop for independent review; ER is then complete only if all ER rows pass. |
| E4: remains blocked | R36 plus execution design F04–F09 and full execution matrix, actual Script evaluation/calls/authorization. No E4 production assignment is made here. |

The ER-A scope is mechanically broad because descriptor type and Get signature
are shared. Review in three readable patches within the same assignment: storage
validator and exotics, context propagation plus exact host migrations, additive
semantic controls. Keep runtime algorithms direct; no new general exotic
framework or universal property helper layer. ER-B is independently reviewable.
Focused drivers follow the accepted E3B dedicated replay arrangement rather than
changing the inherited 212-record guest runner. The frozen authoritative list of
existing tests is generated from the base.

If scriptc cannot lower the tagged union, helper result, context callback or
cross-module subclass dispatch, stop and propose a self-contained reduction in
the slice's new evidence directory: two kinds, absent/present endpoints, transition
result, subclass snapshots and full four-argument Get forwarding in one small
driver. Require static-only build plus independently parsed zero-dynamic coverage,
Node/native literal results. Retain failing attempt first. No production workaround,
pin change, dynamic fallback or new feasibility claim is authorized here.

## Acceptance and research basis

[Literal matrix](validation/ts-033er-p/matrix.md) has 36 rows with explicit
host/E4 boundaries. Both runtime inputs per new compiled driver must vary keys,
values and receiver identity after compilation, retaining exact expected traces.
Require Node and rebuilt native results, all 212 inherited records byte-for-byte
in meaning and names; all 46 inherited entrypoints plus additive gates must pass
static-only and independently parsed zero-dynamic coverage. Preserve E3B18/6/12
prefixes, E3A/E2/E1 two-input controls, D1 planner135/baseline207,
metadata136/42/stress8, global15/bootstrap18/D2 two-input replays, runner20,
probes10, host73, observations22 and all60 blocked corpus variants. Keep failure,
skip/timeout/crash classifications and historical evidence. No C++, source fixture,
toolchain pin, default profile, observation schema or admission changes.

The fixed [ECMA-262 2025 edition](https://262.ecma-international.org/16.0/)
governs descriptor rules (§6.2.6, §10.1.6.3), OrdinaryGet/Set (§10.1.8–9), array
length and String indices (§10.4.2.4, §10.4.3.2), global declaration compatibility
(§9.1.1.4.15/17), restricted properties (§9.3.2, §10.2.4, §17.1).
Retained [spec.json](validation/ts-033er-p/spec.json) records 13 extracts and full
edition SHA-256 `6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713`.

Reviewed [engine262 objects.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/objects.mts)
OrdinaryGet/OrdinarySetWithOwnDescriptor and ValidateAndApplyPropertyDescriptor,
spec-types.mts field-presence helpers, realms.mts AddRestrictedFunctionProperties,
FunctionPrototype.mts ordinary prototype bootstrap, and [ThrowTypeError.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ThrowTypeError.mts)
per-Realm creation/freeze. Adopt the semantic separation of validation, receiver
dispatch and shared Call. Do not copy generator machinery, descriptor casts or
SetIntegrityLevel infrastructure into Rift; explicit tagged records and two
metadata redefinitions suffice here. Source, hashes, revision and MIT license
are retained in [engine.json](validation/ts-033er-p/engine.json); extra related
prototype files fetched by the selector are provenance, not implemented scope.
No engine262 execution or compiler feasibility test ran in this design task.
