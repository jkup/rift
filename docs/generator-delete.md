# Suspended property deletion

Deletion retains a member base while its key suspends, then passes the reference
to the ordinary deletion helper. It never reads the property. The helper preserves
base boxing before key conversion and uses the current function's strictness for
non-configurable properties.

Tests cover skipped getters, symbols, inherited and array properties, primitive
bases, nullish bases, key hooks, strict errors, abrupt resumption and async bodies.
A cross-Realm resumption checks the error prototype and current session. The
original rejected member-deletion source now executes.

See [ECMA-262 delete evaluation](https://262.ecma-international.org/16.0/#sec-delete-operator-runtime-semantics-evaluation).
Optional chains and super references remain separate. Focused evidence stays
under ignored build/generator-delete-* paths until combined acceptance.
