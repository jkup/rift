# Array every and some

TS-051 adds generic `every` and `some`. Both capture length before validating the
callback, check property presence before reading each element, and invoke the
callback with the value, index and boxed receiver. Missing properties are skipped;
inherited properties are visited. Callback changes affect later property reads,
but cannot extend the original traversal range.

The methods share one traversal because their operations differ only in the
Boolean result that stops iteration. `every` stops on false and otherwise returns
true; `some` stops on true and otherwise returns false. Callback results use guest
truthiness without coercion hooks. Existing call machinery handles `thisArg`,
strict/sloppy callbacks, Realm transitions and call limits.

Each index consumes the shared step budget, including holes. Abrupt property
operations and callbacks stop traversal immediately. The methods do not write
the receiver themselves.

Sources: ECMA-262 [every](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.every)
and [some](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.some),
checked against [engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/ArrayPrototype.mts).

The host driver checks traversal order, callback arguments, short-circuiting,
inherited elements, live mutations, callable-validation order, abrupt completion
and sparse-loop budgets. CLI cases cover callback truthiness, primitive receivers,
strict/sloppy `this`, errors, holes and method metadata. The Node guest suite
passes 299/299; native acceptance is pending the fresh full build.

Two test callbacks always throw host faults. Their return type is explicitly
`ValueCompletion`: scriptc 0.4.7 otherwise infers `never` and inserts a dynamic
adapter when assigning the callback to the builtin interface. A three-statement
probe reproduced this, and the annotation removes the dynamic statement. The
focused native driver then builds, passes static coverage and executes successfully.
