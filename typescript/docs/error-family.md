# Error brand predicate and native errors

TS-118 adds Error.isError, EvalError and URIError to Script Realms. The predicate
uses the existing GuestError brand without reading guest properties or invoking
coercion. It works across Realms and after prototype changes; a matching name,
prototype or toStringTag cannot forge the brand. Native error prototypes are
ordinary unbranded objects.

EvalError and URIError use the existing public error construction path, retaining
message conversion before cause access, ordinary inherited cause lookup, fresh
Realm-owned instances and non-enumerable message/cause properties. Their
constructors inherit from Error, so they inherit isError as well. Adding these
constructors does not add eval or URI encoding/decoding functions. AggregateError,
SuppressedError and host DOMException support remain outside this task.

ErrorName is extended for intrinsic allocation/bootstrap. Runtime observation
constructor names and diagnostic names already use strings; no schema changes
are needed. Closed syntax-error classifications and historical observation
literals are unchanged. Current bootstrap inventories now include the two
globals and Error's additional own method.

Sources consulted 2026-11-08:
[Error.isError](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-error.iserror),
[native errors](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-native-error-types-used-in-this-standard),
and [V8 error builtins](https://github.com/v8/v8/blob/main/src/builtins/builtins-error.cc).
Rift uses its own existing error class brand, with no host-wrapper or DOM objects.
No engine source was copied.

Tests cover all seven error families, forged and relinked objects, ignored guest
getters, callable/constructible metadata, message/cause order, abrupt completion,
foreign Realms and bounded coercion/calls.
