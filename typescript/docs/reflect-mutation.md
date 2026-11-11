# Reflect object mutation

TS-469 is in progress. Reflect exposes `defineProperty`, `deleteProperty`,
`preventExtensions` and `setPrototypeOf` through the existing object internals.
Rejected changes return false; invalid inputs and abrupt conversions still throw.

Object and Reflect share descriptor conversion. Target checks precede key
conversion, which precedes descriptor conversion. Each mutation checks the step
budget before entering its internal operation. Array-length truncation retains
the existing partial-deletion behavior when an undeletable index blocks it.
Prototype changes preserve identity, extensibility and cycle rules.

The design and specification links are in `reflect-mutation-review.md`.
Twenty-three independent Node reference checks pass. Focused Rift Node tests add
inherited descriptors, exact abrupt values, omitted descriptors, mapped arguments,
immutable prototypes and foreign-Realm mutation/errors. A budget sweep tests
interruption and completion for every operation through normal Script execution,
checking that interrupted operations leave their target unchanged and restore
the session. An initial direct-invocation test correctly hit the builtin context
guard; the retained test source is `build/initial-direct-budget-test.ts`.

Typechecking and focused Node tests pass; full Node and native validation remain
pending. Historical fixture inputs and expectations are unchanged. Reflect
property access and `apply` remain separate increments.

Isolated validation is READY: 938/938 Node guests, focused native execution, nine native regression groups, fifteen tooling builds, 296 tooling tests, eight codec records per host and sixteen parent-envelope checks pass. Canonical integration remains pending the frozen private-field rollup.
