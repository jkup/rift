# Suspended call arguments

A call captures its callee and receiver before evaluating arguments. Its expression
frame retains those values and preceding arguments across yield or await. Spread
operands use the same iterator helper as ordinary calls. A non-callable callee is
rejected only after argument evaluation, as in the ordinary evaluator.

Direct eval is recognized from the captured intrinsic and identifier reference.
Resumption keeps the activation's lexical environment even when the global eval
binding changes while suspended. Other calls use the existing call dispatcher.
Frames do not retain evaluator instances or callbacks.

Tests cover getters and receiver mutation, nested calls, spread ordering and
errors, direct/indirect eval, async calls, cross-session resumption, resource limits
and host-fault restoration. Nine old unsupported-input checks now retain their
original source and verify successful execution instead. Initial failed runs are
retained in ignored build/generator-call-* logs.

Suspended callees, constructor arguments, super calls and optional chains are
separate slices. See [ECMA-262 EvaluateCall](https://262.ecma-international.org/16.0/#sec-evaluatecall)
and [argument evaluation](https://262.ecma-international.org/16.0/#sec-argument-lists-runtime-semantics-argumentlistevaluation).
Combined canonical validation is required before acceptance.
