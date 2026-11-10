# Suspended super property reads

A super-key frame captures actual this and the home object before key evaluation.
After the key completes, the shared super-reference helper obtains the home
object's current prototype. GetValue retains the explicit receiver and performs
deferred key conversion. Prototype changes during suspension therefore affect the
read; changes during key conversion do not replace the captured base.

Tests cover getters, borrowed/inherited methods, instance/static methods, symbols,
dynamic prototypes, nested calls/new expressions, abrupt cleanup, async arrows
and current-session limits. Direct super call/write/update/delete targets remain
separate. Reviewed [engine262 SuperProperty.mts](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/SuperProperty.mts)
and [ECMAScript 2025 SuperProperty](https://262.ecma-international.org/16.0/#sec-super-keyword-runtime-semantics-evaluation).
Evidence stays under ignored build/generator-super-member-* paths pending combined
canonical acceptance.
