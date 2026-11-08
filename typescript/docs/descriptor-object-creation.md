# Descriptor-based object creation

TS-099 adds Script Object.defineProperties and Object.create. Both share the
existing descriptor conversion with Object.defineProperty. Creation accepts only
an object or null prototype, allocates an ordinary extensible object, and processes
an optional descriptor source. Undefined skips that optional step; it remains an
error when passed as the source to defineProperties.

The shared helper captures source own keys, visits enumerable properties, and
converts every descriptor before installing any. Getters can change later source
properties; enumerability and existence are checked at each visit. New keys are
outside the captured list. Descriptor fields can be inherited and retain their
specified read order. String and symbol keys use the same path.

Conversion failure performs no helper-owned target definitions. After conversion,
installation proceeds in key order through internal DefineOwnProperty, so a later
failure preserves earlier definitions. Array length/index behavior and string
wrapper restrictions stay in their existing exotic operations. Getter side
effects are ordinary guest effects and are never rolled back.

Collection and application are separately metered; tests exercise interruption
before writes, after a partial prefix and after successful completion. Own-key
materialization remains atomic. Tests also cover null/custom prototypes, default
attributes, accessors, inherited fields, source mutation, skipped properties,
symbols, primitive sources, array shrinking and foreign-Realm errors.

References: ECMAScript 2023 [Object.create and ObjectDefineProperties](https://tc39.es/ecma262/2023/multipage/fundamental-objects.html#sec-objectdefineproperties).
The C++ reference is src/builtins/object/object.cpp at ba9cbef3; its source-type
restriction, missing enumerability filtering and immediate per-property
application were not adopted. Legacy globals remain unchanged.
