# Classic-for declaration review

TS-544 reviewed fifteen explicit Script controls. Reference Node processes pass
all expected outputs. The hash-verified unscopables CLI and Node-hosted Rift agree:
single-name lexical loops, identifier var lists and for-of patterns pass; twelve
classic-for list/pattern controls retain parse rejection. Raw inputs and process
results are in `build/classic-for-context-review/`. Neither candidate source
snapshot changed during this review.

The controls cover multi-name iteration closures, pattern-bound names, closures
created in an initializer, continue/update order, const lists, empty patterns,
TDZ, abrupt initializers, var patterns, suspended initializers and parenthesized
`in` expressions. They establish concrete requirements, not a conformance score.

The current engine has four single-binding assumptions to replace together:

- `ForLexicalStmt.binding` stores one site and initializer.
- Declaration planning and executable association validation attach one
  declaration and initializer span to that loop.
- Loop initialization evaluates and initializes one name.
- `#prepareForIteration` reads one value and passes it to `activateLoop`.

The standalone declaration-list candidate supplies ordered declaration nodes and
shared initialization. Reuse those operations for loop initialization, while
retaining explicit bound-site and initializer associations for every name.
Do not bypass executable association validation or flatten a lexical loop into
an ordinary block. Var patterns require the corresponding nonlexical initializer
path without introducing lexical bindings.

Create all lexical names before evaluating any initializer. For `let`, copy every
bound name into the next iteration environment before the first test and before
each update. The initializer environment remains distinct, so closures created
there retain it. Const loops keep their environment; empty patterns have no
per-iteration names to copy. Preserve continue labels, abrupt completion, outer
environment restoration and suspended execution.

Parser disambiguation must preserve the difference between classic-for lists and
single-binding for-in/of heads, including NoIn grammar. Keep invalid multiple
for-in/of bindings rejected. Tests must cover duplicate/conflicting names,
initializer spans, early errors, source identity, Realm ownership and resource
stops as well as the fifteen reviewed outputs.

C++ source in `parser_statements.cpp` has separate classic-for pattern handling
and routes identifier-first lists through `parse_variable_declaration`. This is
source-level parity evidence; no C++ binary execution or exhaustive correctness
claim is implied.

Reference: [ECMAScript 2025 ForBodyEvaluation and CreatePerIterationEnvironment](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-forbodyevaluation).
