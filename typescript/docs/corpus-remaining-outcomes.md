# Remaining C++ fixture outcomes

TS-562 reviews the accepted TS-551 corpus: 225 original files, 117 reported
successes and 74 completions without recognized checks. All original and retained
fixture hashes match. Node-hosted and native Rift agree on outcomes, reported
checks, failures, exit status and stdout. This is a first-failure inventory, not
a complete C++ feature comparison or ECMAScript conformance score.

| Remaining category | Files | Consequence |
| --- | ---: | --- |
| Nonstandard host helpers | 12 | Fixtures call `createArray`, `gc` or `gcStats`. The runner intentionally does not inject these helpers. |
| Weak-storage backend | 7 | WeakMap, WeakSet, WeakRef or FinalizationRegistry is absent. The pinned native backend remains a genuine prerequisite. |
| Temporal fixture contracts | 9 | Eight files call constructors without `new`; the Instant fixture expects Number nanoseconds and a false result for an invalid string. |
| Other invalid expectations | 5 | Invalid array length, invalid loop target grammar, overwritten function binding, boxed-string enumeration, or malformed string quoting. |
| Intentional uncaught throw | 1 | The fixture explicitly requires execution to stop at its first throw. |
| Total remaining | 34 | All remain visible in the unchanged 225-file denominator. |

Six exact-byte fixtures were independently executed as Node CommonJS files.
The array-length, loop grammar, overwritten-function and malformed-string inputs
produce the corresponding error categories. The object enumeration fixture has
identical stdout, including its failed assertions; the throw fixture terminates
on its deliberate uncaught value. No compatibility edits were made.

The Temporal constructor discrepancy was reviewed previously in the roadmap.
The Instant discrepancy also follows the current specification: epoch nanoseconds
are BigInt, and `equals` converts its argument through `ToTemporalInstant`, which
throws on an invalid string. See [Instant slots](https://tc39.es/proposal-temporal/#sec-properties-of-temporal-instant-instances)
and [equals](https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.equals).

The [native host review](native-host-prerequisites.md) records the weak-storage
compiler and coverage failures. Strong maps and no-op GC hooks would not satisfy
these requirements. Other remaining outcomes do not identify an unblocked
interpreter fix at their current stopping point; they may hide later gaps.

Finish the pending pattern milestone, then prioritize precise semantic gaps and
backend feasibility over increasing this raw completion count. Keep the original
corpus as a regression check and add standards-correct tests separately. This
review does not establish complete parity or justify dropping any fixture.

Evidence: `build/corpus-residual-review/reviewed.json` contains all 34 paths,
diagnostics, hashes and categories; the same directory retains the six independent
Node process records. Source reports are `legacy-suite-node-gUQDzE` and
`legacy-suite-native-AEE2IL` under `build/`.
