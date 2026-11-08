# Ordered keyed collection storage

TS-110 supplies storage for the upcoming guest Map. It does not register public
Map methods. A host Map indexes primitive payloads, GuestObject references and
GuestSymbol references directly; guest Value wrappers are not lookup keys.
This gives SameValueZero lookup without coercion or serialized identity. Stored
zero keys are canonical positive zero. An absent lookup uses host undefined,
distinct from a stored guest undefined Value.

An ordered doubly linked list holds live entries and one empty tail node. Inserting
fills that tail and appends a new empty node. Updating an existing key changes its
value in place. Deleting unlinks the live node, clears its key/value payload and
backward link, and keeps its forward link for any cursor already pointing there.
Clearing uses the same deletion path. Existing cursors can reach later insertions
through the retained empty tail; a cursor that reaches exhaustion stays exhausted.

The lookup index and live list do not retain deletion history. Only an outstanding
cursor can retain deleted nodes on its forward path, without their guest payloads.
Fresh cursors start at the live head. This avoids an ever-growing tombstone array
without tracking iterator finalization or compacting indices. Clear and traversal
over deleted nodes are metered; interruption leaves both index and list consistent.
Constant-time lookup and list updates rely on the host Map implementation; no
throughput benchmark is claimed. Public callers must meter individual operations.

The [Map specification](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects)
requires sublinear average lookup and live mutation semantics. V8 uses an
[ordered hash table with iterator transitions](https://github.com/v8/v8/blob/main/src/builtins/builtins-collections-gen.cc).
Rift uses a host lookup index and explicit cursor links instead of adopting V8's
table migration machinery. The C++ implementation's property-backed slots and
string-derived keys are not copied. Sources consulted 2026-11-08.

## Validation and compiler boundary

The mixed-key probe passes on Node and native, with 20/20 static statements:
`build/map-key-probe.ts`, `build/map-key-probe-{build,coverage}.log`. It checks
null/undefined/booleans/numbers/strings/object references/symbol references, NaN,
signed zero, deletion and clear. The integrated storage driver uses real guest
objects from two Realms and reports 6771/6771 static statements. It covers live
insertion, updates, deletion/reinsertion, clear, multiple cursors, permanent
exhaustion, 2,000-entry churn and interrupted traversal/clear.

A standalone driver importing GuestObject alone fails native lowering of its
recursive callable types. The three-line `build/keyed-reachability-direct.ts`
reproduces it; `build/keyed-reachability-realm.ts` creates an object through an
actual Realm and builds successfully. Their logs and the original failed driver
log (`build/keyed-collection-build.log`) remain retained. The test now creates real
Realm-owned keys, as public collection use will. No production workaround or
dynamic tier was introduced. This evidence does not establish that arbitrary
isolated imports of the runtime type graph compile.
