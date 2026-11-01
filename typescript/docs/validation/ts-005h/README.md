# TS-005H validation — 2026-11-01

Base: `4a408a0f929b178bcb16a85bd6724d6c041a8aba`, existing
`typescript-scriptc-probes` branch. Scope: ordinary presence and object-only
array-like length prerequisites. Awaiting coordinator review.

Commands run from `typescript/` with the pinned toolchain:

- `npm run typecheck`: pass (`typecheck.log`).
- `npm run test:runner`: 20/20 pass (`runner.log`).
- `npm run test:probes`: 10/10 pass, both hosts and static gates
  (`probes.log`, `probe-results.json`).
- `npm run test:guest:node`: rebuilt, 135/135 pass, no skips (`node.log`,
  `guest-node-results.json`).
- `npm run test:guest:native`: rebuilt, 135/135 pass, no skips (`native.log`,
  `guest-native-results.json`, `native-build-results.json`).
- `git diff --check`: pass.

Native compilation used command-local PATH with installed Zig 0.17.0 and
approved escalated library access. No compiler pins or gates changed. The initial
typecheck caught missing descriptor flags in the new host test's bootstrap calls;
those calls were corrected before the retained successful checks.

| Entry | Static statements |
| --- | ---: |
| CLI | 791/791 |
| realms | 856/856 |
| object-descriptors | 256/256 |
| object-prototypes | 863/863 |
| object-keys | 301/301 |
| conversion | 360/360 |
| definition-dispatch | 885/885 |
| array-storage | 1138/1138 |
| array-like | 487/487 |

The new compiled host driver asserts own/inherited undefined versus holes,
shadowing/deletion/nonconfigurability, a 20,000-link chain, realm isolation,
29 fixed conversion rows (also exercised through actual ordinary length Get),
inherited/missing/shadowed length, array length, and unsupported object values.
Its synthetic Get override verifies exact key, object receiver, location, call
counts, exact throw record/value/diagnostic identity and no conversion following
an abrupt Get. Presence does not invoke that Get override. Expected values are
asserted independently in each host, including positive-zero reciprocals and
length values beyond uint32 range; agreement alone is not the oracle.

No skips, timeouts, crashes or harness failures occurred in the successful runs.
Sources and design rationale are recorded in the TS-005H section of
`../../architecture-decisions.md`. These are bounded internal APIs: object
coercion remains explicitly unsupported, and ToObject, map, guest syntax/APIs,
accessors, proxies, callbacks/species and general exotic traversal remain out of
scope. TS-005B remains blocked. No successor work started.
