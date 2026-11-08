# Math constants and unary operations

TS-071 adds a fresh Math object to each Script Realm with `E`, `LN10`, `LN2`,
`LOG10E`, `LOG2E`, `PI`, `SQRT1_2` and `SQRT2`, plus `abs`, `ceil`, `floor`,
`round`, `sign` and `trunc`. Constants are fixed non-enumerable data properties.
Methods have standard builtin descriptors and arity one. Math is neither
callable nor constructible, and its configurable toStringTag is "Math".
Legacy globals stay unchanged. Other Math methods remain separate work.

Each method converts its first argument with a number hint; missing arguments
become NaN and extra arguments are not coerced. Conversion hooks, abrupt values,
error Realm ownership and resource limits use the existing call machinery.
Only primitive numeric operations reach the host Math backend. Tests use literal
expected values for infinities, NaN, signed zero, rounding ties and the value just
below one half, plus coercion, descriptors and Realm isolation controls.

This follows [the Math object](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math-object),
including [round](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.round).
The C++ Math implementation was consulted; its negative-tie rounding branch is
not copied. A small native rounding probe agrees with Node on the boundary cases
(`build/math-round-probe-*`); no compiler workaround is needed.

Native acceptance pending.
