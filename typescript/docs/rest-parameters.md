# Identifier rest parameters

TS-142 admits a final identifier rest parameter in Script function declarations, expressions, methods and arrows. The parser shares parameter-list handling between ordinary functions and arrows, retains the rest name in the function's formal bindings, and records whether the final parameter is rest. Function length excludes that parameter.

Activation creates a fresh array in the function's Realm and defines ordinary writable, enumerable, configurable indexed properties for the remaining argument values. It charges each copied value to the active budget. Arguments are already an internal list, so this step does not consult a guest iterator or inherited array setters. Existing var/function binding behavior and closure capture remain intact.

Rest must be last, cannot have a default or trailing comma, and makes duplicate parameters invalid. Setters cannot use rest. An own use-strict directive with rest parameters is rejected; inherited strictness is allowed, while escaped or parenthesized strings remain ordinary expressions. These rejections use explicit unsupported-syntax outcomes; this task does not expand certified syntax rules. Defaults, destructuring and arguments objects remain separate work.

References consulted 2026-11-09: ECMAScript [Function Definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-function-definitions) and engine262 [IteratorBindingInitialization](https://github.com/engine262/engine262/blob/main/src/runtime-semantics/IteratorBindingInitialization.mts). Rift follows fresh-array creation and data-property binding, using direct iteration over its internal argument list.

Acceptance pending.
