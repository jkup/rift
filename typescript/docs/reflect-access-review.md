# Reflect property access review

TS-470, 2026-11-11. Reference review only; implementation waits for the Reflect
mutation native regression gates.

Add `get`, `set` and `has` through the existing internal property operations.
Validate the object target before key conversion. Omitted receivers default to
the target; explicit undefined, null and primitive receivers remain unchanged.
Getters and setters receive that exact value, subject to their own function
strictness. Setter return values do not determine the boolean write result.

Preserve inherited readonly-property rejection and receiver-own descriptor
checks. A writable inherited data property can create a property on a distinct
receiver; a receiver accessor must not be called by that data-property path.
Presence checks include inherited undefined-valued properties without invoking
getters. Key conversion effects occur before the property operation.

These requirements follow the specification's
[Reflect operations](https://tc39.es/ecma262/multipage/reflection.html).
Twenty-six independent Node reference programs pass in
`build/review-reflect-access-reference.mjs`. Receiver-sensitive accessors declare
strict mode explicitly, avoiding dependence on the reference runner's module
mode. Results are retained in `build/reflect-access-reference.json`. Add Realm
restoration, abrupt-value and budget tests in Rift before acceptance. Keep
`apply` as a separate increment.
