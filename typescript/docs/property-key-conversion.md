# TS-007P: primitive computed property keys

Proposal for coordinator review, 2026-11-01. Inspected Rift
`b4eb7945d146c3d051d22e99e4ddbe0c888cdc27`. No runtime implementation
is delivered here. TS-006 acceptance is reconciled in TASKS.md at the
coordinator's request.

## Recommendation and evidence boundary

Add a partial ToString/ToPropertyKey pair over the current Value union, using
one typed binary64-to-string backend. Preserve unsupported object coercion,
primitive bases and symbols. Do not equate property names with array indices.

The isolated `probes/property-key-conversion/numbers.ts` has **36 fixed
expected strings**, all passing in Node 26.13.0 and scriptc 0.4.7 native on
Windows x64 with Zig 0.17.0. Static-only build passes and coverage is **11/11
static**. No formatting discrepancy was found, so there is no formatter patch,
pin change or discrepancy reduction to propose. This sample is feasibility
evidence, not exhaustive binary64 correctness or a new conformance result.
Full commands and results are in [the evidence directory](validation/ts-007p/README.md).

There is an evaluation-order defect to avoid carrying forward: merely replacing
the string-only check in Evaluator.reference would reject an object key before
the RHS. Current ECMAScript delays conversion on simple assignment. The proposed
bounded follow-on therefore includes raw property references and moves the
existing base restriction to GetValue/PutValue. This changes rejection timing,
not the set of supported bases. It needs explicit coordinator acceptance.

## Sources and decisions

Consulted 2026-11-01:

- [ECMAScript living draft: ToString, ToPropertyKey and ToPrimitive](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-topropertykey).
  ToPropertyKey requests the string hint, preserves a symbol, otherwise converts
  the primitive to string. Object conversion may call guest methods. Rift will
  explicitly reject that path, without reading toString/valueOf.
- [Property access and calls](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-evaluate-property-access-with-expression-key):
  the current draft retains the raw evaluated key in a Reference; simple
  assignment converts it after the RHS. Calls obtain the function before
  argument evaluation and preserve the reference receiver. This is the living
  draft consulted, not a claim that a particular older edition had identical
  wording. Attempts to fetch the 2025 single-page text exceeded tool limits;
  no uninspected versioned-spec claim is made.
- [Number::toString](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-tostring):
  base-ten formatting uses a shortest digit sequence that rounds back to the
  same binary64 value, fixed notation for nonzero magnitudes from 1e-6 through
  below 1e21, and lowercase e notation otherwise. Positive exponents include +,
  with no redundant leading exponent zeros. The closest/even tie choice is a
  recommended refinement in Note 2; do not claim that the normative minimum-digit
  rule uniquely selects every last digit.
- engine262 revision **d553e7b52501fbc47eae981c8d0fa7a5c26d0171**:
  [type-conversion.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/type-conversion.mts),
  [EvaluatePropertyAccess.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/EvaluatePropertyAccess.mts),
  [reference-operations.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/reference-operations.mts).
  Inspected via the GitHub connector. It retains raw keys, does ToObject before
  key conversion in GetValue/PutValue, and has a distinct ToPropertyKey operation.
  Adopt the semantic separation. Do not copy its generator completion machinery,
  ambient agent or object/symbol support. No upstream code copied.

The Node-only `order.mjs` independently checks five reference scenarios,
including object-key coercion timing; these are host JavaScript observations,
**not evidence that Rift or scriptc supports guest object coercion**.

## Exact proposed conversion interface

In `src/conversion.ts`, alongside NumberCompletion:

```ts
export type StringCompletion =
    { type: "normal"; value: GuestString } | ThrowCompletion;
export type PropertyKeyCompletion =
    { type: "normal"; value: PropertyKey } | ThrowCompletion;
export function numberToString(value: number): GuestString;
export function toString(value: Value, loc: Location): StringCompletion;
export function toPropertyKey(value: Value, loc: Location): PropertyKeyCompletion;
```

Use existing runtime ThrowCompletion/failure and strings.GuestString, not
ValueCompletion (whose normal payload is a guest Value wrapper). Keep
`runtime.PropertyKey = GuestString`. Separate completion aliases express
different contracts even though their current payloads coincide.

`numberToString` contains exactly the host `String(value)` conversion over
the typed number payload. It is the single new numeric-format backend used by
the proposed conversions. Do not use display(), toFixed(), locale formatting,
JSON stringify, a uint32 conversion, truncation or an integer-index fast path.
Existing bounded integer-index formatting elsewhere need not be migrated.

| Value kind | normal string/key payload |
|---|---|
| undefined | "undefined" |
| null | "null" |
| boolean | "true" or "false" |
| string | same UTF-16 sequence, including empty, NUL and lone surrogates |
| number | numberToString(value.value); both zero signs become "0"; NaN, Infinity, -Infinity have those exact spellings |
| object, including callable and array | throw TypeError, message "object-to-primitive conversion unsupported", provided loc; no host String(object), no guest property reads or calls |

