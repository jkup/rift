# Array sort

TS-087 adds Script Array.prototype.sort. Comparator validation happens before
receiver boxing and length access. Collection reads present and inherited entries
in index order, preserving the distinction between absent indices and undefined.
Sorting completes before strict writes and trailing property deletions begin;
getters and callbacks can still mutate the input while the saved list is sorted.

A bottom-up stable merge sort uses two reusable Value buffers. Equal elements come
from the left run first. For m collected elements this takes O(m log m) comparisons
and buffer moves with O(m) additional space, without host recursion or a host sort
callback. Comparator throws and resource limits remain explicit completions.

Undefined sorts after other values without calling the comparator. Custom
comparators receive two values and undefined as this; their results undergo numeric
conversion, with NaN treated as equality. Default comparison converts the left
value fully before the right using the string hint, then compares UTF-16 units.

Writeback uses strict Set even for a single element. Trailing holes use strict
deletion. Earlier writes survive later failures, and length is not explicitly
rewritten. Collection, merge moves, writes and deletions consume the active step
budget. Sorting is generic and returns the boxed receiver; it never reads species.
Legacy Realms retain their previous public surface.

References: [Array.prototype.sort and its abstract operations](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.sort)
and src/builtins/array/array_mutators.cpp at base d323170b. The C++ reference ignores
invalid comparators, uses unstable std::sort, fills holes and does not special-case
undefined. These shortcuts were not carried over.

Tests cover comparator/default order, stable ties and NaN, undefined and holes,
UTF-16 ordering, collection/writeback order, partial write/delete failures, singleton
and empty inputs, Realm and coercion behavior, exact throws, budgets and multiple
merge widths. Validation and fixture outcomes are recorded in TASKS.md and
COORDINATION.md after both hosts complete.
