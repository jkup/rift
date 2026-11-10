# Suspended super constructor arguments

Async arrows may suspend while evaluating arguments to super(). The continuation
captures the derived constructor environment and superclass before the first
argument, then shares ordinary call-argument accumulation, including spreads.
Construction and this-binding use the same helper as an ordinary super call.
The environment preserves new.target and detects an already initialized this.
Constructor validation remains after arguments, so an argument rejection wins.

Tests cover argument order, spreads, superclass mutation during await, new.target,
escaped arrows, duplicate super calls, uninitialized this, constructor throws and
returned objects, finally/await, error Realms and current-job resource limits.

Reviewed against [ECMA-262 SuperCall](https://262.ecma-international.org/16.0/#sec-super-keyword-runtime-semantics-evaluation)
and [engine262 SuperCall](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/SuperCall.mts).
Evidence stays under ignored build/async-super-constructor-* paths pending combined
canonical acceptance. Constructors themselves remain synchronous.

The pinned compiler rejects a write through the narrowed two-frame union
(SC1045/SC1090). The index increment therefore narrows each arm explicitly.
A small failing probe and its static-only, zero-dynamic fixed form are retained
in the draft build directory; argument accumulation remains shared.
