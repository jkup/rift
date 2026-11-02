# Property assignment boxing and Receiver — TS-029P

Design for independent review, 2026-11-02; not implemented. Accepted baseline
`b9d3ef1` has 196 cases per host and 30 static-only/separate coverage gates.
[Evidence and exact migrations](validation/ts-029p/README.md) and the
[named literal matrices](validation/ts-029p/matrix.md) form this contract.

## Smallest correction

Change only the property arm of `runtime.putValue`, plus the now-incomplete
ToObject comment and implementation scope/evidence/tests. Reuse existing ToObject,
ToPropertyKey and internalSet. Keep Reference's Value-shaped key, existing binding
assignment, parser, evaluator capture and all ordinary/exotic definition dispatch.

1. Call `toObject(ref.base, context, ref.loc)`; return a throw unchanged.
2. Call `toPropertyKey(ref.key, context, ref.loc)`; return a throw unchanged.
3. Save successful conversion into `ref.key` as a string or symbol **Value**, as
   GetValue already does. Do this before Set, including when Set subsequently fails.
4. Call `object.value.internalSet(key.value, value, ref.base, context, loc)` once.
5. Return a throw unchanged. For normal(false), produce runtime TypeError with
   message `property is not writable: ` plus existing `formatPropertyKey(key.value)`,
   at operation `loc`. For normal(true), return `normal(value)` with exact RHS Value.

The small completion translation intentionally mirrors `GuestObject.set` locally.
Do not call that method on the temporary wrapper: it substitutes an object Receiver.
Do not extend its signature, refactor unrelated callers or add a generalized Set
abstraction for three lines of translation. Existing object `set` behavior remains
unchanged. A future shared helper would require separate demonstrated need.

The [2025 PutValue/GetThisValue algorithm](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-putvalue)
requires boxing, saved conversion, and dispatch with the original base for ordinary
property references. Rift combines successful PutValue and assignment-result
construction in its helper, returning the RHS rather than specification unused.
Retain that established internal interface. There is no Strict field on Reference:
all failed writes throw, the existing strict-write profile. This is not full strict
Script support, directive processing or a new sloppy-mode implementation.

## Capture, effects and failures

`Evaluator.reference` evaluates the base and key expression once, retaining their
Values. It does not box or convert. Simple assignment then evaluates its RHS before
PutValue, consistent with [2025 assignment evaluation](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-assignment-operators-runtime-semantics-evaluation).
Keep this path: an RHS exception wins even for nullish bases; a key-expression
exception wins over the RHS; base-expression failure skips both. A successful RHS
can mutate the captured key object's methods or prototype before conversion. A
rebinding of the key/base variable cannot replace the captured Value. A key hook
can mutate the captured RHS object, but cannot replace the RHS Value by rebinding.
There is no semantic Get of the assignment target and no coercion of ordinary RHS.

Null/undefined throw `cannot convert null or undefined to object` at ref.loc,
after the RHS but before key hooks. Other primitive bases now reach key hooks;
their abrupt completions or host faults win over the later failed Set. ToObject
does not convert the base. Numeric -0/NaN/infinities and String UTF-16 payloads
are preserved. String virtual indices/length remain readonly even for identical
RHS values. No assignment succeeds on a primitive through the current data-only
ordinary path. Do not replace the old early rejection with a different early
primitive check, even if the final TypeError would often look identical.

Only successful keys are cached, never boxes, RHS Values or Set results. Conversion
throws/host faults leave the raw key intact. After conversion, false, guest throw,
or host fault from Set retains the saved key. A second Put or Get on that reference
uses it without another hook, even if the original key object changes. Every new
source evaluation creates a new reference. Every primitive Put attempt boxes anew,
including a retry with a cached key. Never overwrite ref.base with a wrapper.

