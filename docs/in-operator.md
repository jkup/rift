# Guest in operator: bounded design (TS-027P)

Design accepted at `5dd652a`, 2026-11-02. TS-027A implementation is pending independent review; see [evidence](validation/ts-027a/README.md). Dispatch base `80204eb`, inspected
checkout `66046b8`, accepted runtime `5cdf9e4`: 182 cases per host / 28 gates.
This is a design, not a new support claim. The [named matrix](validation/ts-027p/matrix.md)
and [evidence and migration audit](validation/ts-027p/README.md) are normative
parts of this bounded contract.

## Semantic path

Add ordinary `left in right` only. Keep the existing binary expression dispatcher:
evaluate/GetValue left once, stop on abrupt; evaluate/GetValue right once, stop
on abrupt; pass both captured Values to `Evaluator.binary`. In its new `in`
branch, in this exact order:

1. Require `right.kind === "object"`. Otherwise return
   `failure("TypeError", "right operand of in must be an object", loc)`.
2. Call existing `toPropertyKey(left, this.context, loc)` once. Return an abrupt
   completion unchanged.
3. Call `right.object.internalHasProperty(key.value, loc)` once. Return an abrupt
   completion unchanged; wrap its normal host boolean as a guest boolean Value.

No separate helper/module is justified for this short branch. Import
toPropertyKey from conversion.ts alongside the existing imports. Put the branch
before arithmetic/conversion fallbacks; do not change the operand dispatcher.
No new Reference, AST, lexer, context, Realm or object interface is necessary.

RHS validation precedes *left key conversion*, but follows both operand
evaluations/GetValue. Thus a left member read may convert its member key or fail
before the RHS runs. A throwing RHS evaluation wins over a poisoned left key;
a normally evaluated primitive RHS wins over the key's conversion error.
Never ToObject the RHS, convert it to a primitive, or format either operand into
the new error message. String primitives are invalid even for `length` and `0`.

ToPropertyKey uses string hint, canonical toPrimitive lookup, then the existing
ordinary toString/valueOf fallback when appropriate. Symbols retain identity;
other primitives become strings. Capture Values, not binding names to reload.
RHS effects may change the captured key object's methods before conversion.
Key effects may change the captured target's properties/prototype before presence
is checked, but rebinding either variable cannot substitute a different captured
object. No cached property/prototype/descriptor snapshot may precede conversion.

## Presence and represented objects

Reuse the existing internalHasProperty. Its iterative descriptor-dispatch walk
checks each object's getOwnProperty then its internal prototype slot. It does
not call internalGet, ownPropertyKeys, a guest hasOwnProperty method, host `in`,
or read the target property's guest Value. Undefined-valued, nonenumerable and
nonconfigurable properties count as present. Missing properties alone are false.
The descriptor implementation may copy a descriptor/construct a virtual String
descriptor; this is not semantic Get or guest coercion of its value.

GuestArray inherits this operation: holes are absent unless inherited, stored
undefined elements are present, and length is present even on empty arrays.
GuestStringObject's getOwnProperty supplies virtual UTF-16 indices; stored length
and inherited virtual properties work without materializing indices. Boolean,
Number and Symbol wrappers, ordinary objects, arrays and callable objects are all
valid RHS objects, including foreign-Realm objects. No callable/slot shortcut.
The current chain walk assumes the existing data-only object model and validated
acyclic prototypes; arbitrary exotic prototype traps are outside this task.

## Grammar and source

Give `in` precedence6 alongside <, >, <=, >=. In expression's operator admission,
accept existing punct tokens OR a word token whose text is exactly `in`.
Do not admit arbitrary words or string tokens with matching text. Keep the
existing `precedence + 1` right parse, making relational chains left associative.
Member/call and unary bind tighter, as do arithmetic; equality, logical,
conditional and assignment bind looser. Parentheses continue to erase only their
AST wrapper. Binary locations remain the expression-start location captured by
Parser.expression, not the `in` token. Preserve functionTail source ranges.

Keep `in` in RESERVED: bindings and bare `in` remain invalid; `.in` and object
literal property name `in` remain valid. Whitespace/comments/line terminators
around `in` impose no new restriction. Keep explicit semicolons and current
return/throw newline rules. No for-in grammar or AllowIn mode is needed because
for is still unsupported. No private fields, instanceof, shift operators,
accessors, proxies, broad reflection, boxing or binding-scope changes.

## Resources and errors

Retain statement/evaluate tick-before-depth guards and their finally cleanup.
The branch itself adds no tick/frame/call. A prebound primitive-key `k in o;`
costs four ticks (statement, binary, left, right), maximum depth3. RHS validation,
primitive ToPropertyKey and presence traversal add zero. An object key adds
the existing canonical lookup tick, and each attempted ordinary method adds its
existing tick; hook bodies and evaluator calls retain their normal charges.
Do not add per-prototype ticks or reset a budget for this operator.

New RHS errors and key-conversion operations receive the binary location.
Operand failures retain their operand locations; user throws and internal
sentinels retain original identity/diagnostic. Host faults escape unchanged.
The operator itself does not switch Realm or allocate a wrapper; context.call
switches to a hook's defining Realm and restores it in finally. Check restored
calls/depth/Realm on success, guest throws, resource limits and host faults;
steps remain monotonic. Native actual default64 recursion is required, with
fixed recurrences in R18-R23, not merely small configured limits.

## Eventual implementation boundary

One implementation writer should own minimal parser/evaluator edits, dedicated
readable named driver, runtime-read fixtures, one native driver gate and runner
registration, scope/evidence updates and task handoff. No test is implemented here.
Run typecheck, runner, probes, rebuilt Node/native suites, every static-only build
and separately parsed coverage. Preserve all 182 baseline cases and 28 gates,
all existing internalHasProperty/Array map controls and historical evidence.
No current guest rejection assertion needs removal (see audit). Add explicit
positive and negative CLI phase cases with literal expectations. Failure or
contradictory oracles require retained evidence and review, not weakened tests.
No concrete new compiler pattern currently warrants an isolated probe.