Implement toString as an exhaustive switch; toPropertyKey delegates to it for
the current union and returns its completion unchanged. Document both as partial.
When symbols eventually exist, ToPropertyKey must preserve identity while
ToString rejects them; the functions must then diverge. BigInt is also absent
from Value and outside this batch. A future full object conversion must perform
ToPrimitive with the string hint, including @@toPrimitive and ordinary
toString-before-valueOf fallback, through active call/context machinery.
No dummy symbol case or host wrapper conversion now.

## Reference representation and exact caller migration

Proposed property branch in `runtime.Reference`:

```ts
{ kind: "property"; base: Value; key: Value; loc: Location }
```

Binding references stay unchanged. Here key is the evaluated guest value,
**not** a PropertyKey yet. loc records the member expression position for
unsupported-base/conversion diagnostics; the existing getValue/putValue loc
argument still supplies locations to the actual Get/Set operations.

1. `Evaluator.reference` evaluates base then key, propagating the original
   abrupt completion. Return the raw base/key Values and expr.loc, with no
   base check or conversion. Dot access already produces a string literal key
   through the parser; no parser change is needed.
2. `runtime.getValue` property branch checks base.kind === "object"; otherwise
   returns the existing "property base must be an object" TypeError at ref.loc.
   Call toPropertyKey(ref.key, ref.loc), return an exact throw unchanged, then
   base.object.internalGet(converted.value, ref.base, loc). Binding path stays.
3. `runtime.putValue` does the same base check and conversion, then existing
   base.object.set(converted.value, value, loc). This preserves strict false-Set
   errors and the assignment-result value. No definition or array special case.
4. `Evaluator.expression` assignment already evaluates the RHS between
   reference() and putValue(); retain that structure. Member read already calls
   getValue(). In the call branch use `thisValue = ref.reference.base`, not
   a second object wrapper. Get happens before args and callability validation
   remains after args. Preserve the original saved reference when arguments or
   RHS reassign the variable that supplied the base/key.
5. Update the **five** directly constructed host references at base revision:
   `test/object-descriptors.ts:76,77`,
   `test/object-prototypes.ts:64,66`,
   `test/definition-dispatch.ts:68`.
   Wrap bases/keys in object/string Values and include loc; keep their assertions.
   Re-run the inventory before implementation:
   `rg -n 'kind: "property"|ref\.base|reference\.base' src test`.

No new context parameter is needed: primitive conversion cannot call guest code.
The runtime-to-conversion import forms a module cycle with conversion's existing
failure import; both are function-only uses after module initialization. Require
the full native integration gate to establish feasibility; if scriptc rejects
this cycle, reduce it and return for review rather than reorganize the runtime.
Do not add a cache or a second reference kind merely for future compound updates:
the currently supported simple read/write/call paths each consume a reference
once. Future compound/update support must explicitly specify key caching.

## Evaluation order audit

Let B/K/R/A stand for evaluation (including GetValue) of base/key/RHS/arguments,
C for ToPropertyKey, G/S for property Get/Set, and M for method invocation.
In spec GetValue/PutValue, ToObject provides the null/undefined rejection before C;
Rift substitutes its stricter object-only base check at that same point.
Non-null primitive rejection is an explicit unsupported boundary, not spec boxing.

| Path | Existing Rift | Proposed bounded behavior |
|---|---|---|
| read | B, K, base restriction, string-only restriction, G | B, K, base restriction, C, G |
| simple write | B, K, restrictions, R, S | B, K, R, base restriction, C, S |
| method call | B, K, restrictions, G, A left-to-right, callable check, M | B, K, base restriction, C, G, A left-to-right, callable check, M |

Existing single-evaluation and method receiver handling are correct for the
supported object/string subset. Early checks in reference() are the mismatch:
`null[key()] = rhs()` currently skips rhs(), whereas the proposed path runs it
before the base error. A throwing RHS wins over both the invalid base and
unsupported object key. A throwing key expression still wins over either.
For reads/calls the base restriction precedes key conversion, and a failed Get
skips all arguments. No additional observable key-object property access occurs.

Original completion identity must survive reference wrapping/unwrapping, RHS
evaluation, conversion return, Get, Set and call. Test record identity, value
identity and diagnostic/location in host assertions; matching error text alone
does not prove this. Host faults remain host faults.

## Follow-on acceptance matrix

All rows below are **requirements, not implemented results**. Host tests should
parse runtime-read guest fixtures and inspect actual objects/completions. Use
synthetic Get/Set overrides only to observe operations, not to claim exotic or
accessor support. Number exponents are currently rejected by the guest lexer:
seed extreme numbers from host tests or use existing Number constants; do not
expand literal grammar for this task.

