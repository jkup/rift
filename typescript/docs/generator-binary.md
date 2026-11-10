# Binary expression suspension

Generators can suspend within binary expression trees feeding existing statement
receivers. A left frame retains the pending right expression; a right frame retains
the captured left Value. Resumption continues evaluation in source order and uses
the shared binary operator implementation only after both values are available.
Logical AND/OR short circuit and comma expressions retain their ordinary behavior.

The parser marks admitted binary paths with an iterative traversal. Long flat
binary chains cannot overflow a recursive parser visitor. Unsupported expression
contexts still fail preparation. Trees without suspension use ordinary evaluation.

Continuation records retain data only. Caller-relative expression/delegation depth
is restored on every resume, and current-session step/call limits remain active.
Abrupt resumes discard operands before catch/finally/iterator unwinding. Yield-star
results feed the same operand frames and final binding/assignment/return receiver.

Tests cover multiple suspensions, live coercion after captured reads, short circuit,
delegation, throw/return cleanup, references, TDZ, Realm ownership and fatal limits.
A 4,000-operator input verifies bounded evaluation without host recursion. The
previously rejected binary inputs are preserved as positive regressions; three
empty rejection loops left by earlier migrations are removed.

Calls, unary/conditional expressions, yielding control-flow heads and nested yield
operands remain unsupported. Full native/static and suite results are tracked
separately from this design.

References: [ECMA-262 2025 binary evaluation](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-evaluatestringornumericbinaryexpression)
and [engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/EvaluateStringOrNumericBinaryExpression.mts).

Admission review also rejects bare yield in higher-precedence operand positions
(such as 1 + yield 2). Parenthesized yield remains valid. This grammar guard was
added before integration and has explicit negative tests.
