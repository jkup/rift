# Conditional expression suspension

Conditional frames retain the test and then the chosen branch across suspension.
The test runs once; ToBoolean selects one branch, whose GetValue becomes the
expression result. Branch frames retain expression depth without re-reading the
test or touching the other branch. Binary frames and final statement receivers
compose with the same stack.

Tests cover yields and yield-star in tests/branches, nested conditionals/binaries,
TDZ, references, abrupt discard, catch/finally, unnamed function values, Realm
ownership and current-session accounting. Existing binary depth-limit tests remain
applicable. Calls, unary expressions and suspension in control-flow heads remain
unsupported. The previous conditional rejection is preserved as a positive case.

Reference: [engine262 conditional evaluation at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/ConditionalExpression.mts).
