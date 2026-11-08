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
No V8 source was copied. toSpliced and with remain separate follow-up work.

The array-copy driver checks read order, dense holes, inherited values, source
preservation, species avoidance, Realm ownership, size limits, budgets, stability,
coercion and exact throws. Acceptance is recorded after both hosts finish.

