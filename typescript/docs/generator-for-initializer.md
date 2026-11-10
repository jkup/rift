# Suspended for-loop expression initializers

An expression initializer completes before the loop frame is created. Its
receiver carries the statement and labels; resumption discards the initializer's
value and enters the existing preparation/test phases. Return or throw during
initialization never starts the loop.

Tests cover one-time initialization, test/update ordering, labels, nested loops,
delegation, abrupt cleanup and async bodies. Cross-Realm resumption uses current
session limits. Declaration initializers and assignment-expression suspension
remain separate boundaries.

See [ECMA-262 for evaluation](https://262.ecma-international.org/16.0/#sec-for-statement-runtime-semantics-labelledevaluation).
Evidence stays under ignored build/generator-for-initializer-* paths pending
combined canonical acceptance.
