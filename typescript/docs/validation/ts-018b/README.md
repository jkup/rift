# TS-018B implementation evidence

2026-11-02, branch `codex/primitive-computed-keys`. Assigned base `4eb47bd`;
checkout at claim `38f3f4b` includes existing coordinator commits, preserved.
Stage A `254c097` is the independently accepted 163-case/22-gate baseline.

## Scope and sources

Only Object.prototype.valueOf is installed, through existing registration and
ToObject. The runtime-read fixture and compiled driver cover V1-V8. No C++,
COORDINATION, Claude queue, pins or accepted imports were changed. Default
conversion remains incomplete; no toString, implicit member/receiver boxing,
wrapper methods, constructors, globals or symbols were added.

Inspected fixed [ECMA-262 2025 20.1.3.7](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-object.prototype.valueof)
and [engine262 ObjectPrototype.mts at d553e7b52501fbc47eae981c8d0fa7a5c26d0171](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ObjectPrototype.mts),
retrieved through the GitHub connector after web/raw fetches failed. The reference
method delegates to ToObject and registers arity zero. Adopted that boundary;
kept Rift's existing completion/context/factory plumbing. No source copied.

## V1-V8 map

All assertions finish before the driver's single success line.

| Requirement | Evidence in test/object-valueof.ts and runtime fixture |
| --- | --- |
| V1 | Exact identities for ordinary/array/guest and builtin callable/wrappers/foreign/null-root/throwing Get observer; unchanged keys/prototypes; ignored extra object |
| V2 | Two boxes per primitive, false/true, signed zeros, NaN, infinities, empty and surrogate/NUL string; payload, defining root, length/index flags and key order |
| V3 | Detached, missing and null receiver exact messages/locations; argument trace abcd; argument sentinel before null error and no later effect; saved/borrowed/shadowed methods |
| V4 | A context, C bridge and actual C.call, B allocation observer at depth three, C restoration then A; unchanged -0 receiver payload |
| V5 | Fresh identity, prototype/owner, name/length and flags; root method replace/delete visibility, independent Realm state/metadata, saved method after deletion |
| V6 | Parsed ordinary/array/function operands: actual inherited method/receiver checked, tick;valueOf;tick trace, object result, final TypeError; zero-call budget yields located call-depth error after one tick |
| V7 | Direct converters still reject with no reads; borrowed null-root remains bare and fails after two ticks with zero call budget; explicit hooks retain vs trace/final TypeError |
| V8 | Entry/forwarding guards, exact surrounding guest sentinel, exact host exception, nullish completion, Realm/call/depth cleanup, monotonic step exhaustion on repeated entry |

## Expectation audit

Searched all tests for valueOf, root keys, missing/noncallable/both-object methods,
and evaluator budgets; inspected the relevant assertion blocks. Existing cases
and their expected results remain, except these exact `realms.ts` migrations:

- G17 and W1 O keys become `valueOf`; F stays `name,length,call`, A stays
  `length`, B/N stay empty, S stays `length`.
- G17 and W17 assert inherited Object valueOf identity; constructor/toString/
  join/map absence remains (wrapper roots still lack constructor/toString).
- G11 independent Realm mutation expects O's sole initial key `valueOf`.
- G14 and W17 still fail conversion; W17 direct converters retain zero-hook
  assertions. No negative result was made positive.

`primitive-conversion.ts` missing/noncallable/both-object observers and
`length-coercion.ts`/`key-coercion.ts` no-method negatives use null-root objects:
their lookup/call traces and budgets remain unchanged. So do `array-like.ts`
and `array-map.ts` null-root length failures. Explicit-hook numeric/addition/
relational/property-key and all shared-context/Function.call limit tests remain.

Parsed no-own-hook objects in `operator-coercion.ts`, realm G14, wrapper W17 and
`array-length-coercion.ts` missing mode now genuinely call inherited valueOf.
The latter still has zero *own hook* hits and empty own-hook trace, then TypeError
with target length unchanged; both-object mode still has `oo`. No existing exact
budget expectation needed changing. The new V6 trace and zero-call-budget case
make the added call explicit rather than suppressing it or raising limits.

## Compiler and environment evidence

The initial native run could not locate installed Zig libraries inside the
sandbox. Retained `initial-native-build.txt` and `initial-native-build-results.json`
show that environment failure. The new driver also reported one dynamic adapter,
localized by `dynamic-explanation.txt` to a throw-only builtin test callback.
`callback-inferred.ts` reproduces the adapter with six static statements plus one
dynamic adapter; `callback-annotated.ts` adds only an explicit Completion return
type and reports zero dynamic functions. The corresponding coverage transcripts
are retained. The driver uses that same local annotation, as in accepted Stage A;
no production workaround or compiler pin change was needed.

## Final validation

| Command | Result | Retained transcript |
| --- | --- | --- |
| npm run typecheck | PASS | typecheck.txt |
| npm run test:runner | 20/20 | runner.txt |
| npm run test:probes | 10/10, both hosts and static gates | probes.txt, probe-results.json |
| npm run test:guest:node | 164/164, no skips | node.txt, guest-node-results.json |
| npm run build:native | 23/23 static-only builds and separate coverage gates | build-native.txt, native-build-results.json |
| node tools/run-guests.mjs native | 164/164, no skips, using those rebuilt binaries | native.txt, guest-native-results.json |

Final native runs used approved access to installed Zig 0.17.0 libraries with
its installation directory added to PATH. CLI coverage is 1223/1223; realms
1548/1548; the new object-valueof driver 1365/1365, with no dynamic tier. Every
prior gate remains. Initial Node development exposed a helper type mismatch and
off-by-one expected fixture line numbers; both were corrected before final runs.
There are no final skips, unsupported test omissions, timeouts, crashes or
harness failures. This is Windows x64 evidence, not other-platform support.

Implementation and validation complete; coordinator review/acceptance pending.
No successor dispatched. Source/evidence hashes are in `sha256.txt`.
