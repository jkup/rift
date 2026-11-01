# TS-013 validation and handoff

Ordinary computed property key coercion, 2026-11-01; base `75679a3` on
`codex/primitive-computed-keys`. Implements the frozen TS-013 signatures and
F5-F7 from `../../object-coercion-integration.md`.

## Implementation and migration

`toPropertyKey(value, context, loc)` requests string-hint partial ToPrimitive,
propagates the exact throw, then invokes existing primitive-only ToString.
`getValue(ref, context, loc)` and `putValue(ref, value, context, loc)` validate
bases before conversion. All evaluator reference consumers, including identifier
reads/calls, supply `this.context`; reference capture and assignment ordering
are unchanged. The actual runtime/conversion/primitive-conversion import cycle
is exercised in static builds.

Direct caller audit: definition-dispatch, object-descriptors, object-prototypes,
property-key-conversion and primitive-conversion. No additional array-storage
reference calls existed at this base. Host tests retain explicit evaluator
contexts; none are manufactured in semantic helpers.

The property-key-conversion ordinary/array/function rejection scenarios now
assert successful direct keys and read/write/call operations, original key
receiver and one conversion each. Direct ToString remains negative, with no
hooks. RHS-wins cases, invalid primitive base traps, fixed numeric formatting,
readonly/nonextensible and primitive reference assertions remain. H17 now
positively checks direct and parsed keys separately from the two unchanged
primitive-only direct converter assertions. Existing 159 suite entries remain;
key-coercion adds the 160th.

## New driver coverage

- Runtime-read guest fixture and parsed read/write/method paths; exact BKCG,
  BKRCS, BKCGAAM; exact B/K/R/C/Get/Set/argument/method throw records.
- Original key/base receivers, zero coercion arguments, method arguments, RHS
  identity, saved binding replacement, mutation during delayed conversion and
  fresh fallback lookup after first-method mutation.
- Own/inherited methods on ordinary/array/function keys; noncallable skip,
  object fallback, every primitive kind and fixed numeric/UTF-16 spelling;
  no-method/both-object located failures.
- Direct API reads/writes, first/second Get/call/tick sentinel propagation,
  invalid bases preceding hooks, strict false-Set errors and preserved state.
- Array index/length/nonindex distinction; object-valued length remains rejected
  without reading its methods. Nested parsed keys, guest runaway loops/recursion,
  host-fault/illegal-completion call cleanup, retained monotonic budgets and
  independent realm state.

Synthetic host Get/Set observations do not claim accessors or proxies. Native
validation covers the Windows x64 pinned toolchain only. Direct ToString,
ToNumber/Uint32/Length, array length/storage APIs and array-like/map boundaries
remain primitive-only. No symbols, boxing, standard prototypes, new syntax,
compound/update reference caching or toolchain changes.

## Validation

See adjacent command logs and structured subprocess results. Typecheck, runner
20/20, probes 10/10 and Node 160/160 pass with no skips. Rebuilt native 160/160 passes with no skips; all 19 static-only builds and
separate static coverage gates pass, including the real module-cycle integration.

Initial sandboxed native/probe linking could not locate the installed Zig
library directory; reruns use approved library access, unchanged pins/gates.
`guest-native-initial.log`, `native-build-initial.json` and `probes-initial.log`
retain those failures. The first new Node-driver run failed a host assertion
because test inspection used GuestObject.get, whose convenience receiver is a
new Value wrapper. Descriptor inspection fixed the test; runtime semantics did
not change. An initial shell invocation used unavailable Python (no edits ran),
and one npm invocation used the repository root rather than typescript. Neither
is counted as semantic validation.
