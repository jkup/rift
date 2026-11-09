# Arguments objects

TS-144 is in progress. Guest syntax and implicit bindings are not yet enabled.

The first slice adds GuestArguments storage backed by parameter binding cells. Ordinary descriptor storage remains responsible for validation and attributes; mapped reads substitute the current cell value. Successful value definitions update the cell. Deletion, accessor conversion and making an index non-writable disconnect its mapping. A non-writable definition without a value snapshots the current parameter before disconnecting. Failed definitions and failed deletion retain the mapping. Writes through another receiver leave the parameter unchanged.

The focused storage driver exercises these rules through Rift property operations, including inherited receivers, detached descriptors, seal/freeze and index writes that do not change length. Function activation, intrinsic iterator/callee properties, branding, strict syntax and arguments binding creation remain required before acceptance.

References consulted 2026-11-09: ECMAScript [arguments exotic objects](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arguments-exotic-objects) and engine262 [arguments operations](https://github.com/engine262/engine262/blob/main/src/abstract-ops/arguments-operations.mts). Rift uses direct binding cells instead of hidden getter/setter functions per mapped index; these cells stay inside host implementation state. Mapping semantics follow the descriptor algorithms, including taking a value snapshot before removing a writable mapping.

Storage slice validation: typecheck and focused Node/native driver pass; pinned static-only build and parsed coverage report 7998/7998 static statements with zero dynamic operations. Logs: build/arguments-storage-*. Full TS-144 acceptance remains pending.
