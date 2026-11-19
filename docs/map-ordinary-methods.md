# Map construction and ordinary methods

TS-111 registers Script Map with get, set, has, delete, clear, size and forEach.
The constructor requires new and owns a branded GuestMap with private indexed
storage. The prototype itself has no Map brand. Freezing or changing an instance's
prototype does not change its collection data. Borrowed methods accept genuine
Maps from another Realm; errors and newly constructed objects use the invoked
builtin's Realm. Legacy bootstrap is unchanged.

Construction accepts null/undefined as empty. For other inputs it gets set once,
checks callability before acquiring the iterator, and invokes the captured adder
for each pair. The shared AddEntriesFromIterable helper reads key then value and
closes only entry-processing failures. Object.fromEntries uses the same traversal
with its internal property-defining adder. Existing cleanup and fatal engine-stop
tests continue to cover that shared path. No guest function is allocated for the
specification's inaccessible fromEntries adder.

Map keys are never coerced. [Ordered storage](keyed-collection-storage.md) preserves
SameValueZero, insertion order and live cursors. forEach passes value, key and map,
with the supplied this argument. Updates to pending entries are visible; deletion
skips pending entries, and reinsertion/appending can extend traversal. Clear and
cursor traversal are bounded, including repeated delete/reinsert callbacks.

The implementation follows the current [Map algorithms](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects).
[V8 collection construction and forEach](https://github.com/v8/v8/blob/main/src/builtins/builtins-collections-gen.cc)
were consulted on 2026-11-08. Rift retains the explicit adder lookup and live
cursor semantics, without V8's optimized array path or table transitions. Its
current normative iterator-step/entry-cleanup boundary is shared with
[Object.fromEntries](object-from-entries.md).

The species getter is generic and returns its receiver; its accessor name is
accepted by native-function formatting. Public Map iterators, groupBy and upsert
methods remain separate tasks. Existing constructor infrastructure supports
equal-newTarget construction; subclass/super/Reflect construction is not added.
