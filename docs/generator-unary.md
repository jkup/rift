# Unary value operations and suspension

The shared unary Value helper performs numeric coercion, typeof classification,
void, Boolean negation and non-reference deletion. Ordinary evaluation retains
its reference-sensitive typeof/delete paths: missing direct identifiers and final
property deletion never flow through a generic GetValue replacement.

Suspended unary operands use one expression frame and the same helper when the
operand completes. Numeric hooks remain live on resume; typeof/void/not/delete
values do not coerce. Existing abrupt unwind and depth accounting apply unchanged.

Tests cover signed zero, nested binary/conditional operands, delegation, errors,
references, ordinary unary controls, cross-Realm/current-session operation and
fatal cleanup. Bare yield after a unary operator and unparenthesized unary
exponentiation bases remain rejected. Calls and yielding member references are
still unsupported. Historical unary rejection inputs become positive regressions.

Semantics were checked against [ECMA-262 unary operators](https://262.ecma-international.org/16.0/#sec-unary-operators) and [engine262 UnaryExpression at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/UnaryExpression.mts). The split keeps Reference handling outside numeric/classification operations. BigInt remains outside the existing numeric representation.
