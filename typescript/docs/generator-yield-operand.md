# Nested yield operands

Yield operands share the data-only expression stack. The inner operand completes
before the outer yield exposes its value or yield-star acquires an iterator. On
resumption, the outer yield produces the newly supplied value for its parent
expression or statement receiver. Abrupt resumption discards pending operands.

A completed delegate can schedule another delegate while consuming its result.
The run loop checks that transition before advancing the surrounding statement;
otherwise a nested yield-star incorrectly skips the second iterator.

Tests cover nested values, bindings and assignment receivers, binary/conditional/
unary operands, delegation transitions, iterator acquisition timing, abrupt
cleanup, current-session budgets and cross-Realm errors. Existing rejected nested
yield sources are retained as positive regressions. Calls and yielding member
references remain outside this admission boundary.

This follows [ECMA-262 YieldExpression](https://262.ecma-international.org/16.0/#sec-generator-function-definitions-runtime-semantics-evaluation)
and the previously reviewed engine262 YieldExpression implementation at
18cdeb03c363eb31d775648a0d070bdc8a26ced1. No host continuation or execution context
is retained between calls.
