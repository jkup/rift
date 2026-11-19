# TS-018A implementation validation

Implemented stage A of accepted TS-018P design `7b6021a`, from clean base
`cc755f7` on `codex/primitive-computed-keys`. Validated 2026-11-02 on Windows x64
with the unchanged pinned Node/TypeScript/scriptc/Zig toolchain.

## Results

- Typecheck passes.
- Runner regressions: 20/20, no skips.
- Compiler probes: 10/10 in both hosts with static-only and coverage checks.
- Rebuilt Node guest suite: 163/163, no skips.
- Rebuilt native guest suite: 163/163, no skips.
- All 22 existing static-only builds and separate coverage gates pass, with no
  dynamic statements. Exact per-entry counts are in native-build-results.json.

The denominator and all original assertions are retained. New assertions extend
six existing compiled drivers; 163 counts harness entries, not assertions.
Success logs now follow all assertions in the changed drivers. The final review
separates guest completion assertions from host-exception catches, so the catch
cannot mask a failed assertion. After the full final run, an accidental extra
empty statement in an existing descriptor test was removed; typecheck and that
driver's Node/native execution, static-only build and coverage were rerun in the
`descriptors-final-*` transcripts (992/992 static statements).

Final logs and JSON retain subprocess output, statuses, errors and verdicts.
There are no final failures, skips, crashes or timeouts. Sandbox attempts failed
on Zig installation access; `*-sandbox-failure.*` preserve those environment
failures. Successful builds used installed Zig 0.17.0 with library access.

One actual compiler coverage failure occurred in test-only throw callbacks.
The [reduction](compiler-reduction/README.md) retains the original driver and
failure, a seven-statement reproducer, and its successful explicit-return variant.
Three ValueCompletion return annotations remove inferred-never dynamic adapters.
No production workaround or pin/gate change; the accepted conversion-driver
side-effect import is untouched.

## W1-W19 mapping

| Rows | Driver | Expected-result coverage |
| --- | --- | --- |
| W1 | realms | independent B/N/S roots, payloads/graph/keys, original O/F/A keys, Number namespace |
| W2 | realms | fresh truthy Boolean/Number/String boxes, signed zero, NaN, infinities, empty string |
| W3-W4 | realms | exact object/array/callable/wrapper/foreign/null-root identity; Get/Call/tick traps; exact nullish TypeError/location; unchanged counters |
| W5 | object-descriptors | five UTF-16 units including surrogate pair, lone surrogate and NUL; exact descriptor flags, length and keys |
| W6 | object-keys | canonical indices, rejected spellings as ordinary names, numeric versus string -0 |
| W7-W9 | object-descriptors | compatible/incompatible updates, atomic rejection, same-value Set failure, strict error, deletion, immutable length and ordinary out-of-range index |
| W10 | object-keys | virtual/ordinary index ordering, insertion ordering, delete/reinsert |
| W11 | object-descriptors | frozen compatible definitions, rejected new key/prototype, same prototype, unchanged reads/keys |
| W12-W13 | object-prototypes | multi-level virtual Get/Has, inherited readonly Set, child delete/shadow, distinct String/ordinary receivers, writable added properties |
| W14 | object-descriptors, realms | detached descriptor/key/map snapshots, snapshot order, all three scalar payloads survive guest property/prototype changes |
| W15 | realms | A/B/C boxing roots and exact returned identities, saved live context, guest throw/host fault cleanup, shared call/step limits, zero boxing ticks |
| W16 | array-map | explicit String length/map, result Realm, a/b units, callback receiver/index/input identity, no constructor read, original observers preserved |
| W17 | realms and preserved conversion/member drivers | primitive converters reject wrappers without hooks, ordinary conversion still fails without explicit methods, parsed primitive bases still reject, no new methods/globals, G14 unchanged |
| W18 | realms, definition-dispatch | silent bootstrap with throwing output, compatible/invalid virtual bootstrap definitions, host invariant error, no execution work |
| W19 | object-keys | helper accepts 4294967295 with length 4294967296 while arrayIndex rejects; no huge string allocation |

## Interfaces and boundaries

New primitive-objects.ts holds typed readonly scalar payloads and virtual String
operations. object-conversion.ts exports ObjectCompletion/toObject without adding
a production caller. Realm roots/factories and descriptor-aware iterative runtime
Get/Has/Set complete the atomic batch; property-keys.ts adds stringIndex using the
existing numeric scanner/formatter. No evaluator, callable ownership, converter,
array semantics, manifests, pins, C++, Claude or COORDINATION changes.

Specification and engine comparison follow the [accepted design](../../primitive-wrappers.md).
Implementation review rechecked fixed ECMA-262 2025 String exotic algorithms and
engine262 string-objects.mts at `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`
(blob `b59f2a0b2dbe48e5377861b02702fd34f1f9dd05`). No source copied.

This is explicit internal boxing with data descriptors only. No constructors,
guest globals, implicit member/receiver boxing, wrapper methods, Object valueOf/
toString, symbols, accessors/proxies or successor implementation. Keys/snapshots
allocate proportional to length; no large-string memory/performance claim.
Awaiting coordinator review; no merge or successor dispatch.
