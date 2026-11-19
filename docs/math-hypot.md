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

Both guest suites pass 533/533, full tooling290/290, runner30 and probes10 pass. All 89 native entries pass build and static coverage in one invocation; Math driver5235/5235 static. All 225 C++ fixture results agree across hosts: 67 reported successes, 31 unchecked completions, 53 parse errors, 72 runtime errors and two reported failures under the current marker-only classifier. All 97 previously successful or unchecked files retain their outcomes. The Math fixture now completes and prints 69 passed, 0 failed; the classifier does not yet recognize this summary. Review also found two unchecked fixtures printing failure summaries for missing splice/JSON.parse; roadmap records the reporting gap. Reports: build/legacy-suite-node-yC4VX2/report.json and build/legacy-suite-native-NVilGl/report.json. Logs: build/math-hypot-*.
