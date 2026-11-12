# Contextual identifier boundary review

TS-499, 2026-11-12. This review compares 168 unchanged diagnostic sources against
Node syntax checking and bounded preparation in the isolated TS-496 successor.
It changes no parser admission and makes no native or conformance claim.

| Name | Cases | Valid in Node | Invalid in Node | Valid accepted by Rift |
| --- | ---: | ---: | ---: | ---: |
| let | 56 | 23 | 33 | 4 |
| yield | 56 | 24 | 32 | 4 |
| await | 56 | 48 | 8 | 4 |
| Total | 168 | 95 | 73 | 12 |

Rift accepts the property-name controls and leaves the other 156 sources
explicitly unsupported, including 83 valid sources. No invalid source is accepted
or newly certified. Each name has 28 contexts in strict and sloppy Script mode:
bindings, references, assignment, parameters, functions, arrows, patterns, catch,
labels, properties, classes, generators, async functions and loop heads.

The names need separate rules. `let` and `yield` are forbidden as identifiers in
strict code; `await` is not forbidden by strictness alone. Yield/Await grammar
parameters impose additional restrictions, and the Module goal has its own
`await` restriction. See [Identifier early errors](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-identifiers-static-semantics-early-errors),
reviewed against the current ECMAScript 2027 draft. Lexical declarations also
forbid binding the name `let` even in sloppy code; see [lexical declaration early
errors](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-let-and-const-declarations-static-semantics-early-errors).

The independent Node controls confirm that a nested ordinary function resets the
surrounding generator/async restriction: its `yield` or `await` binding can become
valid, subject to inherited strictness. A class named `await` is valid in these
Script controls, while an `await` binding inside a class static block is invalid.
Property and method names remain separate from identifier references.

The next implementation should handle `await` with explicit grammar context,
including ordinary nested functions and class static blocks, rather than adding
it to TS-496's strict-only predicate. Review parameter/default-initializer,
arrow-cover and line-terminator interactions before admission. Keep Module goal
support separate. `yield` then needs generator-context and strictness checks;
`let` also needs declaration/lookahead disambiguation and lexical-binding rules.
None should be enabled by simply removing it from the reserved-word set.

The current parser's `functionTail` clears `asyncContext` and `generatorContext`
before parsing parameters, then enables them for the body. Those flags therefore
cannot alone decide whether a parameter name is valid. `classStaticBlock` uses
the await-expression path to detect forbidden suspension, while ordinary nested
functions reset it. Preserve these boundaries when introducing identifier grammar
context; add focused parameter and nested-function controls before changing it.

Evidence: `build/contextual-identifier-review/results.json` retains every source,
Node status/diagnostic and Rift classification. Reproducer:
`node build/review-contextual-identifiers.mjs`. The original output is preserved
on rerun. This is a syntax review; guest execution and native validation remain
requirements for any future implementation.
