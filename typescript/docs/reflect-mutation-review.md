# Reflect mutation review

TS-469, 2026-11-11. Reference review only; implementation waits for the Reflect
introspection native regression gates.

Add `defineProperty`, `deleteProperty`, `preventExtensions` and `setPrototypeOf`
through existing object internals. Preserve their boolean results: an ordinary
rejected mutation returns false, while invalid inputs and abrupt conversions
still throw. Reuse descriptor conversion with Object.defineProperty so field
ordering, inherited descriptor properties and accessor validation stay shared.

Target validation precedes key conversion; descriptor conversion follows the
key. Preserve partial array-length truncation when a non-configurable index
blocks deletion. Prototype changes must preserve identical-prototype success
on non-extensible objects and reject cycles without mutation. Charge work before
any mutation and retain the defining Realm for generated errors.

These requirements follow the specification's
[Reflect operations](https://tc39.es/ecma262/multipage/reflection.html).
Twenty-three independent Node reference programs pass in
`build/review-reflect-mutation-reference.mjs`, with results in
`build/reflect-mutation-reference.json`. They are expectations, not Rift
acceptance. Add direct budget-before-mutation and cross-Realm tests during
implementation. Keep property access and `apply` separate, and preserve existing
Object and Reflect behavior through both-host regression tests.

Isolated validation is READY: 938/938 Node guests, focused native execution, nine native regression groups, fifteen tooling builds, 296 tooling tests, eight codec records per host and sixteen parent-envelope checks pass. Canonical integration remains pending the frozen private-field rollup.

