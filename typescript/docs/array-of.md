# Array.of

Array.of constructs its receiver with the item count when the receiver is a constructor. Otherwise it creates an intrinsic array in the builtin method's Realm. It defines each item as an own writable, enumerable, configurable data property, then performs a throwing length assignment, including for an empty item list. Custom constructors can return ordinary objects; inherited index setters are bypassed, and property failures preserve the specified ordering.

The implementation follows [ECMAScript 2025 Array.of](https://262.ecma-international.org/16.0/#sec-array.of), reviewed against [engine262 Array intrinsics at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/Array.mts). Tests cover subclass/newTarget behavior, item identity, nonconstructor receivers, descriptors, constructor/property errors and cross-Realm allocation. Array.from remains separate.

The registration uses an explicit four-argument closure, matching other builtins. Passing the named helper directly produced a native callback adaptation with one dynamic-tier statement despite a successful static-only build. The closure removes that adaptation; parsed coverage, rather than the compiler's summary, remains the acceptance gate.
