# TS-009 primitive binary addition validation

Implementation base: fb93c15, existing codex/primitive-computed-keys branch.
Completed 2026-11-01; awaiting independent coordinator review.

## Results

- `npm run typecheck`: passes.
- `npm run test:runner`: 20/20, no skips.
- `npm run test:probes`: 10/10, static-only build and coverage gates pass.
- `npm run test:guest:node`: rebuilt, 156/156, no skips.
- `npm run test:guest:native`: rebuilt, 156/156, no skips.
- All 15 native entry points pass static-only compilation and separate coverage.

Full commands/output and subprocess records are retained alongside this file.
Native validation used the installed Zig 0.17.0 directory on PATH and approved
library access. There were no compiler/backend failures or new workarounds.
Initial guest runs failed two newly written host assertions because the test
helper returns block completion (undefined on success). Corrected tests inspect
saved guest bindings; initial transcripts are retained and final lanes pass.
No expectations were weakened. No skips, timeouts, crashes or harness failures
occurred in the final runs.

## Expected-result coverage

`test/addition.ts` parses actual guest programs and asserts fixed results, never
merely Node/native parity. `test/fixtures/addition.js` is read at runtime by that
compiled driver and exercises closures and one-time operand effects.

| Contract row | Assertions |
|---|---|
| Every primitive on both sides | undefined/null/false/true/number/signed zero/NaN/infinities with string and numeric partners; strings with both partners |
| String selection | empty, whitespace, numeric, radix-looking and invalid text concatenate verbatim; numeric operands add |
| Binary64 | Object.is distinguishes all four zero pairs; infinity cancellation, overflow both signs, subnormal sum/cancellation, null/boolean/undefined results |
| Formatting | shortest-roundtrip decimal, 0.1+0.2, safe integer, 1e-6/1e-7 and 1e20/1e21 thresholds, minimum/maximum finite values on either side |
| UTF-16 | seeded NUL, surrogate pair across concatenation boundary and retained lone surrogate through real parsed expressions |
| Grammar/precedence | left association, multiplication precedence, conditional selection; parser unchanged |
| Order and abrupt identity | left/right calls once in order, exact left throw skips RHS, exact RHS throw precedes unsupported left object, unresolvable binding order, exact left/right property GetValue throw records |
| Object exclusions | ordinary/array/function on both sides of numeric/string partners, located runtime TypeError, hook counters remain zero; observed internalGet trap proves no hook reads |
| Existing behavior | all 155 prior suite entries retained, all TS-008 numeric assertions retained, relational rejection cases unchanged; existing realm/budget suites run in both lanes |

## Migration inventory

Before editing, searched test/, tools/ and current docs for plus/addition/coercion
expectations. Exactly three active rejection expectations were superseded:

1. `tools/run-guests.mjs` generated `coercion`: same guest source `1 + '2'`, now
   exit 0 and exact stdout `12\n`; same case remains in the denominator.
2. `test/numeric-operators.ts` `1 + '2'`: positive completion and saved string `12`.
3. `test/numeric-operators.ts` `null + 1`: positive completion and numeric result 1.

The remaining two relational boundaries in that loop still reject as before.
Existing numeric/string addition fixtures and assertions were preserved. One
new compiled driver increases the suite denominator from 155 to 156; its runtime
fixture is assertion-bearing via the driver, not an extra unasserted execution.

## Sources and scope

See architecture-decisions.md, TS-009, for the source links and design rationale.
Reviewed ECMA-262 ApplyStringOrNumericBinaryOperator and
EvaluateStringOrNumericBinaryExpression on 2026-11-01 and engine262 application
at d553e7b52501fbc47eae981c8d0fa7a5c26d0171 before implementation. Web fetching
failed for the engine source; direct approved HTTPS retrieval succeeded. These
establish default-hint ToPrimitive before the string branch and left-to-right
conversion after both operand evaluations. No implementation code was copied.

Only current primitive Values are supported. Ordinary objects, arrays and
functions explicitly reject without hooks. No full ToPrimitive, BigInt, symbols,
boxing, relational expansion, grammar, Array intrinsics, conversion backend or
runtime API change. No C++, pins, Claude or COORDINATION.md edits. No branch
switch, merge or successor dispatch.
