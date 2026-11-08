# Object.fromEntries and synchronous iteration

TS-109 adds Object.fromEntries and synchronous iterator acquisition, stepping and
throw cleanup. Acquisition preserves primitive receivers and saves next once.
Stepping reads done before value. Entry processing reads properties 0 and 1 before
converting the key, then defines an own writable, enumerable, configurable data
property. Duplicate keys overwrite without moving their insertion position;
symbols and __proto__ are ordinary property keys. The result uses the builtin's
Realm, independent of its this argument.

The implementation follows [Object.fromEntries](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.fromentries),
[AddEntriesFromIterable](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-add-entries-from-iterable)
and the current [iterator operations](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-iteratorclose).
Acquisition and step/value failures propagate without closing. Entry validation,
entry getters and key conversion failures close the iterator. An existing guest
throw takes precedence over cleanup getter/call errors or a primitive return.
The throw-only helper deliberately does not implement normal-completion closing.

Resource limits and unsupported-operation completions are engine stop conditions,
not guest exceptions: they skip cleanup when already pending and remain fatal if
encountered during cleanup. This preserves Rift's existing uncatchable guards.
Each iteration is metered, including iterators implemented by host builtins.

[V8's implementation](https://github.com/v8/v8/blob/main/src/builtins/object-fromentries.tq)
was consulted on 2026-11-08. Its optimized array path is unnecessary here; Rift
always observes the iterator protocol. Its slow path places stepping and value
reads inside a broader cleanup catch. Rift follows the current normative
AddEntriesFromIterable boundary instead and tests it explicitly. No V8 code was
copied. The inaccessible specification adder is inlined into entry processing.

Tests cover ordering, saved next methods, primitive receivers, own-property
creation, cleanup precedence, foreign Realms and engine stop conditions. Async
iteration, Map, for-of, spread and general iterator helpers remain separate work.
