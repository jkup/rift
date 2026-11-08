# Reversed and sorted array copies

TS-088 adds Script toReversed and toSorted. Both capture the receiver length,
allocate a fresh array in the builtin Realm, and read every index. Missing
properties become own undefined entries. Neither reads constructor or species.
Allocation rejects lengths above the array limit before any element reads.

toReversed reads backwards and defines result entries forwards. toSorted validates
the comparator before boxing, collects values forwards, then uses the existing
stable iterative merge sort and defines the result. Neither writes the source;
getters and comparators can still mutate it. All loops consume the step budget.
A shared ArrayCreate helper also serves default species allocation, preserving
existing method-specific diagnostics.

References: [ECMAScript copy algorithms](https://tc39.es/ecma262/2023/multipage/indexed-collections.html#sec-array.prototype.tosorted)
and [V8 toSorted](https://chromium.googlesource.com/v8/v8/+/refs/heads/main/src/builtins/array-to-sorted.tq)
(blob 0ffcb840afe5e1c12a1d6a0edfd44433ba4a06a1, consulted 2026-11-08).
V8 likewise shares sorting machinery and produces dense copies. Rift retains
its simple bounded merge sort and the specification's array length limit.
No V8 source was copied. toSpliced and with are described below.

The array-copy driver checks read order, dense holes, inherited values, source
preservation, species avoidance, Realm ownership, size limits, budgets, stability,
coercion and exact throws. Acceptance is recorded after both hosts finish.


## Spliced and replaced copies

TS-089 adds toSpliced and with. Both create dense arrays without reading species.
toSpliced copies the prefix, inserted arguments and suffix in order, never reading
deleted indices. Omitted start and skip count remain distinct from undefined.
with converts its relative index before allocation and reads every index except
the replacement. Both capture length before argument coercion and preserve live
element reads afterward. The source is never assigned by either method.

Size checks distinguish safe-integer overflow (toSpliced TypeError) from the array
length limit (RangeError). Subtracting skipped entries before adding insertions
avoids rounding away a mathematically valid length near the safe-integer bound.
All copying is bounded by the current step budget. Empty deletion of a huge
array-like can complete without traversing deleted entries.

References: [toSpliced](https://tc39.es/ecma262/2023/multipage/indexed-collections.html#sec-array.prototype.tospliced)
and [with](https://tc39.es/ecma262/2023/multipage/indexed-collections.html#sec-array.prototype.with).
Tests exercise skipped getters, coercion order, captured lengths, omitted values,
indices, dense inherited copies, nonwritable sources, foreign Realms, exact throws
and resource limits. The original C++ fixture remains unchanged.
