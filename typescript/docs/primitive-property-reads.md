# Primitive property reads and calls — TS-028P

Design for independent review, 2026-11-02; not implemented. Baseline `5664a35`
passes 189 cases per host and 29 static-only/separate coverage gates according
to coordinator evidence. [Evidence and migration inventory](validation/ts-028p/README.md)
and [named acceptance matrices](validation/ts-028p/matrix.md) are part of this contract.

## Bounded change

Use the existing `toObject` in the property branch of `runtime.getValue`, retaining
the original base Value as Receiver. Boolean, Number, String and Symbol reads then
use their active Realm's wrappers and existing prototype properties. Binding reads
are unchanged. No new syntax, built-ins, constructor globals, accessor/proxy support,
BigInt, general primitive writes or sloppy-this substitution is included.

The production change belongs in `runtime.ts`, with a wording correction to the
explicit-only comment in `object-conversion.ts`. Existing `Evaluator.reference`,
member evaluation and call receiver capture already provide the required path.
Do not introduce a second property lookup helper or a wrapper cache. The existing
module graph already has runtime/conversion cycles; use ordinary function imports,
not top-level calls into partially initialized modules, and validate both hosts.

## Reference ordering and the actual mismatch

Reference capture evaluates base, then key expression, each once. It does not
convert the key or validate the base. This agrees with fixed 2025
[member evaluation](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-evaluate-property-access-with-expression-key).
In particular, simple assignment evaluates the RHS before deferred conversion.
Moving ToPropertyKey into `Evaluator.reference` would be an observable regression.

There is a different mismatch: current `getValue` never stores its converted key.
Fixed 2025 [GetValue](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-getvalue)
updates the reference after successful conversion. A host-held reference read
twice, or read then written, currently calls an object key twice. This is not
currently exposed by guest compound/update syntax, which the parser does not admit.
Correct this narrowly in GetValue as part of the read contract; do not add syntax.

The property branch must perform this sequence:

1. `toObject(ref.base, context, ref.loc)`. Return its throw unchanged.
2. Convert `ref.key` with existing string-hint `toPropertyKey`. Return a conversion
   throw unchanged, leaving `ref.key` untouched.
3. Store the resulting key back as a string or symbol **Value** in `ref.key`.
   Keep the existing Reference type: PropertyKey is a host string/GuestSymbol,
   whereas Reference.key is a Value. Do not confuse those representations.
4. Return the boxed object's `internalGet(key, ref.base, loc)` completion directly.

Calling the existing converter for an already-string/symbol key costs no ticks,
calls or lookups. A narrow kind fast path is unnecessary. Cache only the key,
never the property value, box or lookup result. A subsequent Get still observes
property mutations. Cache success before dispatch, even if Get later throws or
raises a host fault. Separate source evaluations create separate references and
must convert independently. A conversion throw or host fault must not publish a
partial key. The box is a local variable, never written into `ref.base`.

Null/undefined therefore produce TypeError `cannot convert null or undefined to
object` at `ref.loc`, after key-expression evaluation but before key hooks. A
throwing key expression wins over that error; a throwing conversion hook does not.
Non-null primitives now reach key hooks. Existing object bases retain identity.
ToObject does not invoke conversion hooks on the base. Numeric NaN, infinities
and negative zero remain payloads, not property-key conversions of the base.

## Lookup, call and Realm invariants

`toObject` already selects the current `context.realm` factories. Capture its
result before key hooks, which may temporarily enter another Realm. Hooks can
mutate the original Realm's prototype properties before lookup, and lookup must
see those mutations. Returned foreign objects retain their own prototype graph;
foreign primitive Values have no originating wrapper Realm.

`GuestObject.internalGet` traverses data descriptors, including String virtual
indices, and returns missing as undefined. It does not recursively call each
prototype's overridden internalGet. Test-only instrumentation must override a
factory-created wrapper's top-level internalGet or inspect descriptor dispatch;
adding an override only on a prototype will not observe ordinary inherited Get.
No accessor or proxy semantics are implied by host sentinels.

For a member call, get the callee before evaluating arguments, then call with
`ref.base`. Arguments still run before a noncallable-value error. Keep the
original primitive this, even if an argument changes the base binding or method.
A detached callable gets undefined this under the existing strict-call profile.
Parentheses preserve a member reference; a conditional or logical expression
produces a Value and loses that receiver. This is not a claim of full strict Script
support. A called function enters its defining Realm through existing call/finally
machinery. Thus lookup can use A's Number prototype while the selected method
runs in B; a separate boxing operation performed by that method uses B.

String lookup reuses `GuestStringObject`, `stringIndex`, `stringLength` and
`stringUnit`. Indices and length count UTF-16 code units. A surrogate pair has
length 2 and each index yields a one-unit string. Numeric -0 keys become "0";
the string "-0", "01", fractional and out-of-range indices are ordinary missing
keys unless inherited. No code-point iteration, host string property access,
eager virtual-index materialization or new String methods is needed.

## Writes and future read-before-write boundaries

`putValue` remains object-only, including its current error message and timing.
For `p[k] = rhs`, capture p and k, evaluate rhs, then reject a primitive p before
key hooks. A failing RHS wins. No temporary wrapper receives a write. The current
delete path remains unchanged; nested reads feeding delete can now succeed and
can consequently change the later error, as inventoried.

At the direct API boundary, GetValue followed by PutValue on the same object
reference uses the saved key once. PutValue's existing conversion of that string
or symbol is effect-free. On a primitive reference, a successful read (and any
key effects) can precede the retained write rejection. Do not preflight writeability
before reading. Preserve property values and prototypes on rejected writes.

Compound assignments and updates remain parse failures. A later assignment must
design them explicitly: compound operations read before RHS evaluation; updates
read then perform numeric conversion; conversion/RHS failures can precede the
eventual write failure. Logical assignment can skip the write entirely. Any future
implementation must retain one reference/key conversion across read and write,
including when the RHS mutates the original key object. This task authorizes no
compound desugaring, no fabricated current runtime compound coverage, and no
generalization of PutValue/delete to cache repeated direct writes/deletes.

## Resource and validation boundary

Boxing, key memoization and ordinary descriptor reads add no ticks. Existing
statement/expression guards and key conversion ticks remain the only charges on
this path. Call-depth, Realm restoration and frame cleanup use existing finally
blocks. Guest throws propagate identical completion/value/diagnostic objects;
host exceptions escape as the same host fault, not guest TypeErrors. No rollback
of guest effects or monotonic steps is attempted. Failed allocation is a host
fault; no allocation quota or native heap guarantee is introduced.

The eventual implementation needs every named matrix row, exact small limits and
actual default-64 native recursion, all existing runner/probes/typecheck checks,
full rebuilt Node/native runs and every static-only AND parsed coverage gate.
Keep the 189 case names and 29 gates; change only the explicitly listed obsolete
expectations. New coverage is additive. Retain historical validation files.
No new compiler probe is justified by this design inspection alone.
