# Boolean call and construction

TS-057 installs `Boolean` in Script Realms. `Boolean(value)` returns primitive
truthiness; `new Boolean(value)` creates a `GuestBoolean` with a private Boolean
slot. Missing arguments produce false. Objects, including boxed false values,
produce true without reading or calling conversion hooks.

Construction reads the constructor prototype and charges allocation through the
operation context. Calls borrowed across Realms keep the constructor's owning
Realm. The existing Boolean prototype methods retain their brand checks.

The implementation follows [ECMA-262 Boolean construction](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-boolean-constructor-boolean-value).
The C++ implementation in `src/builtins/boolean/boolean.cpp` was consulted;
TypeScript uses its existing private slot instead of the C++ implementation's
ordinary `value` property. Classes and alternate `newTarget` remain unsupported.

Host tests cover every supported primitive kind, object truthiness, poisoned
conversion hooks, genuine slots, Realm ownership and allocation budgets. CLI
tests cover call/construct results, extra argument effects, metadata and borrowed
methods. Node guests pass 336/336; native acceptance is pending.
