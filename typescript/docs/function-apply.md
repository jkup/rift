# Function apply

TS-072 adds `Function.prototype.apply` through the existing call machinery.
The target must be callable before any argument-list access. Null or undefined
lists mean no arguments; other primitives fail. Object lists use LengthOfArrayLike,
then ordered Get operations for each index. Holes become undefined, inherited
elements remain visible, and later mutations affect unread values. Length is
captured before traversal and already-read values are retained.

The target receives the supplied this value and the complete list only after
all reads succeed. Errors preserve their identity, and target execution uses its
own Realm. Every list element consumes the active budget, bounding large sparse
lists without reserving their entire size. Existing profile guards remain in
force. Proper tail calls, bind and the Function constructor remain separate work.

This follows [Function.prototype.apply](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function.prototype.apply).
The C++ function builtin was consulted; its numeric-only length handling is not
copied. Tests cover receiver/argument preservation, generic lists, holes,
inheritance, mutations, read order, abrupt completions, Realm ownership,
metadata, invalid input and resource limits. Both guest suites pass 481/481; tooling290/290, runner30 and probes10 pass.
Native acceptance covers 85 initial passes and an isolated array-literals retry
after a Zig cache file-open failure; all 86 entries pass static coverage.
The apply driver is 4996/4996 static. Logs: `build/function-apply-*`.
