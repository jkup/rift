# Suspended destructuring assignment values

Nested destructuring assignments retain their pattern while the RHS suspends.
After resumption they call the ordinary pattern initializer, then return the
original RHS value. Target resolution, computed keys, defaults and iterator
acquisition therefore happen after the RHS, as they do without suspension.

Tests cover nested assignments, call arguments, literals and loop initializers;
object/array rest; accessor ordering; mutable targets; iterator closing and
abrupt precedence; strict failures; delegation and async resumption. Error Realm
and current-session resource limits are checked. Suspension inside a pattern
remains explicitly unsupported and has separate negative tests.

See [ECMA-262 destructuring assignment](https://262.ecma-international.org/16.0/#sec-destructuring-assignment).
Evidence stays under ignored build/generator-destructure-value-* paths pending
combined canonical acceptance.
