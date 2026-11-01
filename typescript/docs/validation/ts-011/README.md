# TS-011 validation and handoff

Implemented from `99b37af` on `codex/primitive-computed-keys`, 2026-11-01.
Only the new helper is production source; no existing production source changed.
The helper-only frozen contract remains in `../../object-coercion-integration.md`.

## Coverage map

`test/primitive-conversion.ts` is compiled and executed in both lanes. Its fixed
success output is `primitive conversion passed`; any assertion throws a host Error.
The runtime-read fixture contains actual Rift closures, mutation and recursive
bridge calls, never host-evaluated guest source.

- H1: all current primitives and all three hints preserve exact Value identity,
  including signed zero, NaN, infinities, NUL and a lone surrogate; zero operations.
  Ordinary nonobject preconditions escape as host faults.
- H2-H6: fixed tick/Get/Call traces for all hints; object fallback, missing and
  each noncallable kind; each primitive returned first or second is accepted exactly.
- H7-H9: exact final error/location and two lookup groups; replacement, deletion
  and prototype mutation are observed by fresh lookups in both hint orders.
- H10: ordinary/array/function own/inherited methods receive original Value and
  zero arguments; semantic Get receiver/location checked for each object kind;
  call argument arrays are fresh, including after a builtin mutates an earlier list.
- H11-H12: first/second Get, Call and tick sentinel records propagate by identity,
  preserving value/diagnostic/location, exact stopped traces and prior mutations.
- H13: nested builtins use the identical context and active depth. Finite nesting
  returns 13 at three ticks; step failure occurs at four ticks and call-depth failure
  at five. All active calls unwind to zero.
- H14: guest loop hits execution-step limit; recursive guest bridge hits call-depth
  limit. Both use retained evaluators and restore active-call count to zero.
- H15: host Error identity and illegal break/continue faults escape without a
  fallback lookup; existing evaluator finally restores active calls.
- H16: separate realms, closure counters and mutable methods; repeated calls retain
  independent state, and nested bridge asserts exact active context/realm.
- H17: direct converters and parsed operators/computed reference still reject
  objects without a hook read/call. Every old test is retained unchanged.

## Results

Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native suites 158/158
with no skips (all 157 old entries plus the new driver). All 17 native entries
pass static-only compilation and separate 100% static coverage. Full subprocess
records and coverage counts are retained in the JSON artifacts alongside logs.

Initial native/probe attempts failed to access the installed Zig library directory
under the sandbox (`FileNotFound` locating Zig installation). The `*-sandbox*`
artifacts retain those failures; escalation with the explicit installed Zig PATH
resolved them. No gate or pin changed. During test authoring, TypeScript caught an
unnarrowed internalDelete completion; narrowing fixed it. A strengthened budget
assertion initially used the shortened text 'step limit exceeded'; corrected to
the existing 'execution step limit exceeded'. A working-directory typo prevented
one initial command batch from running. These were test/setup issues, not compiler
or semantic discrepancies. Web fetching V8 failed; the GitHub connector successfully
retrieved the exact tag source for cross-checking.

## Limits

This is helper infrastructure only: no production call site invokes the helper,
no standard prototype or symbol hook exists, and there is no new intrinsic.
Synthetic internalGet subclasses test abrupt plumbing, not accessor semantics.
Host fault tests promise active-call cleanup, not full evaluator reusability after
arbitrary nested host faults (existing frame-counter limitation is unchanged).
Realm tests establish independent state and active-context propagation, not a new
cross-realm ownership model. No API migration, pins, C++, Claude output or
COORDINATION changes. Await coordinator review; no successor or merge performed.
