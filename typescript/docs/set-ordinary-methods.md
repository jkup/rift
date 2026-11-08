# Set construction and ordinary methods

TS-116 adds Script Set with a distinct GuestSet brand. It reuses KeyedCollection:
Set elements are the keys, and unused value slots hold the shared undefined value.
This preserves SameValueZero identity, canonical positive zero, insertion order,
released deleted payloads and live cursors without a second storage algorithm.

Construction skips adder lookup for nullish input. Otherwise it reads and
validates add once before acquiring an iterator, then calls that saved method for
each value. Adder throws close the iterator; acquisition and step/value errors
propagate without cleanup. The shared iterator operations retain original guest
throws and uncatchable engine stops.

The prototype provides add/has/delete/clear, size and forEach. forEach uses a live
cursor and supplies the element twice, then the Set, with the requested receiver.
Deletion, clearing and reinsertion remain observable during callbacks. Prototype
changes cannot forge or erase the brand, and freezing the ordinary object does
not freeze collection contents. Set.prototype itself is unbranded. Constructors,
methods, roots and new errors belong to their Realm; legacy registration is
unchanged. Species and toStringTag have their specified descriptors.

Sources consulted 2026-11-08: [Set construction](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-set-iterable),
[Set prototype methods](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-properties-of-the-set-prototype-object),
and [V8 collection builtins](https://github.com/v8/v8/blob/main/src/builtins/builtins-collections-gen.cc).
Rift uses generic iteration and its existing live cursor rather than specialized
array paths or table-transition machinery. No engine source was copied.

Tests cover identity, signed zero, constructor ordering and saved methods,
cleanup phases, live/nested callbacks, brands, descriptors, foreign Realms and
resource limits. Public Set iterators and set algebra follow separately.
