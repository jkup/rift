# Object integrity methods

TS-098 installs Script Object.preventExtensions, seal, freeze, isExtensible,
isSealed and isFrozen. Primitive inputs are never boxed or coerced: mutators
return the input unchanged, isExtensible returns false, and the other predicates
return true. Missing arguments follow the same undefined behavior.

Mutators prevent extensions before changing descriptors, then use the existing
own-key and property-definition operations. Sealing clears configurability;
freezing additionally clears writability on data properties. Accessor functions
and referenced nested objects are retained. Arrays and string wrappers use their
existing exotic descriptor operations, including array length and virtual string
indices. Symbol and nonenumerable properties participate.

Each descriptor visit charges the execution budget. A failed definition or
resource limit preserves the already completed prefix; these operations are not
transactions. Own-key materialization remains an atomic internal operation, so
the step budget is not a memory quota. Rejected internal operations become a
TypeError from the owning builtin Realm. Proxy support remains separate.

Tests cover primitives, metadata, strict and sloppy writes, shallow freezing,
accessor effects, sparse arrays, string wrappers, functions, symbols, failed
internal operations, foreign errors and bounded scans. Trusted host subclasses
exercise rejection paths without exposing a guest Proxy implementation.

References: ECMAScript 2023 [Object methods](https://tc39.es/ecma262/2023/multipage/fundamental-objects.html#sec-object.freeze)
and [integrity operations](https://tc39.es/ecma262/2023/multipage/abstract-operations.html#sec-setintegritylevel).
The C++ reference is src/builtins/object/object.cpp at 1d39c7e2. Its delayed
preventExtensions call and unchecked property-definition results were not adopted.
