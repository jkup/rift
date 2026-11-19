# Abstract equality: TS-024P frozen proposal

Design only, 2026-11-02. Assignment base `1a438b5`; inspected checkout
`c695409c`; accepted runtime `0de8488`. This document does not add support.
See [evidence](validation/ts-024p/README.md) and the independently specified
[acceptance matrix](validation/ts-024p/matrix.md). All matrix rows are required
in a future implementation; no row is an executed equality test today.

## Boundary and current paths

Represented kinds are undefined, null, boolean, number, string, symbol, object.
Arrays, functions and primitive boxes are objects, not extra comparison kinds.
BigInt and HTMLDDA are absent. No new syntax other than the two equality tokens,
no guest Symbol factory, implicit boxing, accessor, proxy or Number formatting
work belongs here. Preserve strict equality, SameValue, truthiness and diagnostics.

`lexer.ts` currently recognizes three-character strict operators first and rejects
the two loose operators. `parser.ts` builds a string-op binary Expr at precedence
5 for strict equality. Its right operand uses precedence + 1, giving left
association. Binary locations are the expression's initial token, not the operator.
`Evaluator.expression` evaluates/GetValues left then right before `binary`.
`runtime.equal` already implements strict kind/payload/identity comparison;
`sameValue` intentionally differs for NaN and signed zero. Neither may change.
`conversion.stringToNumber` owns string grammar and a validated binary64 backend.
`toPrimitive` owns the canonical symbol lookup and default-hint ordinary fallback;
all guest calls go through the evaluator's context and shared guards.

## Proposed API and algorithm

Add `src/abstract-equality.ts`, exporting
`isLooselyEqual(x: Value, y: Value, context: OperationContext, loc: Location): InternalBooleanCompletion`.
Reuse runtime.ts's existing normal-boolean-or-throw union; no duplicate boolean
completion type or runtime type/API relocation is required.
Import `equal`, `stringToNumber`, `toPrimitive` and type-only dependencies.
The evaluator wraps the resulting host boolean in a guest boolean Value once.

Use a readable iterative dispatch with local `left` and `right` Values:

1. Same kind: return `equal(left, right)` immediately.
2. Null/undefined in either order: true.
3. Number/string or string/number: replace only the string with a number Value
   using `stringToNumber`, then repeat.
4. Left boolean: replace with number 1 or 0 and repeat; otherwise do the same
   for a right boolean.
5. String, number or symbol opposite an object: convert only that object with
   `toPrimitive(object, "default", context, loc)`, return the original throw
   unchanged if abrupt, otherwise replace it and repeat. Implement mirrored
   branches explicitly; do not swap arguments through recursive calls.
6. All remaining pairs: false.

The loop terminates independently of budgets: weight object=3, boolean=2,
string=1, all others=0 strictly decreases on every continuation. ToPrimitive
cannot return an object normally, so the maximum initial weight is six.
Two objects exit at step 1; consequently at most one object conversion occurs
per invocation. Guest hooks may reenter equality, but guest calls retain the
existing call/step/frame guards. Do not add equality recursion or mutable guards.

No host `==`/`!=` over guest Values, eager ToNumber, Symbol numeric conversion,
or truthiness-based equality is permitted. A hook returning null compared with
zero is false; an object compared with null never reaches that hook. Symbols
compare by payload identity; symbol versus object can invoke that object's hook.
Same/different object comparisons never inspect properties, even on wrappers.

## Frontend and evaluation integration

Move `==`/`!=` from the rejected two-character list to the accepted list, keeping
the three-character branch first and all token offsets/locations unchanged.
Extend precedence 5 to all four equality operators. No new Expr alternative.
Preserve assignment right association, ternary arms, logical short circuit,
unary precedence, unsupported operators and existing nesting limits.

In `binary`, add one dedicated loose-equality branch. It calls
`isLooselyEqual(right, left, this.context, loc)` on the already captured Values.
This follows fixed 2025 section 13.11.1's argument order; it does not reverse
operand evaluation. Return any throw record verbatim. Only a successful result
is negated for `!=`. The strict branch and all other operators stay unchanged.

Left evaluation failure prevents right evaluation; right failure prevents all
equality coercion. Mutation while evaluating the right operand may change a
method on a captured left object, but cannot replace its captured identity or a
captured primitive. Property-key conversion performed while evaluating an operand
belongs to that operand evaluation, not the later equality algorithm.

## Charges, failures and Realm ownership

Equality dispatch, primitive replacements, strict comparison and result negation
charge zero ticks and make zero calls. Existing evaluate entry ticks remain.
ToPrimitive charges one tick before protocol lookup; ordinary fallback charges
one tick per attempted method lookup. Missing/noncallable ordinary methods still
consume their lookup tick. Calls themselves charge no tick; builtin bodies and
guest AST evaluation retain their own charges. Data-only internalGet traversal
does not acquire a new per-link tick. Do not compensate with an arbitrary cap.

Loc is passed unchanged to conversion/tick/call. Conversion-created TypeErrors
and guard errors use it. Existing guest throws, internal Get failures and hook
throws preserve the original completion, value, diagnostic and location identities.
No catch converts host implementation faults to guest errors. Context.call's
finally restores active Realm and call count after success, guest throw or host
fault. Steps are monotonic and never refunded; equality has no cleanup state.
Cross-Realm hooks execute in their defining Realm through the original context.

The matrices freeze exact small boundaries. Default limits remain 100000 steps,
64 calls and 256 evaluator frames; parser nesting remains 128. Future tests must
exercise native recursive hooks at the actual default call guard, as well as
small boundaries. A crash is a blocker. Existing array-cycle and allocation
limitations remain; no equality-specific allocation or unlimited-stack claim.

## Smallest implementation and migration

Propose one atomic successor only after independent review. Own new helper,
`src/lexer.ts`, `src/parser.ts`, the dedicated evaluator branch/import;
`test/abstract-equality.ts`, a runtime-read `test/fixtures/abstract-equality.js`,
minimal driver registration in `tools/build-native.mjs`/`tools/run-guests.mjs`
and manifest/tsconfig changes only if actually needed. Preserve all 167 existing
cases and 25 static gates; add the new driver/gate and guest cases.

Migrate `test/array-string-conversion.ts` C2 from expected rejection to successful
`empty == 0` and `empty != 0` results; replace the C2 fixture comment with actual
assertions. Retain C3 delete rejection/internal coverage. Update current feature
inventory and architecture scope notes, linking historical evidence rather than
rewriting its failures. Full inventory and controls are in the validation folder.
Do not change runtime.equal/SameValue, primitive conversion, wrapper methods,
existing strict assertions, compiler pins/workarounds or assistance tooling.

Validation: typecheck, runner 20/20, probes 10/10, rebuilt full Node/native suites,
all existing and additional static-only builds plus separately parsed coverage.
Use explicit expected booleans, traces and error phases in both hosts; symbol,
box, null-root, foreign-Realm and resource setup may use host injection, but guest
source must be read at runtime and interpreted only by Rift. Retain any compiler
failure/reduction before considering a workaround. Matrix coverage is separate
from suite denominator. Do not silently drop old failures to increase counts.
