# Math.random

The Script Math object exposes a non-constructible `random` method with length 0.
Its state belongs to the builtin's Realm, including borrowed calls. The receiver
and arguments are ignored. Initialization is lazy, and the operation budget is
checked before seeding or advancing the generator.

`RandomState` implements Blackman and Vigna's public-domain
[xoshiro128** 1.1 transition](https://prng.di.unimi.it/xoshiro128starstar.c).
Four host-random 32-bit words seed each Realm; an all-zero seed is normalized.
Two successive words supply 27 and 26 bits for a result in [0, 1). No guest
seeding interface or cryptographic guarantee is introduced. The host supplies
seed entropy only; guest generator state is not shared between Realms.

The [ECMAScript Math.random contract](https://262.ecma-international.org/16.0/#sec-math.random)
requires approximately uniform results and separate Realm sequences.
[engine262 Math](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/Math.mts)
was consulted for Realm ownership; its BigInt-based generator is not used here.

Tests compare the word stream with an independently compiled C reference,
check deterministic floating conversion, borrowed calls, zero-seed recovery,
metadata and budget exhaustion before state changes. Host-seeded range checks
are smoke tests, not statistical-quality evidence. The focused native gate
requires both static-only compilation and parsed zero-dynamic coverage.
Reference evidence is retained in build/native-capability-review/random-reference.*;
focused results are in build/math-random-draft/build/random-reviewed.json.
