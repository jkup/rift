# Array construction and brand checking

TS-058 installs `Array` and `Array.isArray` in Script Realms. Calls and
construction create genuine sparse arrays. A single number specifies length;
other arguments become own, writable, enumerable, configurable elements. Invalid
numeric lengths throw RangeError. Objects are stored without coercion, and an
explicit undefined element remains distinct from a hole.

`Array.isArray` checks the internal array class, including arrays from another
Realm and `Array.prototype`. Prototype chains and array-like properties cannot
forge the brand. Allocation and element creation use the existing operation
budget. Borrowed constructors retain their owning Realm.

The internal default-array map operation now recognizes a foreign intrinsic
Array constructor by identity, even after its global binding changes. Custom
constructors still follow the existing bounded species checks. Public map,
the Array species getter, subclassing and alternate newTarget remain deferred.

The implementation follows [ECMA-262 Array construction](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array)
and [Array.isArray](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.isarray).
The C++ `src/builtins/array/array.cpp` implementation was consulted; its
array-like property heuristic is replaced by the existing TypeScript array brand.

Host tests cover length boundaries, sparse storage, property descriptors, every
supported value kind, poisoned conversion hooks, Realm identity and budgets.
CLI tests cover construction, holes, invalid lengths, identity and metadata.
Node guests pass 346/346; native and regression acceptance is pending.
