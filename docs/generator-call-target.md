# Suspended call targets

Call targets finish before arguments begin. A member call retains its base while
the key suspends, reads the method once, then keeps that base as the receiver.
Other suspended targets produce values and use an undefined receiver. They do
not qualify as direct eval. Empty argument lists dispatch immediately; other
calls reuse the retained argument frame.

Tests cover getters, key coercion, primitive receivers, changing methods between
resumptions, spread, delayed errors, indirect eval, return/throw, async bodies and
cross-Realm calls. Current-session getter limits and host-fault restoration are
checked separately. The original two rejected call-target inputs now execute.

This follows [ECMA-262 EvaluateCall](https://262.ecma-international.org/16.0/#sec-evaluatecall)
and its reference receiver rules. Optional chains and super references remain
separate. Evidence stays under ignored build/generator-call-target-* paths until
combined canonical acceptance.
