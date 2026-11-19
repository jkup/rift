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

The [species operation](array-species.md) recognizes a foreign intrinsic Array
constructor by identity, even after its global binding changes. Array's species
getter returns its receiver and is inherited by subclasses. Selected constructors
run through the ordinary construction context, preserving new.target and Realm
ownership. The seven species-consuming Array methods accept arbitrary constructed
objects and retain their method-specific property and length rules.

The implementation follows [ECMA-262 Array construction](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array)
and [Array.isArray](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.isarray).
The C++ `src/builtins/array/array.cpp` implementation was consulted; its
array-like property heuristic is replaced by the existing TypeScript array brand.

Host tests cover length boundaries, sparse storage, property descriptors, every
supported value kind, poisoned conversion hooks, Realm identity and budgets.
CLI tests cover construction, holes, invalid lengths, identity and metadata.
Original TS-058 acceptance: both guest suites pass 346/346, full tooling 290/290, runner30 and probes10 pass. All 77 native entries pass build and static coverage in one invocation; Array driver4425/4425 static. All 225 C++ fixture results agree across hosts: 50 reported successes, 21 unchecked completions, 67 parse errors, 86 runtime errors and one reported failure. Array.isArray improves one file without regressing any of the 70 previously completed files. Logs: build/array-*.
