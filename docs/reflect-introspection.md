# Reflect object introspection

TS-468 is in progress. Reflect exposes `ownKeys`, `getOwnPropertyDescriptor`,
`getPrototypeOf` and `isExtensible` alongside the existing `construct`.

Each method rejects primitive targets without boxing. Descriptor lookup converts
the property key only after validating the target, then reads the current own
descriptor. Object and Reflect share the existing descriptor-object conversion;
the returned object is detached and allocated in the builtin's Realm.

`ownKeys` converts the existing internal key list to a fresh guest array,
preserving order and symbol identities. Conversion and array construction use
the normal step budget. Private elements do not enter ordinary key storage.
Prototype lookup preserves the original prototype identity across Realms.

The design and specification links are in `reflect-introspection-review.md`.
Seventeen independent Node reference programs and focused Rift Node tests pass.
Additional tests cover method metadata, omitted keys, mapped arguments, foreign
Realm results/errors, non-constructibility and budget restoration. Full Node and
native acceptance remain pending. No historical fixtures or expectations change.
Other Reflect methods remain separate increments.

The focused native check passes19,854/19,854 static statements. The first regression run passed four groups, then exposed a runner omission: object-prototypes requires test/fixtures/prototypes.js. Both hosts rejected its missing argument. The original log/report are retained as initial-missing-fixture evidence. Only the runner changed; validation resumes the five unfinished groups with the canonical fixture argument, retaining the four passing groups.

Isolated validation passes937/937 Node guests, focused native with19,854/19,854 static statements, all nine corrected native regression groups, fifteen tooling-driver builds and296/296 tooling tests. Eight native producer records match Node and sixteen records pass parent envelopes. Combined canonical acceptance remains pending.
