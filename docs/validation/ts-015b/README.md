# TS-015B validation and handoff

2026-11-01. Assigned base `737d5a6`, existing branch
`codex/primitive-computed-keys`. Coordinator dispatch commit `c8a85dc` is preserved.
Only batch 2 is implemented; coordinator owns acceptance and COORDINATION.md.

## Implementation

Semantic array length definition snapshots the descriptor and original Value,
performs number-hint ToPrimitive/ToUint32 and a separate number-hint
ToPrimitive/ToNumber, compares, and only then enters the accepted storage phase.
Exact abrupt records and prior hook effects survive. The second lookup observes
method changes; neither the primitive result nor method is reused. Bootstrap,
direct converters, ordinary property storage and the shared sparse deletion/
rollback/freeze algorithm are unchanged.

The living ArraySetLength algorithm was checked again on 2026-11-01:
https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arraysetlength
The pinned engine262 cross-check and rationale remain in array-length-context.md.
No engine code was copied. No guest eval/Function/vm, API redesign, new standard
intrinsic, toolchain pin or dynamic-tier accommodation was added.

## Acceptance mapping

The new compiled `test/array-length-coercion.ts` reads and parses
`test/fixtures/array-length-coercion.js` at runtime. Its expected outcomes are
fixed; Node/native agreement alone is not acceptance.

- L1-L3: assignment and direct Define 2/2 versus 2/3; original object RHS;
  deletion and method replacement/inheritance with exact vv/vr traces.
- L4: exact sentinel record for first/second conversion Get, Call and helper
  tick failures, original receiver/location, zero args, no later stage, retained
  prior mutations and cleanup. Additional fallback cases cover toString Get,
  Call and tick failures in both conversions after noncallable valueOf.
- L5-L8: ordinary/array/function RHS, own/inherited methods, noncallable and
  object fallback, absent/both-object failures. Fixed primitive table includes
  null/booleans/strings/undefined, NaN/infinities, fraction/range boundaries,
  maximum sparse length, both zero signs, 2.9/2, 2/2.9 and Infinity/0.
- L9-L13: hook growth, shrink, freeze, same-value readonly success, lower/thaw
  rejection and strict Set translation. Initially readonly base and receiver
  skip hooks; direct Define runs hooks before same/different/invalid/throw
  outcomes. First/second throws and mismatch retain index mutations and length.
  A length-read observer requires HHL after successful conversion and HH on
  mismatch, proving no old-length observation before both calls/comparison.
- L14-L15: descending sparse partial deletion, fixed index 3, deletion of 5,
  restoration to 4 with and without delayed freeze, strict Set rejection,
  successful shrink/freeze and incompatible flags before deletion. Optional
  descriptor flags run through all absent/false/true combinations. Input fields
  remain unchanged on success/false/throw/partial deletion. A defensive callback
  replaces the input record, proving the saved Value and flags remain selected.
- L16: ordinary-base/array-receiver converts twice; array-base/ordinary-receiver
  stores the identical object without conversion. Existing P1 tests retain
  exact virtual-dispatch context/receiver/location checks.
- L17-L18: parsed nested and same-array reentrant assignments, nested computed
  keys/numeric operators/internal map, exact hook counts and shared context.
  Infinite loop and recursive assignment require the distinct exact execution
  step versus call depth messages and zero active calls/frames afterward.
- L19-L21: independent realms/counters/arrays, earlier RHS/key guest throws,
  noncoercing ordinary/index writes, exact captured guest throw record, escaping
  host fault and illegal completion with call cleanup.
- P1-P6: retained descriptor/dispatch/bootstrap/array/map/literal/realm drivers
  remain in both suites. No baseline entry or assertion purpose was removed.

## Superseded assertions

`array-storage.ts` now uses a counting return-2 hook, checks two calls and
successful delayed freeze/removal, and isolates the frozen Set zero-hook count.
The existing object-assignment mode succeeds, keeps RHS identity and emits rhs
then after. Invalid/readonly/partial modes remain negative. Their assignment now
starts at column 18 because the original RHS is captured with `let assigned =`;
the exact location assertion was deliberately updated from column 3.

`length-coercion.ts` isolates direct converter zero-hook/read counters first.
Its default constant 2.9 produces RangeError after two calls. With returned=2,
Set and Define both succeed, giving four calls and numeric storage, with original
RHS returned by Set. ForbiddenHooks returns the exact sentinel once per semantic
operation (two reads total); direct converters still read zero times.

## Validation and failures

- Typecheck passes (`typecheck.txt`).
- Runner regressions pass 20/20, no skips (`runner.txt`).
- Compiler probes pass 10/10 with both hosts and coverage (`probes.txt`,
  `probe-results.json`).
- Rebuilt Node guest suite passes 162/162, no skips (`node.txt`,
  `guest-node-results.json`).
- Native final results and exact per-driver coverage are recorded below.

Initial sandbox native/probe links could not locate the pinned Zig installation.
The retained `*-initial*` logs/JSONs record these failures; retrying with approved
Zig installation access resolves them. No pin or gate was relaxed.

Initial native coverage also found SC1090 at two test assertions comparing
union-valued completions before narrowing. `union-comparison-repro.ts` reduces
the mixed boolean/Value comparison to a small coverage failure; its additional
record-comparison functions do not independently reproduce the second location.
An intermediate over-narrowed reduction produced TypeScript no-overlap errors;
the retained valid reduction replaces that draft. Explicit discriminant/type
checks before the comparisons fix both driver sites. The production algorithm
needed no compiler workaround. `focused-coverage.txt` retains the final driver's
fully static report. An initial edit command could not start the Windows Python
alias and wrote nothing; edits then used Node/apply_patch.

Native evidence applies to Windows x64 and the pinned installed Zig only. No
final skip, timeout, crash, unsupported-case waiver or harness failure is claimed
as success. Text transcripts have only trailing line whitespace normalized.

## Scope

No standard Array intrinsics/species, symbols, boxing, accessors/proxies, new
syntax, converter API redesign, C++/Claude/COORDINATION edits, branch switch,
main merge or successor work. Bootstrap still rejects object length before
hooks as a host invariant. Host observation subclasses test engine contracts,
not guest accessor/proxy support or a hostile-host security boundary.

## Final native results

Rebuilt native guests: **162/162**, no skips. All **21/21** static-only builds
and separate coverage gates pass (`native.txt`, `guest-native-results.json`,
`native-build-results.json`). Every analyzed statement is static.

| Entry | Static / analyzed |
| --- | --- |
| src/cli.ts | 1143/1143 |
| test/realms.ts | 1211/1211 |
| test/object-descriptors.ts | 863/863 |
| test/object-prototypes.ts | 1217/1217 |
| test/object-keys.ts | 857/857 |
| test/conversion.ts | 405/405 |
| test/definition-dispatch.ts | 1267/1267 |
| test/array-storage.ts | 1418/1418 |
| test/array-like.ts | 902/902 |
| test/operation-context.ts | 1251/1251 |
| test/array-map.ts | 1474/1474 |
| test/array-literals.ts | 1188/1188 |
| test/property-key-conversion.ts | 1359/1359 |
| test/numeric-operators.ts | 1202/1202 |
| test/addition.ts | 1216/1216 |
| test/relational.ts | 1247/1247 |
| test/primitive-conversion.ts | 1338/1338 |
| test/operator-coercion.ts | 1262/1262 |
| test/key-coercion.ts | 1292/1292 |
| test/length-coercion.ts | 1421/1421 |
| test/array-length-coercion.ts | 1616/1616 |
