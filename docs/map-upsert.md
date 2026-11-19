# Map insert-if-absent methods

TS-115 adds getOrInsert and getOrInsertComputed to Script Map.prototype. Both
reuse branded keyed storage and return an existing value without overwriting it,
including stored undefined. Keys retain identity without coercion; signed zero
is canonicalized before a computed callback receives the key.

The computed method validates callback callability before lookup, even for an
existing key. For an absent key it calls with undefined this and the key as its
only argument. Storage is looked up again after the callback: inserting that key
updates its current value in place, while deleting or clearing it allows the
final insertion to take its proper position. Guest throws propagate unchanged,
and callback mutations are retained. Public get/has/set overrides are not used.

Tests cover undefined defaults, identity and SameValueZero, callback mutation and
recursive insertion, live iteration, abrupt completion, metadata, prototype
changes, frozen Maps, foreign Realm brands/errors and resource limits. The fixed
C++ upsert fixture also requires WeakMap, which remains a separate feature.

Sources consulted 2026-11-08: the specified
[getOrInsert](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map.prototype.getorinsert)
and [getOrInsertComputed](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map.prototype.getorinsertcomputed)
algorithms and [V8 collection builtins](https://github.com/v8/v8/blob/main/src/builtins/builtins-collections-gen.cc).
Like V8's general computed path, Rift performs a fresh storage operation after
the callback rather than retaining a potentially stale entry. No engine source
was copied.
