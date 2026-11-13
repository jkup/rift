# Array unscopables

TS-541 is integrated and accepted after full canonical validation.

Script Realms give `Array.prototype[Symbol.unscopables]` a fresh null-prototype
object. The parent property is nonwritable, nonenumerable and configurable.
Its sixteen entries have value `true` and are writable, enumerable and
configurable, in this order:

`at`, `copyWithin`, `entries`, `fill`, `find`, `findIndex`, `findLast`,
`findLastIndex`, `flat`, `flatMap`, `includes`, `keys`, `toReversed`, `toSorted`,
`toSpliced`, `values`.

The list follows the specification rather than being inferred from installed
methods. Arrays and subclasses inherit the same object within a Realm. Mutating
it does not affect another Realm. The property's nonwritable flag does not freeze
that object; its entries can be changed or deleted. The configurable parent
property can also be replaced or deleted.

Legacy Realms are unchanged. Installing this data property does not implement
`with` statements, which retain their existing parse rejection.

Four independent Node reference programs cover descriptors, inheritance, inner
mutation and parent assignment/deletion. Focused engine controls also check Realm
isolation and the legacy/parser boundaries. The original bootstrap inventory
failure is retained before updating its expected symbol keys.

Reference: [ECMAScript 2025, Array.prototype[Symbol.unscopables]](https://262.ecma-international.org/16.0/#sec-array.prototype-%symbol.unscopables%).
