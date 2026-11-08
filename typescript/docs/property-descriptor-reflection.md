# Property descriptor reflection

TS-064 adds `Object.defineProperty` and `Object.getOwnPropertyDescriptor` in
Script Realms. Definition requires an object target, converts its key, then
reads descriptor fields in specification order: enumerable, configurable, value,
writable, get, set. Presence checks include inherited fields. Missing fields stay
absent; present guest undefined stays present. Flags use truthiness, accessor
endpoints must be callable or undefined, and mixed data/accessor records fail.
Descriptor conversion completes before definition starts.

Definition uses the existing object, array and string dispatch. Rejection throws
TypeError, while existing abrupt completions propagate unchanged. Array-length
truncation can partially succeed before failing on a fixed element; its restored
length and delayed writable flag remain observable. Successful definition
returns the original target.

Inspection boxes primitives and converts the key, then returns undefined for a
missing own property or a fresh ordinary descriptor object. Inspection does not
invoke the inspected getter. Descriptor fields are writable, enumerable and
configurable; editing the result does not change the target. The builtin's Realm
owns the returned object. Conversion and allocation use the operation budget.

The implementation follows [ToPropertyDescriptor and FromPropertyDescriptor](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-topropertydescriptor)
and [Object descriptor methods](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.defineproperty).
The C++ `src/builtins/object/object.cpp` implementation was consulted. Its silent
invalid-input returns and own-only descriptor-field checks are not copied.

Tests cover ordered field effects and throws, symbol keys, inherited descriptors,
data/accessor defaults, fixed properties and SameValue, array rollback, string
virtual properties, function objects, Realm identity and resource limits.
Native and regression acceptance is pending. Object.defineProperties and other
reflection methods remain separate work.
