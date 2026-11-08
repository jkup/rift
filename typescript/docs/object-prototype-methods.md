# Object identity and prototype operations

TS-101 adds Script Object.is, getPrototypeOf, setPrototypeOf and
Object.prototype.isPrototypeOf. SameValue reuses the existing identity operation,
including NaN equality and distinct zero signs, without coercion.

Prototype inspection boxes primitives in the builtin Realm. Mutation validates
the target and proposed prototype before returning a primitive target unchanged.
Object.prototype retains its immutable prototype; nonextensible objects accept
their existing prototype but reject a different one. Cycles are rejected.

GuestObject now shares one mutation algorithm between trusted host setup and
the metered internal guest operation. Guest traversal charges each candidate
before committing the link. Interrupted or rejected changes preserve the old
prototype. isPrototypeOf similarly walks iteratively with a step per hop, and
returns false for primitive arguments before attempting to box its receiver.

Tests cover primitive ordering and boxing, symbol/object identity, immutable and
nonextensible objects, cycles, retained array/number slots, foreign-Realm behavior,
and 2,000-link chains. Deep inspection/mutation completes without recursion when
budget permits and stops without changing links when it does not. Trusted host
prototype setup and legacy surfaces remain unchanged. Proxy behavior is separate.

References: ECMAScript 2023 [Object prototype operations](https://tc39.es/ecma262/2023/multipage/fundamental-objects.html#sec-object.setprototypeof)
and src/builtins/object/object.cpp at 383df384. The C++ non-object getPrototypeOf
shortcut was not adopted; primitive inputs use the existing wrapper semantics.
