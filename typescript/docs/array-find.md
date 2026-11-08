# Array predicate searches

TS-066 adds `find`, `findIndex`, `findLast` and `findLastIndex` using one
directional traversal. Each boxes the receiver and captures its length before
validating the predicate. Every index is read, including holes; inherited values
remain visible. Callbacks receive the value, index and boxed input with the given
`thisArg`. Truthy results stop traversal immediately. Value-returning methods
return the saved value from before the callback, even if it changed that element.

The captured range stays fixed while values remain live. Deleted elements are
still visited. Missing matches return undefined or -1, and empty inputs still
validate the callback. Each iteration consumes the operation budget; throws
propagate without another read or callback.

This follows [FindViaPredicate](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-findviapredicate).
The C++ `src/builtins/array/array_iterators.cpp` implementation was consulted;
its callback-before-length validation order is not preserved.

Tests cover both directions, holes without presence checks, inherited elements,
mutation, saved values, primitive boxing, callback Realm/receiver/arguments,
early exits, abrupt ordering, metadata and resource bounds. Acceptance pending.
