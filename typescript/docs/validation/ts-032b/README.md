# TS-032B Number.prototype.toString integration

2026-11-02, assignment base b029661, codex/test262-classification.
Windows x64, pinned Node 26.13.0 / scriptc 0.4.7 / Zig 0.17.0.
Implementation awaits independent review; conformance remains blocked.
Coordinator independently committed dispatch/cursor records 7f69a1a and 7bf24c8
during implementation; this writer did not edit those files.

## Contract and implementation

The only production change is registration in src/builtins/number.ts.
The method extracts the receiver before any radix operation, defaults only a
missing/undefined argument, composes existing numeric-hint ToPrimitive with the
primitive ToIntegerOrInfinity, validates the range, then formats. All abrupt
records return unchanged. Decimal conversion and both exact backend modules
are unchanged. Zero/NaN/infinities/sign are handled before passing positive
finite nondecimal magnitudes to the backend. No new runtime workaround.

Rechecked fixed [ECMA-262 2025 section 21.1.3.6](https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-number.prototype.tostring)
on 2026-11-02: receiver, radix coercion, range, formatting order and length 1.
Engine comparison remains the pinned engine262 source assessment in TS-021P:
reuse slot extraction/registration, not host nondecimal formatting. No upstream
code copied. The accepted backend retains its existing attribution and limits.

## Tests and expectation migrations

[Pre-edit inventory](migration-inventory.md) identifies every changed assertion.
There are no manifest removals or changed manifest outcomes: all 212 records and
37 build entries are preserved. Additions execute inside existing object-valueof
coverage, so the denominator remains 212, rather than pretending each new assert
is a new independent guest case.

* N1-N8: primitive/local/foreign/relinked genuine slots, root +0, signed zero,
  NaN/infinities, fractions/sign; all invalid families and fake slots; no receiver
  reads. Both method metadata, descriptors, order and Realm identity checked.
* R1-R7/R11-R13/R15-R16: literal expected radix/default/truncation/string/error
  matrix, special receiver validation ordering, exact diagnostic phase/name/
  message/value/location, effectful invalid receivers, ignored extra Values.
* R8-R10: canonical numeric hint, absent/null hooks, fresh ordinary fallback,
  exact reads, ticks and calls. R14: original completion identity at every
  canonical/ordinary Get/tick/call boundary, and host Get/call fault identity.
* Cross-Realm A -> C bridge -> C Function.call -> B toString -> D radix hook:
  peak four frames, shared call/step limits, restored calls/depth/Realm on normal,
  guest throw and host fault. Additional context instrumentation explicitly
  observes B after D returns. Primitive radix works after step exhaustion.
* Mutation: deleted/noncallable/object-returning valueOf, fresh replacement,
  custom canonical hook, both-object/null-root negatives, deleted toString tag
  fallback, noncallable toString valueOf fallback, saved methods and isolation.
* Runtime-read fixture tests 24 frozen literal difficult vectors with both signs
  (48 calls), including all seven cross-power choices. Each checks primitive,
  boxed and borrowed calls, caller argument order, computed keys, addition,
  array string conversion and explicit/default decimal conversion. Runtime
  negatives retain exact parser locations and early argument throw payloads.
* Existing numeric/array consumers, Object tags, direct converter negatives,
  namespace invariants, and all historical evidence are retained.

## Validation

Final results: rebuilt Node/native 212/212 each, no skips; all 37 static-only
builds and separate coverage reports pass (CLI 1752/1752, object-valueof
3290/3290, zero dynamic). Runner 20/20, probes 10/10, host/protocol 73/73,
real observation controls 16/16, and typechecking pass. Independent oracle
canonical/interval/minimum-k/Note2 checks pass 14768/14768 in each lane; all
18 decimal controls pass per lane. Preservation audit passes.


Run from typescript, with installed Zig on PATH:

```
npm run test:guest:node
npm run test:guest:native
npm run test:runner
npm run test:probes
npm run typecheck
npm run test:test262
npm run test:observations
node docs/validation/ts-032b/validate.mjs
```

The last script runs the unchanged 14768-row backend oracle through both lanes
and 18 original decimal controls per lane, retains fresh evidence here, checks
preserved manifests/gates/backend/decimal code and exact literal-vector copies,
and saves the full guest/build/probe records. The sole orchestration extension
is an optional RIFT_RADIX_EVIDENCE directory; existing default behavior is
unchanged. No old evidence is regenerated or rewritten.

## Retained unsuccessful attempts and limits

* native-initial.log: installed Zig libraries inaccessible in sandbox; aborted
  that repeated environment failure and rebuilt with approved access.
* host-sandbox-failure.log: Windows temporary ledger rename returned EPERM;
  approved rerun uses the same tests and assertions.
* runtime-typecheck-failure.log: test fixture loader initially passed a broader
  Completion to a ValueCompletion assertion; corrected to assert normal block
  completion, without changing runtime types.
* A direct object-valueof invocation from repository root failed to find its
  relative runtime fixture; rerun from documented typescript cwd passed.
* Python command alias was unavailable before any edit; edits used Node instead.

Finite samples and Windows x64 only; no exhaustive binary64/platform claim,
benchmark promise or conformance admission. Number remains a noncallable
namespace; constructors, other Number formatting methods, guest BigInt,
accessors and broader syntax are outside scope. CL-006 cancellation controls,
COORDINATION, compiler pins and C++ are untouched. No successor or main merge.
