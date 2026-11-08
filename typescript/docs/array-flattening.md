# Iterative array flattening

TS-094 adds Script flat and flatMap. A shared explicit stack holds each source,
captured length, current index and remaining depth. Traversal is depth-first,
using HasProperty/Get and skipping holes at every visited level. Only GuestArray
instances flatten; ordinary array-like objects and spreadability hooks do not.
Depth zero retains nested arrays by identity. Infinity preserves the depth value.
Each frame visit consumes a step, bounding cycles, sparse scans and deep traversal
without host recursion. Memory grows with nesting depth, subject to that guard.

flat captures length before depth conversion and default species allocation.
flatMap captures length, validates its callback, then allocates the default-species
result. The callback runs only for present top-level elements, with the original
source/index and requested this value; its returned arrays flatten one level.
Nested reads complete before visiting the next outer element. Results use dense
own data properties and enforce the safe-integer target-index limit.

Custom species construction remains explicitly unsupported through the closed
runtime.flat-species and runtime.flatmap-species codes. All observation codecs and
the exact historical-boundary amendment allow those codes without widening other
arms. Foreign intrinsic Array constructors retain the existing default-species rule.

References: [flat, flatMap and FlattenIntoArray](https://tc39.es/ecma262/2023/multipage/indexed-collections.html#sec-flattenintoarray)
and src/builtins/array/array_iterators.cpp at base 0de05146. C++ uses recursive
flattening, treats array-like objects as arrays and copies holes at depth zero;
those shortcuts were not retained. Tests cover depth, sparse/inherited entries,
read order, mutation, callback realms, species, 5,000 nested arrays and cycles.
