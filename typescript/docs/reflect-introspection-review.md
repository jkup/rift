# Reflect introspection review

TS-468, 2026-11-11. Reference review only; implementation follows private-brand
native regression checks. Reflect currently exposes only `construct`.

Add `ownKeys`, `getOwnPropertyDescriptor`, `getPrototypeOf` and `isExtensible`
through the existing GuestObject operations. Reject every primitive target
without boxing. For descriptors, target validation precedes key conversion,
and conversion precedes reading the current own descriptor. Reuse the existing
descriptor-object conversion so returned records remain detached and allocated
in the builtin's Realm. Descriptor inspection must not call a getter.

`ownKeys` preserves the internal key order and symbol identity, including
non-enumerable properties. It returns a fresh Realm-owned array. Reuse the
existing budgeted array builder and charge key conversion work. Private fields
and methods remain absent from ordinary own keys.

These choices follow the specification's
[Reflect operations](https://tc39.es/ecma262/multipage/reflection.html).
Seventeen independent Node checks pass in
`build/review-reflect-introspection-reference.mjs`; results are retained in
`build/reflect-introspection-reference.json`. They establish expectations, not
Rift acceptance. Add cross-Realm allocation/error and budget tests with the
implementation, then validate both hosts. Keep mutation, property access and
`apply` for subsequent increments; preserve `construct` behavior.
