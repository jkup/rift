# Suspended super method targets

The retained super-key frame optionally continues into the ordinary call-target
frame. It obtains the method before arguments and carries actual this as the
receiver. Ordinary and suspended super reads share context capture and reference
construction, including the prototype lookup after key evaluation.

Tests cover getters, method/prototype changes, borrowed methods, argument
suspension/spread, delayed callability errors, indirect eval, abrupt cleanup and
async arrows. Cross-Realm errors and current-session method limits run. The
original rejected super method target now executes.

See [ECMA-262 SuperProperty](https://262.ecma-international.org/16.0/#sec-super-keyword-runtime-semantics-evaluation)
and [EvaluateCall](https://262.ecma-international.org/16.0/#sec-evaluatecall).
Super writes, updates and deletion remain separate. Evidence stays under ignored
build/generator-super-call-* paths pending combined canonical acceptance.
