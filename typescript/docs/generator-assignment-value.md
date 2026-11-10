# Suspended assignment-expression values

An assignment frame captures its reference before evaluating a suspending RHS.
Resumption writes through the ordinary PutValue helper and preserves the assigned
value for the enclosing expression. It does not cache a setter, descriptor or
binding value, and it does not rename a function supplied by a resumed yield.

Tests cover nested assignments, calls and literals, conditional short circuit,
loop initialization/updates, delayed key conversion, changing setters, strict
errors and abrupt cleanup. Async bodies, cross-Realm errors and current-session
setter limits also run. The historical assignment-update input now executes.

See [ECMA-262 assignment evaluation](https://262.ecma-international.org/16.0/#sec-assignment-operators-runtime-semantics-evaluation).
Target suspension and compound expressions remain separate. Evidence stays under
ignored build/generator-assignment-value-* paths pending combined acceptance.
