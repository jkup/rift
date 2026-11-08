# Array splice

TS-082 adds Script `Array.prototype.splice`. It boxes the receiver, captures length,
coerces start and delete count in order, and copies deleted elements before moving
receiver properties. Missing start and missing delete count remain distinct from
explicit undefined. Moves preserve holes and inherited reads; writes and deletions
are strict and earlier mutations survive a later failure.

The default-species allocation is shared with map. Results belong to the builtin's
Realm, including when the input has another Realm's intrinsic Array constructor.
Invalid species produces a language TypeError. Custom species construction remains
explicitly unsupported (`runtime.splice-species`); builtin operation contexts do
not yet expose construction. Legacy prototype inventories are unchanged.

Length arithmetic stays within safe integers, deleted arrays obey the array length
limit, and each copy, move, deletion and insertion consumes the step budget. Huge
sparse inputs cannot bypass the guard. No extra list of inserted or deleted values
is allocated.

The implementation follows [Array.prototype.splice](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.splice)
and the bounded default branch of [ArraySpeciesCreate](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-arrayspeciescreate).
The C++ reference at `src/builtins/array/array_mutators.cpp` (base `c67aa831`)
uses narrow integer conversions, fills holes and replaces trailing entries with
undefined. Those shortcuts were not carried into this implementation.

Tests cover omission, numeric coercion, sparse and inherited properties, directional
observation order, partial failures, nonwritable length, large indices, overflow,
metadata, foreign Realm ownership, species rejection and bounded partial progress.
Acceptance is recorded in TASKS.md and COORDINATION.md after both hosts complete.
