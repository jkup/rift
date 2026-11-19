# String substring and substr

Both methods convert the receiver before either index. substring clamps both
endpoints to the string bounds and swaps them when reversed. Annex B substr
uses a relative start and a nonnegative length. Omitted/undefined end or length
selects the string size; infinities, NaN and fractions follow ToIntegerOrInfinity.
An empty result does not suppress conversion of a supplied second argument.

Ranges and output operate on UTF-16 code units, including split surrogate pairs
and NUL. The result length is charged before slicing. Tests cover conversion
order, abrupt identity, generic receivers, boundaries, metadata and resource
exhaustion. Legacy-profile registration is unchanged.

References: [ECMAScript 2025 substring](https://262.ecma-international.org/16.0/#sec-string.prototype.substring)
and [Annex B substr](https://262.ecma-international.org/16.0/#sec-string.prototype.substr).
The additional-method corpus fixture still needs trustworthy locale comparison;
these range methods do not remove that separately recorded blocker.
