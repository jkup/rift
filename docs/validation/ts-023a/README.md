# TS-023A implementation evidence — independent review pending

2026-11-02; assignment base ecb7e3f, dispatch 51d48bd, accepted design cb04609,
existing codex/primitive-computed-keys. Source retention and Function.toString
are delivered atomically. No C++, pins, compiler annotations/import workaround,
COORDINATION, Claude output, unrelated syntax/method, branch switch or merge.

## Validation

From typescript/:

- `npm run typecheck`: PASS.
- `npm run test:runner`: 20/20, zero skips/failures.
- `npm run test:probes`: 10/10; both executions and both compilation gates.
- `npm run test:guest:node`: 167/167, zero skips.
- `npm run test:guest:native`: 167/167, zero skips, rebuilt all 25 drivers.
- Every native static-only build and separate parsed coverage gate passes.
  CLI: 1437/1437 static statements; Function driver: 1750/1750.

The original 166 cases and 24 gates remain. The new host driver adds one case
and one gate; it reads both new fixtures from disk at runtime in each lane.
`full-{node,native}.txt`, `typecheck.txt`, `runner.txt`, `probes.txt`, and the four
retained result JSON files contain the final records. Native driver compilation
finished after the last test edit; the final Node lane was rebuilt afterward.

`native-initial.txt` retains the Zig installation-access sandbox failure. That
run was interrupted after the known environment failure; it is not a successful
or skipped native validation. The final authorized run used the installed,
unchanged Zig directory on PATH with library access.

`function-coverage-initial.txt` retains SC1090 for test-only PropertyKey[].join.
`join-union-reduction.ts` and its coverage transcript reduce it to two analyzed
statements before the assertion was changed. F2 now checks each exact key and
count directly, avoiding any conversion of symbol keys. No production workaround
or gate relaxation was needed. `node-initial.txt` preserves the first complete
166-case compatibility run after explicit caller and expectation migrations.

## Matrix mapping

All 61 frozen rows are implemented in `test/function-string-conversion.ts`.
Expected strings, ranges, diagnostics and effects are independent literals.
There are no oracle exceptions or unsupported-syntax scope expansions.

| Rows | Assertions |
|---|---|
| S1-S9 | Copied literal design ledger: 9 original inputs/11 fixed ranges; parser/closure range identity and source record sharing; exact output; EOF offsets; CRLF/U+2028/U+2029 locations; decoded string token independent of raw range. S6 constructs surrogate code units in the host string, avoiding UTF-8 decoding claims. |
| S10-S14 | Distinct objects/environments sharing one AST range; repeated parses with distinct records/ASTs; old/new call results 1/2; retained inner after local outer references disappear; inner allocated after an unrelated later parse. No GC-timing claim. |
| S15-S16 | Hoisted stringification before declaration execution; explicit source-less host callable gives unnamed native form. |
| S17-S19 | Exact 100000-unit accepted input/range and 100001-unit rejection; missing brace and all five unsupported syntax negatives with fixed messages/positions. |
| F1-F4 | Per-Realm identity, owner/prototype, descriptors/name/length, exact root keys and absent constructor/global; root/method/call/log/isFinite/symbol native text. |
| F5-F8 | Raw null/empty/ASCII/keyword names; rejected factory and raw metadata; host-fault cleanup; descriptor deletion/redefinition with poison hooks; saved source versus explicit custom Object tag. |
| F9-F13 | All primitive categories, objects/arrays/wrappers and noncallable Function descendant; throwing Get observers; ignored poison extra argument; no callback/body effects; undefined detached receiver; exact 77:9 TypeErrors and cleanup. |
| F14-F15 | Foreign/null relinking preserves source/owner; invalid negative/fractional/NaN/equal/reversed/out-of-bounds/infinite ranges rejected as exact host errors. |
| R1-R5 | Zero-step direct calls, call-depth precedence, invalid-receiver cleanup; borrowed call at depth 1/2; A method and foreign guest/builtin/root metadata with unchanged object/owner identities and C restored. Existing operation-context tests retain independent active-Realm transition coverage. |
| R6-R10 | All hints with exact lookup ticks; observed candidate order/count and sequential calls; property key; failed tick boundaries; call rejection at step 2. |
| R11-R12 | Success after steps already exhausted without changing count; explicit untagged Object Function tag with one body tick. |
| C1-C4 | Runtime-read fixture: both additions; unary/arithmetic NaNs and numeric relations; lexical function-source ordering versus identity; exact key, same-source collision, spacing distinction and absent former tag key. |
| C5-C7 | Saved join and runtime join see source; invalid length fixed at 32:27 with length unchanged; primitive-only Number/String/Length conversions reject object without invoking poison protocol hook. |
| C8-C10 | Changed/next methods and saved text; valueOf mutation before fresh toString lookup with literal trace; root deletion re-exposes Object tag at four ticks, saved method and another Realm remain valid. |
| C11-C13 | Noncallable own shadow at three ticks; protocol success/original abrupt/noncallable precedence and original number hint; null prototype fails after three lookups while saved source survives. |
| C14-C15 | Runtime-read saved/overridden method behavior; separately read invalid receiver fixture gives exact runtime error at 2:1, with normal AST ticks and call/Realm cleanup. |

## Caller and expectation inventory

`inventory-before.txt` repeats the accepted design search before changes.
`inventory-after.txt` repeats it after integration and expands it to direct
Evaluator.closure callers. Typechecking additionally found three trusted closures
in operation-context.ts (two impossible-control injections and one empty body);
these now explicitly pass null. Parser-owned declarations and expressions always
pass their source; existing three createGuestFunction host sites use null.
Every raw builtin test literal supplies initialName:null; root uses the empty
initial name and createBuiltin captures its validated input name.

Only the frozen Function expectations migrated: object-valueof inherited method,
source and 4->3 ticks; operator-coercion addition; implicit fixture conversion;
realms G14 addition and G17/W1 root keys; Boolean/String M8 and Array C8 root native
form. Explicit Object tag matrix/observers, Number string-hint limits, Object/Array
results, null-root/both-object negatives and prior budgets remain intact. Realm
keyFunction remains absent because its source key is absent, now documented as
such. No denominator reduction or replacement of prior assertions.

## Remaining limits

Independent coordinator review is pending; this is not a full conformance claim.
Only existing declarations and anonymous expressions retain source. Named
expressions/arrows/classes/generators/async and public constructors/name inference
remain unsupported. Metadata is immutable by readonly typing and trusted internal
convention, not protection against hostile host casts. Trusted host AST/range
semantic correspondence is not reparsed. The 100000-unit bound is per source,
not an aggregate retained-heap/output quota. Native names intentionally accept
only the reviewed ASCII/empty/specific Symbol-name subset. Number formatting and
Array cycle-empty-string compatibility retain their existing deferred status.
