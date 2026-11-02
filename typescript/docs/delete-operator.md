# Guest delete: proposed bounded strict-delete profile

TS-025P, 2026-11-02. Design only; no delete support is implemented by this
document. Accepted runtime baseline `fc19afe` has 172 cases and 26 gates.
[Fixed acceptance matrices](validation/ts-025p/matrix.md) and
[inspection/migration evidence](validation/ts-025p/README.md) are part of this
contract. Coordinator acceptance of this design is the prerequisite for code.

## Policy decision

Adopt **unconditional strict-delete semantics within Rift's limited language
profile**. Reject direct identifier operands at parse time, including arbitrarily
parenthesized identifiers; translate normal false from property deletion to a
runtime TypeError. This applies at top level, in functions, in unreachable code,
and with or without a `'use strict';` string statement. Directives remain inert.
There is no sloppy delete mode, environment DeleteBinding operation, configurable
global binding, or unresolved-identifier success path in this assignment.

This is a new explicit profile choice, consistent with existing strict assignment
failure and exact call receivers, but **not implied by strict-call behavior**.
Do not describe Rift as implementing strict Scripts: directive prologues, global
objects, the full strict grammar and declaration instantiation remain incomplete.
In standard non-strict code, unresolved deletion returns true, declarative
binding deletion can return false, and nonconfigurable property deletion returns
false; none of those guest behaviors is exposed here. Low-level internalDelete
continues to return false normally. This policy is the only prerequisite decision
for coordinator review; no general reference or language-mode rewrite is needed.

## Normative and implementation basis

Use fixed [ECMA-262 2025 delete](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-delete-operator),
[computed reference creation](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-evaluate-property-access-with-expression-key),
and [Reference Records](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-reference-record-specification-type).
The fixed edition retains the unconverted computed value in the reference.
Deletion boxes the base **before** converting that value to a property key.
Parentheses preserve references; assignment, conditional and logical results
are values. Delete does not GetValue its final property operand.

Pinned engine262's Evaluate_UnaryExpression_Delete agrees with that ordering.
V8 13.0.245 VisitDelete distinguishes properties, identifiers and other expressions;
its parser rejects strict identifier deletion. These support the proposed split,
not a wholesale port of generator evaluation or bytecode machinery. Source paths,
revisions and blobs are in the evidence README. No upstream code is copied.

## Existing interfaces and minimal change

`Expr` already has `unary` with a string op. `Parser.primary` recognizes unary
operators and parses their operand with `expression(9)`. It erases parentheses
by returning the enclosed Expr. `Evaluator.reference` captures base Value then
key Value, including their evaluation effects, without property access or key
conversion. `Reference` holds those Values and the member location. GetValue and
PutValue currently reject nonobject bases; retain those contracts and tests.

1. Recognize the word token `delete` in the unary branch, while leaving it in
   RESERVED for binding names. Parse the complete operand first; when its kind
   is identifier, call fail with `delete of an identifier is not allowed` at the
   delete token. Existing first-error behavior takes precedence over this check.
   Parentheses require no new syntax flag. `delete o.x` and `delete f().x` are
   members; `delete f()` and `delete (x = 1)` are not. Do not reject identifiers
   nested inside value-producing operands such as `delete (true && x)`.
2. Handle delete before the existing unary operand GetValue/numeric path. A
   member calls `reference(operand, env, receiver)` once, then the helper below.
   There is no `evaluate(member)` wrapper or target GetValue. A direct identifier
   reaching this branch is a host invariant fault (malformed trusted AST), never
   a substitute runtime SyntaxError. Other kinds use `evaluate(operand)` once;
   propagate abrupt completion unchanged, otherwise return guest boolean true.
3. Add `src/delete-reference.ts`, exporting
   `deleteReference(ref: Reference, context: OperationContext, loc: Location): ValueCompletion`.
   A binding input is a host invariant error `delete requires a property reference`.
   For a property, call `toObject(ref.base, context, ref.loc)`; propagate its throw.
   Capture the resulting GuestObject locally. Call
   `toPropertyKey(ref.key, context, ref.loc)` once; propagate its throw. Finally
   call the captured object's `internalDelete(key.value)` once. Propagate its
   ThrowCompletion by identity; normal false becomes
   `failure("TypeError", "property is not configurable: " + formatPropertyKey(key.value), loc)`.
   Normal true becomes guest boolean true. `loc` is the delete token location.

The helper deliberately handles only strict property deletion. No boolean
strictness argument, environment mutation, new Reference variant or runtime.ts
import cycle is required. Calling toPropertyKey for a string/symbol Value is
observationally the same as the spec property-key fast path: no ticks or hooks.
Diagnostics format only the converted key and never stringify the base/key
object. The existing internal deletion signature has no Location argument;
trusted overrides supply their own original abrupt record, which must survive.

