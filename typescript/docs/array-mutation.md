# Array mutation

TS-039 adds `Array.prototype.push` and `pop` to the shared Realm bootstrap.
Both methods are generic: they use ordinary guest Get, Set and Delete operations,
so array-like objects, inherited elements and accessors follow the same path.
No new storage representation or guest reflection API is introduced.

The implementation follows ECMA-262
[push](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.push)
and [pop](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.pop).
The corresponding algorithms in
[engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/ArrayPrototype.mts)
were consulted for operation order. Rift uses its existing completion records
and object methods, and iterates arguments directly without shifting an array.

Length is read and coerced once. All writes are strict even when called from
sloppy code. Empty operations still write length. Pop reads the final element,
deletes its own property, then writes length. A later error preserves earlier
mutations. Push rejects lengths above the safe integer limit before writing;
the separate array length limit can fail after an ordinary property was added.
Push charges the execution budget before each element write.

`test/array-mutation.ts` checks operation order, inherited values, descriptors,
accessors, abrupt completion, partial mutation and interruption. CLI cases cover
arrays, holes, generic receivers, length coercion, strings, nullish values and
the array length boundary. Existing bootstrap tests retain exact inventories.

Validation: typecheck, 20 runner tests and all ten compiler probes pass. All 72
native entries build with full static coverage. The guest suites pass 232/232
in both Node and native hosts, with no skips. The expanded mutation driver was
also rebuilt separately: 4132/4132 statements compile statically. Logs are under
`build/array-mutation-*`.

Guest accessor syntax, reflection, proxies and other missing Array methods
remain outside this change.

## Reverse (TS-050)

`Array.prototype.reverse` is generic and returns its boxed receiver. It captures
length once, visits each outer pair and leaves the middle element untouched.
Presence checks distinguish holes from present `undefined` values and include
inherited properties. Each pair reads the lower element before checking the
upper element, then performs strict writes and deletions in specification order.
It never writes length. Earlier mutations survive a later failure.

The implementation follows
[ECMA-262 reverse](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.reverse),
with the corresponding engine262 algorithm at the revision linked above checked
for operation order. Rift charges its execution budget before each pair, even
when both properties are absent. No dense-array shortcut bypasses observable
guest operations.

The mutation driver checks all four presence combinations, inherited values,
accessor receivers, length changes during a getter, strict write/delete failures,
partial mutations and interruption between pairs. CLI tests cover dense and
sparse arrays, generic receivers, coercion, primitive boxing and method metadata.
Validation: both guest suites pass 290/290, the full tooling suite passes
290/290, and the 20 runner tests and ten compiler probes pass. All 73 native
entries build with full static coverage; the expanded mutation driver has
4368/4368 static statements. Logs are under `build/array-reverse-*`.
