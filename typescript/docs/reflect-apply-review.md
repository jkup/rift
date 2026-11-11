# Reflect.apply review

TS-471, 2026-11-11. Reference review only; implementation waits for Reflect
property-access native regression gates.

Validate callability before inspecting the argument list. Require an object,
read its length once, then read each indexed value in order before calling the
target. Use array-like semantics, not iteration. Preserve inherited entries,
holes, abrupt getters, exact receivers and defining-Realm behavior. Class
constructors pass the callability check but throw when called, after argument
conversion. Bound functions retain their bound receiver and arguments.

The existing Function.prototype.apply and Reflect.construct contain this list
conversion. Share it in `array-like.ts`, keeping caller-specific checks and
diagnostics outside the helper. Function.prototype.apply still accepts nullish
lists as empty; Reflect.apply and construct reject them. Preserve per-index
budget checks and the same Value-array type.

The [C++ Reflect implementation](../../src/builtins/reflect/reflect.cpp) also
separates list conversion from call and construction. Reuse that separation,
while retaining Rift TypeScript's incremental budgeted collection.

This follows the specification's
[Reflect.apply algorithm](https://tc39.es/ecma262/multipage/reflection.html#sec-reflect.apply).
Nineteen independent Node reference checks pass in
`build/review-reflect-apply-reference.mjs`; results are retained in
`build/reflect-apply-reference.json`. Receiver-sensitive functions declare strict
mode explicitly. Add async, foreign-Realm, budget and existing apply/construct
regressions during implementation. These references are not Rift acceptance.

Implementation now shares budgeted array-like conversion across all three callers. Typechecking, twenty-five focused guest programs, async/Realm/budget tests, Function.apply and construct-target regressions, and eight producer-codec records pass under Node. Full 940-guest Node validation is running; native validation remains pending. The prerequisite Reflect access focus and all ten native regression runs passed before implementation began.

