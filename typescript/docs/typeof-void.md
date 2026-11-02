# Typeof and void: bounded design (TS-026P)

Design for review, 2026-11-02; not implemented. Dispatch base `b856f28`,
accepted runtime through `27e5b27`: 177 cases in each host, 27 native gates.
[Named acceptance matrices](validation/ts-026p/matrix.md) and
[sources, migration inventory and validation limits](validation/ts-026p/README.md)
are part of this contract.

## Semantic boundary

Add only `typeof` and `void` to the existing unary grammar. For typeof, an
unresolvable identifier yields the guest string `undefined`; a resolved but
uninitialized binding still throws the existing ReferenceError. Parentheses
preserve the identifier AST, so the exception includes `typeof (((missing)))`.
It does not apply to missing names inside calls, members, assignments, logical
or conditional expressions. Never catch a ReferenceError and turn it into a
string: user throws and property/key failures must propagate unchanged.

Void evaluates its operand and obtains its Value exactly once, then returns
`normal(UNDEFINED)`. Both operators propagate an abrupt operand completion
unchanged. Neither converts the resulting Value, invokes it, boxes it, formats
it, or reads its visible properties. A member operand still performs ordinary
GetValue, including deferred ToPropertyKey and internalGet. That computation
can invoke guest code; this is distinct from classifying/discarding its result.

The complete classification is:

| Represented Value | typeof guest string | void result |
|---|---|---|
| undefined | `undefined` | UNDEFINED |
| null | `object` | UNDEFINED |
| boolean | `boolean` | UNDEFINED |
| number (including NaN, infinities and both zeros) | `number` | UNDEFINED |
| string (including empty and lone surrogates) | `string` | UNDEFINED |
| symbol (any identity/description) | `symbol` | UNDEFINED |
| object with `callable === null` | `object` | UNDEFINED |
| object with guest or builtin callable slot | `function` | UNDEFINED |

Use an exhaustive typed `typeOfValue(value: Value): GuestString` switch in a
small `src/typeof.ts` module. No context, location, completion, call, tick or
conversion is needed by this pure helper. Inspect only the readonly callable
slot for objects. Do not use host typeof over the guest record, instanceof a
wrapper class, function source availability, prototype ancestry, `.call`,
`.name`, `.length`, `toString`, valueOf or a symbol tag. Number is currently a
noncallable namespace and therefore reports `object`. Function.prototype is
callable and reports `function`. Foreign Realm objects use the same rule.

## Smallest integration

`Parser.primary` recognizes the two word tokens alongside !, +, -, delete and
parses the operand with `expression(9)`. Keep RESERVED membership, binding
rejection, member/call precedence, parentheses erasure, explicit semicolons,
source offsets and existing syntax limits. No lexer or AST shape extension.
There is no newline restriction after these operators. Existing return/throw
newline restrictions remain. Unary results are not assignment targets.

For the direct identifier exception, extend `Evaluator.evaluate` with a named
optional boolean `allowUnresolvable = false`. After its existing tick, depth
entry and inside its existing try/finally, when that flag is true AND expr.kind
is identifier, call `reference` once. Only a binding reference whose environment
is null returns `normal(UNDEFINED)` without getValue. Every resolved reference
goes through getValue at the identifier location. Otherwise call the existing
expression dispatcher. Do not pass this flag to expression or any child.
The typeof unary branch calls `evaluate(operand, env, receiver, true)` and maps
normal values through typeOfValue. Thus a missing name and initialized undefined
converge only after reference resolution; TDZ is never suppressed. All other
evaluate callers retain their current behavior. This localized flag avoids
duplicating guards or broadly changing Reference/Environment APIs.

Void uses the normal evaluate path, returning normal() only on normal completion.
Put these branches before numeric ToPrimitive/ToNumber fallback; preserve ! and
delete. Do not refactor unrelated evaluation paths or add a global typeof mode.

## Effects, locations and budgets

Keep the current statement/evaluate tick-before-depth order. A unary operand
identifier costs one tick and one depth entry even if missing. Classifying or
discarding a Value costs zero additional steps/calls/frames. A single expression
statement `typeof x;` or `void x;` costs three ticks: statement, unary, identifier.
Parentheses add none. Binding resolution walks the existing environment chain
without a new tick and stops at the nearest binding, including TDZ.

For members, evaluate base then key expression once, capture both Values, check
object-only base, convert the captured key once, and read once with the captured
base receiver. Preserve getValue's existing restriction: all primitive bases,
including strings and nullish values, fail before key conversion (but after key
expression effects). This is a documented limitation relative to ECMAScript's
primitive boxing, not a new typeof/void exception. Delete's accepted explicit
boxing exception is unchanged. Key hooks may mutate the target before its read.

New guards use their AST node location. Binding failures use operand identifier
location; member base/key-conversion failures use member location; existing
operand call and user-throw diagnostics are retained, never relocated to unary.
Host faults remain host faults. Existing evaluate/call finally blocks restore
depth, call count and active Realm on success, guest abrupt, limits and host faults.
Step counts remain monotonic, including the failing tick. Operators themselves
never switch Realm or reset a budget. See R rows for fixed boundaries.

## Eventual implementation and acceptance

One atomic writer should own the pure helper, minimal parser/evaluator changes,
`test/typeof-void.ts`, runtime-read fixtures, one additional host-driver registration
and static coverage gate, current delete-test migration, scope docs and retained
evidence. The matrices specify source tests and host-injected values separately;
host injection supplies absent syntax/factories, not claims of guest availability.
Use literal expected values, traces and diagnostics, not one engine as oracle.
Preserve all 177 baseline cases/27 gates and assertions other than the two named
rejection migrations; add meaningful CLI success/parse/runtime phase cases.
Run typecheck, runner, probes, rebuilt Node/native suites and every static-only
build plus separately parsed coverage. Native default64 recursion is mandatory.
Record failures and reduce actual compiler uncertainty before workarounds.

No BigInt, HTMLDDA, accessors, proxies, with, eval, new constructors, optional
chains, scope overhaul, sloppy-delete, full strict Scripts, new unary operators,
general implicit boxing, source normalization, formatter support or pin changes.
No production or integrated tests are changed in this design task. No probe is
justified by the already demonstrated boolean parameter, switch and Value paths.
