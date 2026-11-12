# Yield identifier grammar review

TS-502 extends the contextual identifier work from await to yield. The isolated
implementation builds on frozen TS-501; integration requires that predecessor
to become READY and the canonical native milestone to pass acceptance.

The [identifier grammar](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html#sec-identifiers)
permits yield identifiers outside a Yield grammar context, with a separate
strict-mode restriction. The [generator grammar](https://tc39.es/ecma262/2026/multipage/ecmascript-language-functions-and-classes.html#sec-generator-function-definitions)
distinguishes declaration names, which inherit the outer context, from generator
expression names, which reserve yield.

The Node syntax review records 72 cases: 19 valid and 53 invalid. The frozen
predecessor admits four valid cases and no invalid cases. Reviewed boundaries
include generator names and parameters, ordinary functions nested in generators,
arrow heads versus bodies, async functions/arrows, class fields and static blocks,
and inherited or function-local strictness. Sources and reference diagnostics are
retained in `build/yield-identifier-context-review.json`.

The candidate keeps identifier reservation separate from generator execution
context, since parameter parsing disables yield expressions without permitting a
yield binding. Ordinary function and arrow bodies reset the identifier context;
arrow heads inherit it. Strict identifier sites reuse the existing complete-source
declaration audit. Generator-context violations remain explicitly unsupported,
and incomplete grammar cannot gain a syntax-error certificate.

Initial candidate checks pass all 136 reviewed syntax controls (the original 56,
these 72, and eight suspension controls), 36 execution cases, nine strict errors,
eleven unsupported controls, the prior strict-name driver, and typechecking.
The exact historical `var yield=1;` source is retained with an explicit ready
expectation. Full Node regression passes 954/954 without skips, and all 35 runner
tests pass. The 1067 source/control inputs are frozen, and ownership checks pass
against READY TS-501. Native validation remains pending. No conformance
denominator or original C++ fixture is changed.
