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
throws, Realm ownership, metadata and budgets. Both guest suites pass 524/524, full tooling290/290, runner30 and probes10 pass. All 89 native entries pass build and static coverage in one invocation; Math driver5168/5168 static. The reduced binary Math probe passes static coverage and both executions without a workaround. All 225 C++ fixture results agree across hosts: 67 reported successes, 30 unchecked completions, 53 parse errors, 73 runtime errors and two reported failures. All 97 previously successful or unchecked files retain their outcomes. The Math fixture reaches missing clz32. Reports: build/legacy-suite-node-58xzVm/report.json and build/legacy-suite-native-LoaZzM/report.json. Logs: build/math-binary-*.