| Row | Deterministic expected result |
|---|---|
| Primitive conversion | all current primitive kinds above; string code units unchanged; all 36 fixed numeric probe expectations retained in compiled host tests |
| Ordinary access | o[1] = 2; reads via o[1] and o['1'] both 2; assignments return original RHS Value |
| Key distinctions | -0 and +0 alias "0"; string "-0" and "01" remain distinct; numeric 1.5, -1, NaN, infinities use their spelling without truncation |
| Array access | [1][0] gives 1; writing a[2] grows length to 3, slot 1 remains absent; holes versus explicit undefined inspected as own descriptors |
| Array boundary | numeric 4294967294 is an index (length 4294967295); 4294967295, negative, fraction and exponent names are ordinary properties and do not grow length; sparse inspection only |
| Other primitive keys | write/read null, undefined, true and false names; ordinary and array bases; inherited numeric-name read and inherited non-writable Set rejection still work |
| One-time write reference | base() increments once, key() once; RHS changes the variables they read; original object/original key gets the RHS, replacement object unchanged; trace BKR then S |
| One-time method reference | numeric-key function, inherited function too; trace BKGAAM with two arguments; exact this is original base even if first argument replaces its binding |
| Detached method | saving the same function then calling it preserves existing undefined receiver restriction |
| Early base expression throw | exact marker completion; no K, R, G, S or arguments |
| Early key expression throw | trace BK; exact marker; no R/G/S/args even when base value was null |
| RHS throw | trace BKR; exact marker; no S; dominates object-key and primitive-base rejection |
| Null/undefined read or call | key expression runs; base TypeError at member loc; no C/G/args |
| Primitive-base write | key and RHS run before TypeError; cover null, undefined, boolean, number, string; no boxing or Set |
| Object key | ordinary/array/function keys explicitly reject, with no toString/valueOf reads/calls; reads skip G, writes evaluate RHS first but skip S; member loc is preserved |
| Get throw | exact preconstructed ThrowCompletion and location; no arguments; no method call |
| Set throw/false | exact thrown record from synthetic Set propagates; ordinary readonly/nonextensible false becomes existing strict TypeError after RHS |
| Not callable | successful G, all args run, then callable TypeError; throwing argument wins, later args skipped |
| Realm/budgets | independent realm objects; existing monotonic ticks/call limits, abrupt budget records and recovery preserved; no new evaluator or counter reset |

For original reference capture, use separate named old/new objects and key
variables; do not rely on log parity alone. New tests must include explicit
expected state/output and located errors under both hosts.

## Existing numeric-key rejections to replace positively

Search of `src/`, `test/` and `tools/` at the base found exactly two active
expected numeric-key rejections, both generated in `tools/run-guests.mjs`:

| Location / generated file | Current source | Replacement obligation |
|---|---|---|
| line 32 / build/guest-fixtures/numeric-key.js | let o={}; o[1]=2; | keep coverage as successful assignment plus console.log(o[1], o['1']) => "2 2\n", exit 0 |
| line 69 / build/guest-fixtures/array-literal-numeric-key.js | let a = [1]; a[0]; | successful console.log(a[0]) => "1\n", exit 0 |

Move the first from the rejection table to a positive fixture/case or positive
lineCase so the test still counts; retain the second under its existing name
with positive expected stdout. Do not merely delete either. Add object-key
negative cases separately. Leave historical validation JSON untouched.
Primitive-base and detached-method rejections at lines 33–34 remain.
Update feature/API notes that currently advertise string-only keys; preserve
operator coercion, computed object literal names, primitive boxing, symbols,
BigInt, full ToPrimitive and standard Array API exclusions.

## One bounded implementation contract for review

Proposed next assignment: **primitive computed keys with deferred reference
validation**, only after coordinator freezes this contract.

Own `src/conversion.ts`, the Reference/getValue/putValue portions of
`src/runtime.ts`, member-reference/receiver portions of `src/evaluator.ts`;
the five reference test call sites above; new `test/property-key-conversion.ts`
and `test/fixtures/property-key-conversion/`; necessary driver registration in
`tools/build-native.mjs` / `tools/run-guests.mjs` and case manifest; scoped
feature/API docs and new validation directory. No unrelated changes.

Implement the exact APIs/migration above and every matrix row. Keep the two
numeric-key cases as positive regressions, all prior assertions and denominator.
Run typecheck, runner tests, existing probes, this isolated probe, rebuilt
Node/native guest suites and every static coverage gate including the new driver.
Record skips/timeouts/crashes/harness errors separately. Formatting differences
must be reduced; no pin changes, weakened gates or large number formatter.
Keep tests readable and give deterministic source positions after fixture edits.

This is one coherent migration, not permission for successors. Stop awaiting
review with evidence. Remaining issues are exhaustive numeric-format assurance,
unmeasured module-cycle integration, full object/string-hint coercion, symbols,
primitive boxing and eventual reference caching for new operators. They are
explicit future boundaries, not hidden support or blockers to this proposal.
