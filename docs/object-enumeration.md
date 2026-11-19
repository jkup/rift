# Object enumeration

TS-060 adds `Object.keys`, `Object.values` and `Object.entries` to Script Realms.
They box primitives, snapshot own keys in the existing property order, and keep
only enumerable string keys. Each descriptor is checked when visited, so earlier
getters can delete a later property or change its enumerability. Added keys are
not visited. Keys never read values; values and entries invoke getters in order
and propagate their exact abrupt completion.

Results are fresh dense arrays owned by the builtin's Realm. Entries contain
distinct two-element arrays. Array creation and iteration charge the operation
budget. Symbols, nonenumerable properties and inherited properties are excluded.
Strings expose their enumerable UTF-16 indices; null and undefined throw.

The shared routine follows [EnumerableOwnProperties](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-enumerableownproperties)
and the [Object methods](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.keys).
The C++ `src/builtins/object/object.cpp` implementation was consulted. Its
primitive shortcuts and inclusion of nonenumerable values are not copied.
The original `test/object-keys-values-test.js` expects empty string results;
that fixture remains unchanged and its disagreement must remain visible.

Host and CLI tests cover ordering, filtering, getter mutations and throws,
descriptors, primitive boxing, Realm ownership, result identity and budgets.
Both guest suites pass 364/364, full tooling 290/290, runner30 and probes10 pass. All 79 native entries pass build and static coverage in one invocation; enumeration driver4444/4444 static. All 225 C++ fixture results agree across hosts: 53 reported successes, 22 unchecked completions, 67 parse errors, 81 runtime errors and two reported failures. Two files gain reported success; object-keys-values-test.js reaches its incorrect empty-string-enumeration expectations and reports two failures. All 73 previously completed files retain their outcomes. Logs: build/enumeration-*.
