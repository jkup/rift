# Own-property predicates

TS-059 installs `Object.prototype.hasOwnProperty` and `Object.hasOwn` in Script
Realms. Both use existing own descriptors, preserving symbols, nonenumerable
properties, accessors, string virtual properties and sparse array holes. They
never read the property's value or walk the prototype chain.

The prototype method converts its key before boxing its receiver. The static
method boxes its first argument before converting the key. This distinction is
observable when the receiver is nullish or conversion has effects. Missing keys
convert from undefined to the string `"undefined"`; missing receivers throw.

The implementation follows [hasOwnProperty](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.prototype.hasownproperty)
and [Object.hasOwn](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.hasown).
The C++ `src/builtins/object/object.cpp` implementation was consulted. Its
missing-argument and primitive-receiver shortcuts are not copied: TypeScript
uses its existing ToPropertyKey and ToObject operations.

Tests cover descriptor presence without getter invocation, key-conversion
effects and throw identity, symbol keys, Realm ownership, boxing, metadata and
resource limits. Native and regression acceptance is pending.
