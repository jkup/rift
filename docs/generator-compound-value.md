# Suspended compound-assignment expressions

The compound frame retains the reference and old value before its RHS suspends.
Resumption applies the existing binary operator and writes through PutValue.
Property keys retain the conversion performed during the initial read; the
descriptor and setter are looked up again for the write. Old objects remain
objects until operator coercion after the RHS.

Tests cover all twelve operators, key/getter/coercion/setter order, changing
bindings and setters, nested expressions, loop updates, strict errors and abrupt
cleanup. Async bodies, cross-Realm errors and current-session coercion limits run.
The historical rejected compound expression now executes.

See [ECMA-262 assignment evaluation](https://262.ecma-international.org/16.0/#sec-assignment-operators-runtime-semantics-evaluation).
Target suspension remains separate. Evidence stays under ignored
build/generator-compound-value-* paths pending combined canonical acceptance.
