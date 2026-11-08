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

Both guest suites pass 470/470, full tooling290/290, runner30 and probes10 pass. All 85 native entries pass build and static coverage in one invocation; Math driver4969/4969 static. All 225 C++ fixture results agree across hosts: 66 reported successes, 30 unchecked completions, 55 parse errors, 72 runtime errors and two reported failures. Two files gain reported success and the builtin-descriptor fixture completes without checks; all 93 previously successful or unchecked files retain their outcomes. Reports: build/legacy-suite-node-xzbF9i/report.json and build/legacy-suite-native-wdyedR/report.json. Logs: build/math-unary-*.

## Min and max (TS-073)

Variadic min/max convert every argument in order, including arguments after NaN.
The accumulator keeps NaN while still allowing later conversion errors to escape.
This avoids an intermediate numeric array without changing observable conversion
order. Signed zero is selected explicitly: min prefers -0 and max prefers +0.
Empty lists return positive and negative infinity respectively. Both methods have
arity two, standard descriptors and per-argument resource checks.

This follows [Math.max](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.max)
and [Math.min](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.min).
The C++ implementation's early NaN return and order-dependent zero selection are
not copied. Tests cover both zero orders, conversion effects and throws, captured
arguments, Realm ownership, descriptors and resource boundaries. Acceptance pending.
