# Enumerable property copying

TS-102 adds Script Object.assign and Object.prototype.propertyIsEnumerable.
Assignment boxes its target, skips null/undefined sources, and boxes other source
primitives. Each source's ordered own-key list is captured separately. Existence
and enumerability are checked at each visit, so earlier getters or setters can
affect later properties. Symbols use the same path as string keys.

Source getters run with the source receiver; writes use the existing strict
property setter, including inherited setters, readonly properties and array
length behavior. Failure stops copying without rolling back earlier writes.
Descriptor attributes are not copied: ordinary new target properties receive
the attributes supplied by normal property assignment.

propertyIsEnumerable converts its key before boxing the receiver, then inspects
only the own descriptor. It does not invoke a property's getter. Primitive
boxing and language errors use the builtin Realm. Legacy behavior is unchanged.

Tests cover source/target effects, visibility changes, deletion and added keys,
multiple sources, primitive strings and targets, symbols, inherited setters on
nonextensible targets, strict rejection, partial writes, key-conversion order,
foreign Realms and bounded copying. Sources and keys charge steps; own-key
materialization remains atomic.

References: ECMAScript 2023 [Object.assign](https://tc39.es/ecma262/2023/multipage/fundamental-objects.html#sec-object.assign)
and [propertyIsEnumerable](https://tc39.es/ecma262/2023/multipage/fundamental-objects.html#sec-object.prototype.propertyisenumerable).
The C++ reference is src/builtins/object/object.cpp at 3c7c2021; primitive skipping,
pre-filtered enumerable key lists and direct symbol descriptor values were not
adopted.
