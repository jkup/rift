# Suspended optional chains

Optional-chain continuations retain an ExpressionResult, so a property reference
survives until a caller, deletion or another chain consumes it. A chain step
reads its base once, short-circuits before evaluating keys/arguments when needed,
and otherwise retains the next reference or call result. Argument accumulation
and spread evaluation reuse ordinary call frames; optional eval remains indirect.

The final consumer distinguishes a value, grouped call, deletion or outer chain.
This preserves receivers in (object?.[yield key])() and nested optional calls,
while delete can consume a reference without reading the deleted property.
Suspended member and super bases retain the same references as ordinary chains.

Tests cover nullish skips, bases/keys/arguments, grouping, receivers, super,
spreads, getter and key order, late callability, strict deletion, abrupt cleanup,
async methods, error Realms and current-session budgets. The original optional
member and call rejection inputs now execute.

Reviewed against [ECMA-262 optional chaining](https://262.ecma-international.org/16.0/#sec-optional-chaining)
and [engine262 OptionalExpression](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/OptionalExpression.mts).
Evidence stays under ignored build/generator-optional-chain-* paths pending
combined canonical acceptance.
