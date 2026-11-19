# String repetition

String.prototype.repeat coerces the receiver before the count, truncates finite counts toward zero, and rejects negative integers or positive infinity with a Realm-local RangeError. Empty strings still validate the count. Repetition preserves UTF-16 code units, including unpaired surrogates.

Before allocation, the builtin charges one operation step per output code unit. Oversized requests terminate through the existing uncatchable resource-limit completion, including finite counts whose output-size multiplication overflows. Once charged, a string-boundary helper builds the result by doubling chunks, with no host repeat call or repeated growing-prefix loop. Empty output returns immediately after coercion and validation.

The implementation follows [ECMAScript 2025 repeat](https://262.ecma-international.org/16.0/#sec-string.prototype.repeat), reviewed against [engine262 StringPrototype at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/StringPrototype.mts). Focused tests cover coercion side effects, error ordering, fractional/NaN/infinite counts, Unicode code units, metadata, cross-Realm errors and resource stops. Padding remains separate.