## Order, effects and storage

For `delete base()[key()]`: evaluate/GetValue the base, evaluate/GetValue the
key expression, box the captured base, convert the captured key with string
hint, delete on the captured box/object, translate failure. Stop at each abrupt
step. A key expression still runs for null/undefined bases; key *conversion*
does not. A throwing key expression wins over the later nullish ToObject error.
Do not move boxing after key conversion, evaluate a key twice, or re-read a base
binding after a key expression/hook replaces it.

No Get, HasProperty, prototype traversal, target value conversion or target call
belongs in deletion. Nested base evaluation may read: `delete o.child.x` must
Get `child`, then delete `x` without reading it. Likewise `delete o.x()` invokes
the method normally and discards its value. Data-only objects remain the supported
model; host override instrumentation verifies dispatch, not guest accessor support.

Ordinary deletion ignores inherited descriptors, extensibility, writability and
enumerability. Only an own nonconfigurable descriptor blocks it. Removing a
shadow reveals an inherited value without modifying the prototype. Arrays retain
length when deleting an index; a hole/absent index succeeds; own length fails.
Deleting/reinserting a string or symbol renews insertion order, while integer
indices remain numerically sorted. A failed deletion preserves all descriptors,
key order, prototype and array length; earlier user hook effects are not rolled back.

Use existing ToObject for primitive boolean/number/string/symbol bases, creating
a temporary box in the active evaluation Realm before any conversion hook runs.
Object bases keep their identity and original prototype even across Realms.
No base coercion hooks run. Primitive Number/Boolean/Symbol properties are absent
own properties, even when a same-named prototype descriptor is nonconfigurable.
String virtual UTF-16 indices and stored length are nonconfigurable; both fail.
An out-of-range or noncanonical String index succeeds. Numeric -0 becomes key
`0` and can fail; the literal string `-0` is not an index. Symbol keys never become
string indices. Existing explicitly boxed Strings use the same deletion dispatch.

The temporary box does not escape through deletion. Host-test factory observation
may verify its Realm/prototype and creation order, but is not guest behavior.
Do not replace allocation with type shortcuts in this task. General primitive
reads/writes still reject, including a nested read needed to obtain a delete base.
No Object/Reflect, constructors, super/private properties, optional chains,
accessors/proxies, syntax beyond delete, or new value kinds are admitted.

## Resources, diagnostics and cleanup

Reference creation itself is uncharged, as for current assignment/call targets.
Delete's unary node is charged once; evaluate the member base and key with their
ordinary ticks/frames. Do not add a target member tick. A nonreference operand
retains normal evaluation ticks/frames. ToObject, primitive keys, internalDelete,
boolean wrapping and strict false translation add zero ticks/calls. Object-key
conversion retains current charges: one canonical-symbol lookup tick; if absent,
one tick per ordinary method lookup. Calls use context.call and its shared limit.
There are no hidden fresh evaluators, budget resets or cached conversion results.

ToObject and key-conversion errors use ref.loc; false translation uses the delete
token; evaluation errors retain the child's location. User throws and overridden
internal-operation throws retain the exact value, diagnostic, location and record.
Host faults remain host faults. Evaluator finally blocks restore frames, active
Realm and active calls on success, guest failure and host failure; steps remain
monotonic. Allocation remains unbounded as elsewhere; execution limits are not
heap quotas. Exact small limits and default64 native recursion are mandatory
acceptance rows, not claims established by this design.

## Proposed single atomic assignment (not dispatched)

One future TS-025A writer owns new delete-reference.ts, minimal parser/evaluator
integration, new `test/delete-operator.ts` and runtime-read fixture, necessary
runner/native driver registration, the two current C3 migrations, scope notes
and validation evidence. No runtime/descriptor/boxing algorithm rewrite is expected.
Keep source bodies readable, type callback parameters/completions explicitly
where required by existing contracts, and reduce any compiler failure before a
workaround. If the fixed matrix contradicts observed behavior, report it instead
of silently changing the oracle.

Repeat the inventory first; preserve all 172 cases and 26 gates and add a dedicated
driver/gate plus CLI success/parse/runtime cases. Run typecheck, runner/probes,
full rebuilt Node/native cases, every static-only build and separately parsed
coverage. Retain crashes, skips, timeouts and failures independently. Runtime-read
source must be parsed by Rift, never host eval/Function/vm or another engine.
Acceptance requires all matrix rows, including host-only injection and unchanged
read/write controls. Stop for independent review; no successor or main merge.
