# Live Map iterators

TS-112 adds Map keys, values, entries and the exact entries Symbol.iterator alias.
Factories require a genuine Map and create branded iterator objects. A cursor
starts on first next, observes updates and later insertions, skips deleted entries,
and survives clear/reinsertion. Exhaustion releases the Map and cursor and remains
permanent. Each entry pair and iterator result is fresh. Map storage and iterator
state remain separate from guest-visible properties, so freezing or relinking an
iterator does not freeze its progress.

[CreateMapIterator](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-createmapiterator)
uses a captured closure context. Like [String iteration](string-iterators.md),
yielded results use the factory Realm, while completion results use the next
builtin's Realm. Entry arrays are created inside the captured context too. The
array-from-list helper now accepts an explicit allocation Realm; its default and
all existing Array callers retain their previous behavior. Brand errors use the
invoked builtin's Realm. Tests borrow factories and next in both directions.

[V8's Map iterator implementation](https://github.com/v8/v8/blob/main/src/builtins/builtins-collections-gen.cc)
was consulted on 2026-11-08. Rift uses its existing live linked cursor rather than
ordered-hash-table transitions, and follows the normative captured-Realm result
allocation. No general generator implementation is needed: next calls no guest
hooks. Advancing and skipping deleted nodes are metered; result/pair allocation
uses the existing bounded helpers.

Tests cover all three iterator kinds, alias/metadata/brands, independent cursors,
mutation and permanent exhaustion, result descriptors, cross-Realm results/pairs,
and bounded traversal through 2,000 deleted nodes. Object.fromEntries(map) and
new Map(existingMap) now use the same ordinary iterator protocol as other inputs.
Grouping, upsert, Set, for-of and spread remain separate tasks.
