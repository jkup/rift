# Object and Map grouping

TS-113 adds Object.groupBy and Map.groupBy through a shared GroupBy traversal.
It rejects nullish input, validates the callback before acquiring an iterator,
and calls it with undefined this and the value/index pair. Object grouping
converts each returned key once with ToPropertyKey; Map grouping preserves value
identity and canonicalizes negative zero. An indexed key-to-group lookup avoids
rescanning earlier groups. Each group holds an internal ordered list of values;
guest arrays are materialized only after traversal completes.

Object results have null prototypes and own writable, enumerable, configurable
properties, including symbols and __proto__. Map results use intrinsic branded
storage. Neither result construction nor group-array creation consults mutable
global constructor bindings, Map.prototype.set or species hooks. Result Maps and
arrays use the grouping builtin's Realm, regardless of callback or caller Realm.
Both static methods ignore their this argument.

Callback and property-key conversion errors close the iterator while preserving
the original guest throw. Acquisition and step/value failures propagate directly.
The shared close helper retains uncatchable resource/unsupported stop conditions.
Traversal and output construction are metered, and the algorithm retains the
specified safe-integer index limit. Tests exercise practical resource limits;
they do not attempt 2^53 - 1 iterations.

Sources consulted 2026-11-08: [GroupBy](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-groupby),
[Object.groupBy](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.groupby),
[Map.groupBy](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map.groupby),
and [V8's shared grouping implementation](https://github.com/v8/v8/blob/main/src/builtins/object-groupby.tq).
Rift uses the generic iterator protocol throughout, preserves the normative index
limit, and reuses its existing key index rather than adding V8's fast array path.
No engine source was copied.

Expected-result tests cover coercion order, null prototypes, symbols, identity,
NaN/signed zero, sparse/live input, cached next, callback receivers/indices,
cleanup precedence, poisoned constructors/prototypes, foreign Realms and bounds.
Existing fixture classifications remain separate from conformance claims.
