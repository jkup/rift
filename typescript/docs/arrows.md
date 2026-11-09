# Simple arrow functions

TS-141 adds Script arrows with unique identifier parameters, expression/block bodies and lexical this. Expression bodies become a return node; declaration collection retains their source and treats their expression as having no directive prologue. Block bodies use the existing function scope and strictness rules. Arrow objects reuse ordinary function metadata and closures but have no constructor slot or own prototype property.

Calls resolve this through the captured environment, ignoring the supplied receiver. Existing function environments already retain their bound this value, including strict primitive receivers. Nested arrows therefore preserve the same binding, and arrows created at Script scope use the defining Realm's global this. Walking intervening lexical environments charges the active budget. This slice does not include derived constructors with uninitialized this.

Arrow recognition occurs at AssignmentExpression precedence. The parser preserves comma boundaries, rejects line terminators before the arrow, and resets loop context for block bodies. Defaults, rest, destructuring, async, arguments, super and new.target remain unsupported. Legacy grammar is unchanged. Duplicate arrow parameters are rejected as unsupported syntax; this slice does not add a new certified syntax-error rule.

References consulted 2026-11-09: ECMAScript [Arrow Function Definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-arrow-function-definitions) and engine262 [InstantiateArrowFunctionExpression](https://github.com/engine262/engine262/blob/main/src/runtime-semantics/InstantiateArrowFunctionExpression.mts). Both establish lexical environment capture and omit constructor creation. Rift uses its existing explicit completion and activation model rather than a second execution path.

Acceptance pending.
