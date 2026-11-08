# Binary Math operations

TS-078 adds atan2, pow and imul with arity two and standard builtin descriptors.
Both arguments undergo numeric conversion in order, even when the first number
is NaN or zero. A failed first conversion prevents the second. Missing arguments
become undefined; extra arguments are not coerced. Primitive host Math operations
run only after guest conversion succeeds. Unary and extrema methods share the
same small numeric-conversion helper without changing their resource checks.

This follows [atan2](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.atan2),
[pow](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.pow) and
[imul](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.imul).
The C++ implementations were consulted; the pow early return for missing
arguments and documented infinity uncertainty are not copied. The reduced
native probe passes static coverage and agrees with Node on power exceptions,
signed-zero quadrants and integer wrapping (`build/math-binary-probe-*`).

Tests cover numeric boundaries, missing/extra arguments, ordered effects and
throws, Realm ownership, metadata and budgets. Acceptance pending.
