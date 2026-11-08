# Update expressions

The Script profile supports prefix and postfix `++` and `--` using one update
AST node. Evaluation resolves the target once, reads its value, converts it to a
number, writes the adjusted value, then returns the old value for postfix or the
new value for prefix. The existing reference operations preserve property-key
conversion, getter/setter order, strict/sloppy writes and resource limits.

This follows [ECMA-262 update expressions](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-update-expressions).
The C++ implementation in `src/interpreter/expression_evaluator_assignment.cpp`
was consulted. TypeScript shares its existing reference path for identifiers and
members rather than duplicating their update logic. BigInt remains unsupported.

Invalid assignment targets are rejected before execution. Prefix operators can
precede a newline; postfix operators cannot cross one. Automatic semicolon
insertion remains unsupported. The legacy expression evaluator still rejects
Script-only update ASTs.

Tests preserve the old postfix increment traces and add all four forms, coercion,
signed zero, precedence, property access order, strict/sloppy failures and grammar
neighbors. Previously rejected source cases are retained with their new expected
behavior. Node guests pass 327/327. Native acceptance is pending.
