# Array relative indexing

TS-061 adds generic `Array.prototype.at`. It boxes the receiver, reads and
converts length, then converts the index with the number hint. Negative indices
count from the captured length; fractions truncate toward zero. NaN and missing
arguments select zero. Indices outside the bounds return undefined without an
element read. Empty inputs still convert the index.

The selected element uses ordinary Get, so holes can resolve to inherited values
and getters retain their receiver. Length and index failures stop later effects.
The existing operation budget and Realm dispatch apply.

The implementation follows [Array.prototype.at](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.at).
The C++ implementation in `src/builtins/array/array_accessors.cpp` was consulted;
TypeScript uses its existing explicit conversions and completions, avoiding the
C++ integer cast for large indices.

Tests extend the existing array-search driver with access traces, captured length,
conversion on empty input, symbols, abrupt identity, the maximum safe length and
resource bounds. CLI cases exercise arrays, array-like objects and strings.
Native and regression acceptance is pending.
