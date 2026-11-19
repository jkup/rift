# Certified syntax error production

The Script parser already certifies `regexp-literal` and `numeric-separator`
syntax errors, and the closed result codec already accepts those rule codes.
The producer's result type and guard omitted them, so observing `/(/;` or
`1__0;` threw the host error `unreviewed Script rule`.

TS-464 adds those two existing codes to the producer type and guard. It keeps
the closed whitelist, whole-source audit, harness precedence and parse-phase
attribution. No grammar or legacy protocol is widened.

The focused test checks six invalid sources under both parse-only and execute
actions, in test and harness units. It checks rule identity, Realm association,
completed prefixes, serialization and absence of test-body execution. Controls
preserve unsupported grammar, whole-source rejection and resource precedence.
Eight real producer records also pass the existing request-bound result codec;
unknown rule codes and runtime-phase substitutions are rejected.

Isolated validation passes 933 Node guests, focused native execution with
zero dynamic statements, five both-host regression groups, 15 native tooling
builds and all 295 tooling tests. Eight native producer records match Node and
pass the closed codec, including invalid-neighbor rejection. Integration remains
queued behind the Unicode rollup. The original producer failures are retained
in `build/certified-rule-producer-initial.json`.
