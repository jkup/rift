# Nullish coalescing

Script parsing accepts ?? at the short-circuit precedence level and rejects
unparenthesized mixing with && or ||. Parenthesized operands retain their existing
parser identity, so grouping is checked without reparsing source text.

Ordinary and suspended evaluation return the left value unless it is null or
undefined. They do not coerce it and do not evaluate a skipped right operand.
Tests cover falsy primitives, object identity, getters, exceptions, grouping and
precedence, optional-chain results, generator cleanup and async resumption.

Reviewed against [ECMA-262 short-circuit expressions](https://262.ecma-international.org/16.0/#sec-binary-logical-operators)
and [engine262 CoalesceExpression](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/CoalesceExpression.mts).
Logical assignment remains separate. Evidence stays under ignored
build/nullish-coalescing-* paths pending combined canonical acceptance.

The original conditional-nullish fixture retains its exact source, true ?? 1;,
and migrates from expected parse rejection to successful execution. Its resulting
boolean is also asserted by the semantic driver. The initial 768/769 run is kept.
