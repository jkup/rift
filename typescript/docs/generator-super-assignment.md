# Suspended super assignment targets

The super-key frame records whether it supplies a read, call or assignment.
Assignment builds the explicit-receiver reference after the key finishes and
passes it to the existing RHS frame without reading the property. PutValue then
converts the deferred key and uses actual this for the write.

Tests cover setters, borrowed methods, prototype/descriptor changes, key/RHS
order, nullish bases, strict errors, symbols and abrupt cleanup. Async arrows,
cross-Realm errors and current-session setter limits run. The original rejected
super assignment now executes. See [ECMA-262 SuperProperty](https://262.ecma-international.org/16.0/#sec-super-keyword-runtime-semantics-evaluation)
and [assignment evaluation](https://262.ecma-international.org/16.0/#sec-assignment-operators-runtime-semantics-evaluation).

Compound/update/delete super targets remain separate. Evidence stays under ignored
build/generator-super-assignment-* paths pending combined canonical acceptance.
