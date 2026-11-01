# TS-014 validation and handoff

2026-11-01; base 205e7d7, existing codex/primitive-computed-keys branch.

## Result

LengthOfArrayLike now requires OperationContext, performs one semantic length
Get, number-hint ToPrimitive on the saved Value, and primitive ToLength. Map
forwards its existing context. Exact throws propagate without added ticks.
Callback validation, array constructor checks and allocation follow conversion;
the numeric iteration bound is saved while elements stay live.

## Acceptance

- typecheck: pass (typecheck.txt).
- runner: 20/20, zero skips/failures (runner.txt).
- probes: 10/10 including native/static coverage (probes.txt, probe-results.json).
- rebuilt Node: 161/161; rebuilt native: 161/161; no skips, crashes or timeouts.
  All 160 prior entries remain, plus length-coercion. Full execution results in
  guest-node-results.json and guest-native-results.json, console logs node.txt
  and native.txt.
- All 20 native entries pass static-only builds and independent coverage gates
  (native-build-results.json). New driver reaches the production helper and map.

## Matrix and migration inventory

- test/array-like.ts: all direct calls now use a retained Evaluator context.
  Ordinary no-method rejection remains a located final ordinary-conversion
  error. An added explicit valueOf makes ordinary and observed Get lengths
  positive (4.9 -> 4, one hook each). Observed Get counts remain 1/2/3 across
  normal/abrupt/object operations; exact Get throw identity remains asserted.
  Primitive conversion assertions and the primitive normalization table remain.
- test/array-map.ts: conversionError is now specifically the no-method failure
  before invalid callback; an explicit hook adds successful conversion followed
  by callback failure. All prior map entries/assertions remain.
- test/length-coercion.ts and runtime-read fixtures/length-coercion.js cover
  own/inherited methods on ordinary/array/function length Values; number hint,
  noncallable skip, object fallback, every primitive kind, fractions, negative
  values, NaN, infinities and clamping. Synthetic observations assert one length
  Get, original hook receiver, zero arguments, first/second Get/call/tick exact
  records, final located failure, surviving mutations and fresh second lookup.
- F12/F14: parsed mutation hook replaces source.length and its binding, changes
  constructor/elements, deletes an index and returns 3.9. Result length is 3,
  index 0 is 10, index 1 is a hole, inherited index 2 is 20; index 3 is excluded.
  Ordinary constructor is never read. Narrow actual-array observer proves
  length/hook/callback/constructor ordering while actual storage stays numeric.
- F13: length failure beats invalid callback; successful infinite conversion
  reaches callback validation before result-length failure. Exact guest throw
  record/payload propagation is captured through the host-only bridge.
- Nested parsed length methods/map callbacks share context, ticks and depth;
  loop/recursive coercion reaches RangeError and unwinds. Huge sparse maps use
  a small exact budget, without huge scans. Host faults/invalid completions
  unwind active calls. Two realms retain independent counters.
- Direct toNumber/toString/toIntegerOrInfinity/toLength and array length Set/
  Define retain negative zero-hook-call and zero-hook-read assertions. Existing
  operator/key, readonly array and constructor restrictions run unchanged.

## Initial failures and resolution

node-initial.txt retains a test-observer error: bookkeeping used semantic get,
which incorrectly triggered the observer's original-receiver assertion. Reading
its own descriptor fixes the test without changing production code.

Initial native/probe sandbox runs could not locate Zig's installation libraries;
logs and result JSON are retained. Approved escalated runs with the installed
Zig PATH resolved linking. No pin or acceptance gate changed.

The initial new driver also exposed SC1090 comparing NumberCompletion with
ValueCompletion before narrowing. union-comparison.ts and its coverage transcript
are the reduced two-statement reproducer (intentionally unsupported, not a test
suite entry). Narrowing both records to throw before checking identity makes the
real driver fully static. No engine workaround or API redesign was required.

## Boundaries

This implements the approved object-coercion-integration F12-F14 ordering and
source rationale. It is not full ECMAScript coercion/conformance. No boxing,
symbol hooks, standard prototype methods, standard map registration, species,
accessors or proxies were added. Synthetic host Get overrides are observations,
not guest accessor support. Array storage length remains numeric; primitive
converter and runtime/array definition APIs are unchanged. No C++, pins, Claude,
COORDINATION, branch switch, main merge or successor work. Await coordinator
review; task not marked accepted/done by this implementation chat.
