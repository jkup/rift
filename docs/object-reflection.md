# Own-property reflection

TS-100 adds Script Object.getOwnPropertyNames, getOwnPropertySymbols and
getOwnPropertyDescriptors. Inputs are boxed through the existing ToObject
operation; null and undefined fail. Legacy globals remain unchanged.

Names and symbols filter the existing ordered own-key list without reading
property values or filtering enumerability. They reuse the dense array builder
used by Object.keys/values/entries. Symbol values retain their identity.

Descriptor reflection builds fresh ordinary objects in the builtin Realm,
including one descriptor object per existing property. Data values and accessor
functions retain their identity; getters are not called. Result entries are
ordinary writable, enumerable, configurable data properties, including keys
such as __proto__. Source descriptors and values are not modified.

Tests cover index/string order, deletion and reinsertion, sparse arrays, boxed
strings, function properties, symbols, nonenumerable fields, accessors, fresh
descriptor records, foreign-Realm allocation/errors and bounded scans. Key
visits and result allocation are metered; own-key materialization stays atomic.

References: ECMAScript 2023 [Object reflection](https://tc39.es/ecma262/2023/multipage/fundamental-objects.html#sec-object.getownpropertydescriptors)
and src/builtins/object/object.cpp at 368c7133. The C++ primitive-input shortcuts
are not adopted; string primitives expose their indexed properties and length.