Guest ThrowCompletion, value and diagnostic identity propagate without wrapping.
Host exceptions escape as the original fault; do not catch them into guest errors.
Error formatting for symbols uses descriptions only and cannot invoke guest hooks.
For direct APIs with distinct locations, boxing/conversion errors use ref.loc,
Set receives operation loc, and false translation uses operation loc. A returned
abrupt completion keeps its own location. This intentionally migrates old primitive
write errors that used ref.loc before Set was reached.

## Preserve existing data dispatch

`GuestObject.internalSet` already walks descriptors iteratively with the original
Receiver. A nonwritable descriptor returns false; a writable or absent descriptor
still returns false for a nonobject Receiver, before any receiver definition.
This is the supported data subset of [2025 OrdinarySetWithOwnDescriptor](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinarysetwithowndescriptor).
Keep that implementation intact. No temporary-box or prototype writes may arise
from the assignment itself. Explicit effects performed by RHS/key hooks remain;
failure does not roll them back.

An object Receiver continues through its own getOwnProperty/defineOwnProperty,
preserving descriptor flags on update and all-true flags on creation. Inherited
writable data creates/updates the Receiver, not the prototype. Nonextensible
receivers may update existing writable properties but cannot add missing ones.
String virtual properties and Array length/index rules stay behind their current
definition dispatch. Array length writes may coerce RHS twice, throw, or partially
shrink before returning false; do not promise rollback or bypass those algorithms.
Key caching precedes even those Array RHS conversion effects.

Ordinary prototype traversal uses getOwnProperty, not each prototype's overridden
internalSet. Test primitive Receiver delivery with a Realm factory returning an
instrumented wrapper whose top-level internalSet records then delegates. Its
defineOwnProperty counter must stay zero. Prototype-only internalSet spies would
not prove this invariant. Test-only abrupt/host-fault overrides are dispatch
sentinels, not authorization to add accessors or proxies.

Two existing host-test observers override the set convenience method. Move them
to internalSet with the proper boolean-completion return type and original
Receiver forwarding (inventory A13/A14), retaining every S trace and sentinel.
Do not preserve those observations by reintroducing boxed `.set` in PutValue.

## Realm and resource boundaries

Box using active context.realm at PutValue entry, after RHS completion has restored
its caller Realm and before key conversion. Keep that wrapper local even when a
foreign hook temporarily enters B. A hook can mutate A's prototype before Set;
the saved wrapper observes that mutation. Foreign object bases keep their identity
and prototype graph; primitive Values carry no originating Realm. A nested Put
performed inside a B-defined hook boxes in B. Existing call/finally restoration
returns to A on success, guest abrupt and host fault.

No new ticks are charged for boxing, caching, ordinary Set or error translation.
Existing key-conversion ticks and evaluator statement/expression/call guards
remain authoritative. The assignment target member is captured directly, not
evaluated as an additional member expression: `p[k] = 7;` costs five ticks with
a primitive key and six with a canonical object key. Exact resource oracles,
including actual native default64 recursion (326 host / 390 guest ticks), are in
the matrix. Counts are derived from inspected paths, not measured new behavior.
Steps are monotonic; finally restores entry calls/depth/Realm, not consumed work.

## Explicit boundary and review decisions

No compound, update or logical-assignment syntax; those remain parse failures.
Direct Get-then-Put tests exercise reference reuse without inventing syntax.
No new built-ins, accessors/proxies, BigInt, super/private references, parser
strictness changes, number formatting, pin changes or C++ changes. Delete retains
its own contract and does not gain key caching through this work.

Two baseline behaviors conflict with the proposed correction: rejection before
primitive key effects, and repeated conversion after successful direct Put. Both
must migrate exactly as inventoried. Earlier TS-028 design/evidence correctly
describes its historical object-only writes; do not rewrite that history. There
is no unresolved semantic choice in this proposal; independent review must approve
the local translation choice, changed locations and resource derivation. Native
compiler/coverage feasibility and all new runtime assertions remain unverified
until a separately authorized implementation. No speculative probe was warranted.
