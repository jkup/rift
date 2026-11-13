# Contextual yield identifiers

Bounded Script preparation admits yield bindings, references and labels in sloppy
code outside generator grammar contexts. A separate reservation flag covers
generator parameters as well as bodies, without changing yield-expression
execution. Generator declaration names inherit the outer grammar context;
generator expression names reserve yield. Ordinary functions and arrow bodies
reset the context, while arrow heads inherit it.

Strict scopes use the existing strict-reserved-identifier audit after complete
parsing. This includes function-local directives and class bodies. Incomplete
grammar and reserved generator positions remain explicitly unsupported. The
legacy parser and public non-certifying plans retain their existing contracts.

See the [identifier rules](https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html#sec-identifiers)
and [generator definitions](https://tc39.es/ecma262/2026/multipage/ecmascript-language-functions-and-classes.html#sec-generator-function-definitions).
The independent Node review records 72 function/parameter/strictness controls;
combined with prior identifier and suspension cases, all 136 pass the candidate.
Focused checks pass 36 execution cases, nine strict errors, eleven unsupported
controls and the original strict-identifier driver. The historical
`var yield=1;` input remains in that driver with an explicit ready expectation.

Full Node regression passes 954/954 without skips, and all 35 runner tests pass.
The 1067 source/control inputs are frozen; ownership and exact manifest additions
are verified against READY TS-501. Focused execution, the historical driver and
all 136 syntax controls pass both hosts. All 15 native tooling builds pass static
compilation and zero-dynamic coverage; all 296 tooling tests pass without skips.
Eight strict-error producer records per host and 16 envelopes pass the closed
protocol checks. Final readiness checks verify source and executable hashes,
predecessor ownership and exact manifest additions. Integration and combined validation passed in the contextual identifiers milestone.
