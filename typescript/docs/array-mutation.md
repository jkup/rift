# Array push and pop

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

Validation is pending the full native build. Guest accessor syntax, reflection,
proxies and other missing Array methods remain outside this change.
