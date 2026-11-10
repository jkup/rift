# Object spread

Spread evaluates each source in order and copies enumerable own string and symbol
properties into fresh data properties. It skips null/undefined, boxes other
primitives, captures keys once, and reads each current descriptor and value when
visited. Getters run with the boxed source as receiver; inherited setters on the
destination are bypassed. __proto__ is copied as ordinary data.

Object rest uses the same CopyDataProperties helper with its exclusion set. It
retains the existing per-key budget checks, already-boxed source and reference
evaluation order. The parser's cover entries continue to enforce the distinct
placement and trailing-comma rules of assignment rest.

References: [ECMAScript 2025 CopyDataProperties](https://262.ecma-international.org/16.0/#sec-copydataproperties)
and [object initializer evaluation](https://262.ecma-international.org/16.0/#sec-object-initializer-runtime-semantics-propertydefinitionevaluation).
