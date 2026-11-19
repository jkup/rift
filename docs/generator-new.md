# Suspended constructor arguments

New expressions share the retained argument frame with calls. The constructor is
captured before argument evaluation, while the existing construction dispatcher
checks constructability and obtains its prototype after all arguments finish.
The dispatcher continues to own bound functions, new.target, derived classes,
return overrides and constructor errors.

Tests cover changing bindings/prototypes during suspension, spread, argument
order, delayed errors, abrupt resumption, async bodies and cross-Realm results.
The original unsupported new-expression input is retained as a positive test.

The pinned native compiler reports SC1090 when assigning suspends through the
call/new union with the full Expr type. Explicit single-arm assignments avoid it.
The reduced build/union-assignment-syntax-probe.ts reproduces the failure;
union-assignment-syntax-arms-probe.ts is fully static. Simpler synthetic unions
do not reproduce it. Initial reports are retained in the ignored draft build.

Suspended constructor expressions and super-call arguments remain separate.
See [ECMA-262 EvaluateNew](https://262.ecma-international.org/16.0/#sec-evaluatenew).
Combined canonical validation remains required before acceptance.
