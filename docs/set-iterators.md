# Live Set iterators

TS-117 adds values, entries and the exact keys/Symbol.iterator aliases of values.
Each factory requires a genuine Set and creates a branded iterator. A lazy live
cursor starts at the collection's current head on first next; later deletions,
clears and insertions remain visible. Exhaustion clears the collection and cursor
references permanently. Deleted-node traversal remains metered.

Values use the stored canonical key; entries allocate a fresh [value, value]
array. Results and pairs cannot mutate collection state. Iterator prototypes are
Realm-owned and inherit the existing self-return iterator method. Private brands
survive prototype changes and freezing, and distinguish Set from Map/Array
iterators. Legacy roots remain unregistered.

Like Map iterators, Set follows CreateIteratorFromClosure's captured Realm for
yielded result objects and pairs. Done results and receiver errors belong to the
invoked next builtin's Realm. Tests cover borrowing in both directions, fresh
pair/result descriptors, live mutation and exhaustion, aliases, collection
consumer interoperation, brands and bounded deleted-node traversal.

Sources consulted 2026-11-08:
[CreateSetIterator](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-createsetiterator),
[Set iterator next](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-%setiteratorprototype%.next),
and [V8 collection iterators](https://github.com/v8/v8/blob/main/src/builtins/builtins-collections-gen.cc).
Rift retains the normative closure-Realm distinction documented for
[Map iterators](map-iterators.md), rather than adopting V8's next-context result
allocation. It reuses the existing live storage and result/pair helpers without
introducing general generators. No engine source was copied.
