# Iterator cleanup semantic review

TS-506 checks 25 scenarios in strict and non-strict modes. All 50 outcomes match
explicit expected event order in Node-hosted Rift, native Rift and an independent
Node subprocess. No runtime change was justified.

The controls cover binding and assignment patterns, empty patterns, elisions,
rest exhaustion, parameter defaults, throwing targets/setters, nested iterators,
and `for…of` break/continue/return/throw. They distinguish failures in `next`,
`done`, `value`, the `return` getter and the `return` call. They also cover null,
non-callable and primitive-returning cleanup methods.

The reviewed behavior follows
[IteratorStepValue](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-iteratorstepvalue)
and [IteratorClose](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-iteratorclose):
stepping failures mark iteration done, while an existing guest throw takes
precedence over cleanup errors. Normal completion can instead be replaced by a
cleanup error. Nested controls verify inner-before-outer cleanup.

The review reuses TS-505's hash-verified diagnostic executable, compiled from the
current frozen source with 20,435 static statements and zero dynamic operations.
Every source hash in the combined milestone snapshot was checked before execution.
Inputs, expected traces, process outcomes and executable identity are retained in
`build/iterator-cleanup-review/results.json`; the producer is
`build/review-iterator-cleanup.mjs`.

This is a bounded semantic review, not full iterator conformance. Async cleanup,
suspended destructuring and resource-stop behavior are outside this selection.
Canonical source and historical fixtures remain unchanged.
