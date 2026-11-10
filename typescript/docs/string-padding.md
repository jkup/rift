# String padding

padStart and padEnd coerce the receiver, convert the maximum length with ToLength, and return immediately when the existing string is long enough. Only then is the filler converted, with undefined selecting a space. Empty filler leaves the string unchanged even for an enormous requested length. All lengths and truncation use UTF-16 code units.

The operation budget is charged for the complete result before allocation. Padding uses the reviewed repetition helper for whole filler copies, followed by only the required partial filler. It does not construct and then discard an oversized repeated filler. Tests include conversion order, ignored filler errors, fractional and infinite lengths, generic receivers, split surrogate pairs, descriptors and resource stops.

The implementation follows [ECMAScript 2025 StringPaddingBuiltinsImpl](https://262.ecma-international.org/16.0/#sec-stringpaddingbuiltinsimpl), reviewed against [engine262 StringPad at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/StringPad.mts). No locale or normalization behavior is introduced.
