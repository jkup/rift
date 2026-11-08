# Array slice

TS-084 adds Script Array.prototype.slice. Length is captured before start/end
coercion; undefined end uses that length. Clamped-index conversion is shared with
array search and splice. Copying performs HasProperty before Get, preserves holes,
reads inherited properties and observes changes made by earlier getters.

Results are fresh arrays in the builtin's Realm. The shared species operation
checks constructors even for empty slices, handles foreign intrinsic Array
constructors and reports custom species construction explicitly as unsupported
(runtime.slice-species). Invalid species is a language TypeError. Result entries
are own writable, enumerable, configurable data, bypassing inherited setters.

The loop consumes the active step budget for both present and absent elements.
Safe integer source indices remain exact; results above the array length limit
throw RangeError. Empty slices of huge array-like objects do constant work.
Legacy Realms retain their previous public surface.

References: [Array.prototype.slice](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.slice)
and src/builtins/array/array_accessors.cpp at base aa1a906f. The C++ implementation
skips HasProperty and handles negative fractions through a narrow conversion;
this implementation instead preserves sparse properties and truncates before
clamping as specified.

Tests cover ordinary CLI use, metadata, coercion order and mutation, inherited
reads, getter throws, result descriptors, foreign Realm ownership, species,
large indices and resource bounds. Acceptance is tracked in TASKS.md and
COORDINATION.md after both hosts and the tooling suite complete.
