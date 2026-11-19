# TS-021P isolated design evidence

2026-11-02, branch codex/primitive-computed-keys, assigned base051c88b,
dispatch61a45c7. [Design and migration contract](../../number-prototype-conversions.md).
No production, integrated tests, manifests, pins, C++ or coordinator files edited.
No new Rift support or conformance rate is claimed. The accepted baseline remains
a3d74fd (independently164/164 on both hosts,23 gates); it was not rebuilt here.

## Reproduce

From repository root, with pinned Zig0.17.0 directory on command-local PATH:

```powershell
$env:PATH='C:\Users\jonku\AppData\Local\Microsoft\WinGet\Packages\zig.zig_Microsoft.Winget.Source_8wekyb3d8bbwe\zig-x86_64-windows-0.17.0;'+$env:PATH
node typescript/docs/validation/ts-021p/run.mjs results.json
node typescript/docs/validation/ts-021p/fraction-oracle.mjs
node typescript/docs/validation/ts-021p/reduction.mjs
```

The first command exits0 for the fixed corpus. The second exits1, intentionally
retaining actual semantic failures, and writes fraction-results.json. The third
exits0 only when it independently confirms the reduced failure. Generated
executables/JS are disposable under generated/ and are not committed. The
runner does not modify the integrated harness; it imports its existing fail-
closed verdict parser. Final Node version is recorded in results.json (26.13.0).
Compiler version remains the installed pinned0.4.7. Both build and coverage
subprocess records, status/signal/error, stdout/stderr and executions are kept.
Native linking required approved access to the pinned Zig installation.

## Fixed corpus: measured result, not universal support

| probe | static-only build | separate coverage | fixed expected results |
|---|---|---|---|
| radix.ts | exit0 | 5/5 static, no dynamic tier | 84/84 each host |
| decimal.ts | exit0 | 4/4 static, no dynamic tier | 18/18 each host |

Both operands arrive as process arguments after compilation. `parseFloat`
produces typed numbers from controlled tokens; it is probe input plumbing,
not a proposed replacement for Rift's guest numeric-string grammar. The typed
format functions receive no literals and do not call guest code. Each fixed
expected string is declared independently in run.mjs before execution. A case
needs successful typecheck, build, recognized coverage, successful executions,
host agreement AND the fixed expected string. The runner checks typecheck in
its final result as well as each case's gate. No timeout/crash/unknown coverage
counts as success.

The exact matrix (all input strings, radix strings and expected outputs) is
`results.json.rows`, derived from the readable rows in run.mjs:

* Special values, binary255, negative hex255, base36 digit35.
* Exact binary0.5, hex10.5, octal0.125; safe integer boundary hexadecimal.
* Minimum subnormal binary string: `0.` +1073 zeroes+`1`.
* Maximum finite binary string: 53 ones+971 zeroes.
* Each radix2–36 at input radix+1 gives `11`; each even radix at0.5 gives
  `0.` followed by digit radix/2. These include every valid radix as runtime data.
* Decimal 1e-6/1e-7 and 1e20/1e21 boundaries, subnormal, maximum,0.1;
  +/-0,NaN,+/-Infinity,0.3,adjacent values around1 and minimum normal.
  These controls also check the decimal input values used in failing cases.

## Actual semantic failures and reduction

The 23 exploratory pairs are not fixed-string normative expectations. All
executions succeed and both hosts agree, yet seven fail the independent exact
rational rounding-interval check:

| input | radix | result relative to required interval |
|---|---|---|
| 0.3 | 3 | below lower midpoint |
| 0.9999999999999999 | 3 | below lower midpoint |
| 0.9999999999999999 | 36 | below lower midpoint |
| 5e-324 | 3 | above upper midpoint |
| 2.2250738585072014e-308 | 3 | above upper midpoint |
| 2.2250738585072014e-308 | 7 | above upper midpoint |
| 2.2250738585072014e-308 | 36 | above upper midpoint |

See results.json.probes[0].exploratory for exact output strings, including long
subnormals; fraction-results.json and fraction-oracle.log record all23 verdicts.
The other16 pass interval membership only, not a shortestness/conformance proof.
The oracle uses DataView to extract target binary64 bits, BigInt rational
neighbors/midpoints, radix-digit accumulation as integers, and exact cross-
multiplication. It includes round-to-even endpoints, positive normal/subnormal
transitions and self-checks for known valid/invalid strings. It is deliberately
restricted to these positive finite inputs; it is neither a production formatter
nor a general floating-point test framework.

Small reduction, independently hard-coding the binary64 rational instead of
reusing the oracle's bit extraction:

* binary64 0.3 is 5404319552844595 /18014398509481984.
* Lower rounding midpoint is 10808639105689189 /36028797018963968.
* Both hosts print `0.0220022002200220022002200220022002` in base3, equal to
  5003154509899970 /16677181699666569.
* Subtracting the rendered rational from the lower midpoint has positive
  cross-product numerator1872103533741581. Thus the string cannot round to x.

`reduction.mjs` and reduction.log retain this exact calculation. This violates
ECMA-2622025 Number::toString step5 regardless of latitude among acceptable
last digits. It is not justified by the nonnormative closest/even recommendation.
The design links the fixed specification and pinned engine source. No library
code is copied. V8 raw source fetch attempts missed the web cache; the successful
engine reference is pinned engine262, not an uninspected V8 revision.

## Initial failures and bounded harness corrections

`radix-initial.ts`, `decimal-initial.ts`, results-initial.json preserve the first
attempt: TypeScript7 requires --ignoreConfig for an explicit source-file compile;
both native builds failed to locate Zig's installation inside the sandbox;
coverage also reported dynamic Number constructor statements (2 radix/1 decimal).
No executions from that attempt count as passing.

`radix-typed-script.ts`, `decimal-typed-script.ts`, results-typed-script.json
retain typed Number(token) helpers: builds and executions succeed with approved
Zig access but coverage still reports one dynamic statement per program. These
cases remain DYNAMIC even when strings agree. Explicit export{}, an unused fs
import, and an isolated tsconfig were tried without removing that dynamic
statement; those ineffective temporary edits are not in the final probes.
Typed parseFloat eliminates the input-parser dynamic statement. No production
workaround, gate or pin changed. A Python cross-check attempt was unavailable
through the Windows app alias; the retained independent reduction instead uses
plain Node BigInt integer arithmetic. This is not claimed as a Python check.

## Handoff

Recommend a separately assigned Number valueOf-only task; full toString remains
blocked on a faithful typed radix formatter, including nondecimal fractions and
shortestness, under the current pins. Preserve the unchanged decimal backend.
Do not convert the84 passing examples or engine262 host delegation into a claim
of complete formatting support. Independent review must examine the oracle,
the seven real failures, staged versus full key/hint expectations, and migration
inventory before implementation. Commit/push design and evidence, then stop.
