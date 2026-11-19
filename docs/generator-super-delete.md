# Suspended super deletion

Deleting a super property evaluates its reference and then throws ReferenceError.
The retained super-key frame resumes the key expression, captures the home
prototype and passes the reference to the existing deletion operation. It does
not convert the key, read a getter or attempt to delete a property. A null super
base still produces ReferenceError rather than TypeError.

Tests cover deferred key conversion, null bases, strict methods, key-expression
side effects, throw/return cleanup, delegation, async methods/arrows and errors
from another Realm. Resource limits remain attached to the current resumption.
The original rejected syntax now executes and reports its required runtime error.

Reviewed against [ECMA-262 delete evaluation](https://262.ecma-international.org/16.0/#sec-delete-operator-runtime-semantics-evaluation)
and [engine262 UnaryExpression](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/UnaryExpression.mts).
Evidence stays under ignored build/generator-super-delete-* paths pending combined
canonical acceptance. Optional-chain suspension remains separate.
