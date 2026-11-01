# TS-005B internal map evidence (2026-11-01)

Base: `522b9d719cb02914445cc366c91b1f9c54abc669`, existing
`typescript-scriptc-probes` branch. Awaiting coordinator review.

`src/array-map.ts` implements the frozen object-only default-array operation.
Only the compiled test driver installs `host.__testMapObjectDefaultArray`.
The driver reads `test/fixtures/array-map/callbacks.js` at runtime, parses it
with Rift and executes callbacks through the current evaluator context.
No guest source is compiled by the host or scriptc.

Validation commands: `npm run typecheck`, `npm run test:runner`,
`npm run test:probes`, `npm run test:guest:node`, `npm run test:guest:native`.
Full command transcripts and subprocess result JSON accompany this document.
Runner: 20/20. Probes: 10/10. Rebuilt suites: 137/137 each, no skips.
All eleven native entry points pass static-only build and separate coverage.
Final map driver: 1271/1271 static statements, zero dynamic.
The harness retains its 10-second execution timeout, separate timeout/crash/
harness/error/output classifications and all existing expected results.
Windows linking uses installed Zig 0.17.0 on command-local PATH with authorized
library access. No toolchain or acceptance gate changed.

## Matrix coverage

All assertions below run in the compiled actual-runtime `test/array-map.ts`
in both hosts; the success marker is emitted only after every assertion.
They check fixed expected values, traces and diagnostics rather than parity.

| Reviewed rows | Assertions / fixture |
| --- | --- |
| Primitive/missing input | Every currently representable primitive and no arguments reject object-only adapter |
| Length throw before invalid callback | Traced length throws the original sentinel; only Get length |
| Object length before invalid callback | Conversion TypeError contains object boundary; only Get length |
| Missing/-1/NaN/string zero with invalid callback | TypeError, including noncallable object callback |
| Fractional string length | 2.9 maps 4/5 to 8/10; exactly two Has/Get pairs |
| Empty input | Distinct fresh zero arrays; no index operations or ticks with maxSteps zero |
| Ordinary constructor | Constructor 7 is never read |
| Array constructor | Own/inherited undefined accepted; exactly one ordered Get; invalid callback suppresses constructor throw; valid callback preserves exact throw |
| Unsupported constructors | Null/number/object reject on empty input; no read of constructor object's properties |
| Oversized generic length | 4294967296 and Infinity: RangeError, invalid callback TypeError first, no indices |
| Huge sparse input | 4294967295 with M=3: Has 0,1,2, steps=4, no callback |
| Own undefined/hole/inherited value | Own 0 undefined, hole 1, inherited 2=7; exact callback args/index types; W/E/C result flags |
| Inherited undefined | Becomes an own result property |
| Undefined callback return/trailing holes | Own undefined 0, holes 1/2, length 3 |
| Future value/fill/growth | Parsed mutate changes 1, fills 2, adds 3 and grows length; visits only saved 0..2 |
| Future deletion | Host deletion skips absent 1, or visits inherited fallback 9 |
| Array shrink | Parsed shrink to length 1 removes later own values but visits inherited 2; result length remains 3 |
| thisArg | Parsed receiver returns exact object/number/null/undefined, omitted adapter argument is UNDEFINED |
| Closure/arguments/aliasing | Parsed retained closure observes original element object, numeric index, input identity and this; counter survives two current evaluators; result element aliases original object |
| Has false/Has throw/Get throw | Hole traces omit Get/Call; index-1 faults preserve exact record/value/diagnostic after one callback |
| Guest throw | Parsed throwing records prior effects; throws original object at 9:61; no index 2; capturing builtin verifies exact guest throw record and diagnostic identity |
| Builtin throw | Exact sentinel returned unchanged |
| Constant builtin budget | Dense length 5 with M=3: three calls, steps=4, no AST ticks required |
| Reentrant budget | Outer tick + inner holes 0/1; next tick fails at steps=4; same context, active outer callback depth=2, no replenishment |
| Recursive guest reentry | Parsed recursive callback reenters adapter; shared maxCalls=4 yields runtime RangeError in fixture; calls unwind to zero |
| Host faults/output | Original Error escapes callback and parsed console output; active calls restore to zero and to prior count 1 inside recovery builtin |
| Invalid completions | Builtin return/break/continue throw host invariant errors; active calls released |
| Runs/realms | Fresh results with independent storage, retained lexical closure with current context, other realm context and no installed host namespace |

Result inspection checks own descriptors and holes rather than Get alone.
Every internal guest failure checks runtime phase/name and supplied Location
identity; actual guest throw checks original fixture line/column. Synthetic
Has/Get subclasses serve only to trace and inject boundaries, not to claim
proxy/accessor support. Fresh result allocation is deliberately not exposed;
impossible normal-false result definition is a host invariant per the final
frozen contract (which supersedes the design's earlier TypeError proposal).

## Sources and boundaries

The direct length/validation/presence/read/call/definition loop follows
[ECMA-262 2025 Array.prototype.map](https://tc39.es/ecma262/2025/multipage/indexed-collections.html#sec-array.prototype.map),
reconsulted during implementation. Reused the reviewed engine262 evidence in
[map-integration.md](../../map-integration.md), pinned at
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171`; web refetch was unavailable and is
not claimed as fresh source inspection. No upstream code copied.

Only objects, current ordinary data properties and GuestArray are supported.
No standard installation, primitive boxing, species, symbols, accessors,
object conversion, proxy semantics or full cross-realm intrinsic calling.
Array constructor values other than undefined explicitly reject even when
length is zero. Length above uint32 array capacity rejects before allocation.
One tick per index bounds sparse traversal, not arbitrary work in trusted host
callbacks. No existing runtime/context/conversion APIs changed.

Initial development checks caught a fixture using unsupported numeric computed
keys and an incorrect expected guest-throw location. The fixture now uses string
keys and asserts its actual source throw at 9:61; semantic implementation and
scope were unchanged. The first integrated driver was fully static; no compiler
workaround or reduction was needed. Subsequent additions strengthen exact guest
throw and host-call recovery assertions and are included in the final rebuild.

