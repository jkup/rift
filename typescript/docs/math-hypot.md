# Math hypot

TS-080 adds variadic Math.hypot with arity two and standard builtin descriptors.
Every argument is converted once in order. Conversion continues after infinity
or NaN, and an abrupt completion stops the call. After successful conversion,
infinity takes precedence over NaN; empty and all-zero inputs return positive zero.

Finite magnitudes are divided by the largest input before squaring. Kahan
compensation preserves small terms during accumulation; the square root is then
scaled back. Conversion and summation both consume the active budget. The
temporary numeric list avoids repeated guest coercion and is bounded by that
budget.

This follows [Math.hypot](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.hypot).
The C++ implementation was consulted. Its early infinity return, repeated
coercion and unscaled summation for three or more arguments are not copied.
Tests cover exact triples, very large/small inputs, accumulated small terms,
special values, coercion order and errors, Realm ownership, metadata and budgets.

Acceptance pending.
