# Suspended compound property targets

Compound assignments share the retained base/key frames with simple assignment.
After the key completes, GetValue reads the property and caches key conversion
before the RHS starts. The existing compound frame retains that value, applies
the operator after RHS completion and writes through the captured reference.

Tests cover all twelve operators, base/key/RHS suspension, getter and conversion
order, changing keys/bindings, nullish and primitive bases, strict errors, symbols
and abrupt cleanup. Async bodies, cross-Realm errors and current-session getter
limits run. The original rejected compound target now executes.

See [ECMA-262 assignment evaluation](https://262.ecma-international.org/16.0/#sec-assignment-operators-runtime-semantics-evaluation).
Update and super targets remain separate. Evidence stays under ignored
build/generator-compound-target-* paths pending combined canonical acceptance.
