# Logical assignment

Script &&=, ||= and ??= use the existing compound-assignment reference path.
They read the reference once and use the shared short-circuit predicate before
any RHS evaluation or write. The writing branch returns the RHS directly and
uses ordinary PutValue, including the cached property key and super receiver.
Identifier targets retain anonymous function/class naming eligibility; property
and parenthesized targets follow the existing naming rules.

Tests cover all three operators across falsy, nullish and truthy values;
accessors and key caching; const/strict/TDZ failures; skipped setters; super
receivers; assignment associativity; function naming; error Realms and budgets.
Suspended logical assignments remain explicitly rejected for the next task.

Reviewed against [ECMA-262 assignment evaluation](https://262.ecma-international.org/16.0/#sec-assignment-operators-runtime-semantics-evaluation)
and [engine262 AssignmentExpression](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/AssignmentExpression.mts).
Evidence stays under ignored build/logical-assignment-* paths pending combined
canonical acceptance.

The bitwise driver retains x &&= 2; and x ||= 2; as exact historical inputs.
They now prepare and throw ReferenceError for unresolved x; declared-x variants
also assert successful assignment. The initial 769/770 run is retained.
