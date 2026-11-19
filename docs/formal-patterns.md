# Formal binding patterns

Function declarations/expressions, generator functions, methods, constructors and
accessors accept array/object binding patterns, including rest and defaults.
Parenthesized arrow pattern cover grammar remains a separate boundary.

Each formal retains its argument position separately from its bound names. Empty
patterns consume one argument; a pattern with several names still contributes one
to function length. Length stops at the first top-level default or rest formal.
The declaration planner uses flattened binding sites for conflicts and TDZ cells.

Non-simple parameter lists disable mapped arguments. Parameter expressions are a
different property: nested defaults and computed object keys require the existing
separate parameter/body environments. A plain pattern alone does not. Computed
keys retain a syntax flag even when their expression is a literal.

Initialization reuses the pattern evaluator in the active function frame. Generator
parameters run when the generator is called, before body suspension. No evaluator
or old session is retained. Expected-result tests cover timing, aliases, closure
scope, rest arrays, defaults, eval, iterator close, strict errors, Realm ownership
and resource stops. Original rejected inputs are preserved as positive regressions.

The unchanged original generator-destructuring-test.js passes Node and native with
a retained input hash. Static-only and zero-dynamic checks pass. Full integration
and acceptance remain separately tracked in TASKS/COORDINATION.

Design references: [ECMA-262 2025 FunctionDeclarationInstantiation](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-functiondeclarationinstantiation)
and [engine262 FDI at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/FunctionDeclarationInstantiation.mts).

The initial combined tooling run passed 292/293. E38 now reaches duplicate-bound-name rejection after formal pattern parsing; the current audit expectation was migrated explicitly while its frozen input/output evidence remains unchanged. The focused parser audit rerun passes all five tests on both hosts.
