# Radix formatter options (CL-005)

This document researches the Number.prototype.toString blocker recorded by TS-021P
([design](../number-prototype-conversions.md), [evidence](../validation/ts-021p/README.md)).
Both hosts print strings that do not round to the input for seven nondecimal cases. It compares
how real engines format binary64 values in radix 2–36, measures what can be measured, and
recommends a bounded future backend task. It changes no engine code, tests, toolchain or decimal
backend, and claims no new runtime support.

- Base: `36fc2be` on `codex/primitive-computed-keys`.
- Research files: [`fixtures/assistance/radix-formatter-options/`](../../fixtures/assistance/radix-formatter-options/).
  - `oracle.mjs`: exact search of the step 5 definition.
  - `free-format.mjs`: reference digit generator.
  - `run.mjs`: comparison driver, writing `results.json`.
  - `bigint-probe.ts` and `probe-run.mjs`: scriptc portability probe, writing `probe-results.json`.
- Evidence labels: **[measured]** means a command run for this task, with output retained.
  **[static]** means read from pinned source. **[inference]** means a reasoned consequence that was
  not executed. **[model]** means a strategy reimplemented from source reading to test a
  hypothesis; it is not the engine itself.

## Summary

1. **The requirement is precise.** ECMA-262 2025 Number::toString step 5 has two parts:
   - it requires the shortest digit string (smallest k) whose value converts back to x;
   - only the choice among equally short strings is free. Note 2's "closest, then even s" is a
     recommendation.
2. **[measured] V8's algorithm is the source of the retained failures, and it is not limited to
   them.** It computes nondecimal digits in binary64 arithmetic. Node 26.13.0 (V8 14.6.202.34) put
   its output inside the rounding interval:
   - for every power-of-two radix;
   - for only 4,056 of 11,394 cases in other radices. Most failures are below 2^-30 or at and
     above 2^53, but even magnitudes between 2^-30 and 2^53 fail in 395 of 2,561 cases.
   - [static] scriptc's runtime ships a vendored V8 radix component, which is consistent with the
     two lanes agreeing.
3. **[static/model] Exact engines exist but are not complete references for step 5.**
   - SpiderMonkey prints every integer digit exactly. That is not the shortest representation at
     or above 2^53 (shortest in 976 of 5,263 such cases under the model).
   - QuickJS-ng's nearest-candidate search can miss the shortest output at powers of two (27 of
     13,350 cases under the model).
4. **[measured] The Burger & Dybvig free-format algorithm with exact BigInt state satisfies the
   required behavior in every measured case.**
   - It was in the interval and shortest in 13,350 of 13,350 cases, agreeing with an independent
     exact oracle.
   - It differs from Note 2's choice only in 7 subnormal cases, where the equally short candidates
     straddle a power of the radix.
   - Written as TypeScript with native `bigint`, it builds under scriptc 0.4.7 `--tier
     static-only` with 78 of 78 statements static. Both lanes produced identical output and passed
     167 of 167 oracle checks.
5. **Recommendation.** Assign one isolated backend task:
   - Reimplement free-format from the paper with `bigint`, plus a cross-power closest-candidate
     step.
   - Accept it only against the exact oracle and the matrix [below](#acceptance-matrix-for-the-future-backend-task).
   - Keep radix 10 on the existing decimal backend.

## What the fixed specification requires

Source: [ECMA-262 2025 §6.1.6.1.20 Number::toString](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-tostring),
retrieved 2026-11-02.

- Steps 1–4 handle NaN, ±0, negative values and +∞ before any digit work. A backend can assume
  finite x > 0 and an integer radix in 2–36.
- **Step 5 is required.** It picks integers n, k, s with `radix^(k-1) ≤ s < radix^k` such that the
  Number value for `s × radix^(n-k)` is x, and k is as small as possible. Two consequences:
  - Interval membership alone is not enough: the output must also have the minimal k. A longer
    in-interval string is non-conforming.
  - The rounding interval is the set of reals whose "Number value" is x: round to nearest, ties to
    the even significand. Its ends are therefore the midpoints to the neighbouring doubles. Both
    ends are included exactly when x's significand is even.
  - At a power of two (significand 2^52, except the smallest normal), the gap below is half the gap
    above.
  - The smallest subnormal's lower neighbour is 0.
  - Number.MAX_VALUE's upper neighbour is treated as 2^1024. MAX_VALUE has an odd significand, so
    that midpoint is excluded.
- **Note 2 is a recommendation.** Among equally short candidates, choose the one closest to x;
  on an exact tie, choose even **s**. For odd radices the parity of s is not the parity of its last
  digit. SpiderMonkey's source comments on exactly this pitfall with odd bases
  (`DoubleToString.cpp:318`).
- **Step 6 output.** For radix ≠ 10 the output is always positional:
  - n ≥ k: the digits followed by n−k zeros;
  - 0 < n < k: a point inside the digits;
  - n ≤ 0: `0.` followed by −n zeros and the digits.

  There is no exponential notation. Large integers must therefore end in padding zeros, not
  exact low-order digits.

## The retained counterexamples, re-derived

[measured] `run.mjs` re-checks the TS-021P strings with a new exact oracle (`oracle.mjs`). It
reaches the same seven failures as TS-021P's own rational check. It also lists every candidate
that step 5 allows.

| Input | Radix | Host output digits (k) | Minimal k | Step 5 candidates | Verdict |
|---|---|---|---|---|---|
| 0.3 | 3 | 33 | 34 | 2 (`…21`, `…22`; Note 2 picks `…22`) | outside the interval, too short |
| 0.9999999999999999 | 3 | 33 | 34 | 2 | outside, too short |
| 0.9999999999999999 | 36 | 11 | 11 | 14 | outside |
| 5e-324 | 3 | 1 | 1 | 2 | outside |
| 2.2250738585072014e-308 | 3 | 33 | 33 | 1 | outside |
| 2.2250738585072014e-308 | 7 | 19 | 19 | 3 | outside |
| 2.2250738585072014e-308 | 36 | 10 | 11 | 2 | outside, too short |

- 0.3 in radix 36 is a useful contrast. The host prints `0.asssssssssp`, which is in the interval
  and shortest but not Note 2's choice (`0.asssssssssr`). It is conforming, as TS-021P anticipated.
- [measured] All 61 finite nonzero nondecimal fixed expectations retained in TS-021P's
  `results.json.rows` are exactly the oracle's Note 2 choice. That corpus is consistent with the
  specification.

## Implementations compared

All sources were read at the pinned revisions below. Nothing was copied into this repository.

| Implementation (pinned) | License | Method | Required behavior | Evidence |
|---|---|---|---|---|
| V8 [`DoubleToRadixStringView`](https://github.com/v8/v8/blob/f9116f3bf9a50b0f7925daacfdc6fed503a9dbe2/src/numbers/conversions.cc#L1420-L1511) (tag 14.6.202.34 = Node 26.13.0; blob `f4b6af0e`) | V8 BSD-style | Fraction: repeated `fraction *= radix`, `delta *= radix` in binary64, with delta set from the gap **above** only. Integer: floating division, with low digits replaced by `0` | No: inexact for non-power-of-two radices, and asymmetric gaps are ignored | [measured] via Node |
| scriptc 0.4.7 runtime `scr_num_to_string_radix_f64` ([tag v0.4.7](https://github.com/vercel-labs/scriptc/tree/6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff)) | Apache-2.0, with vendored V8 BSD-3-Clause | The pack script ships a `v8-number-radix` license (`packages/runtime-pack-common/scripts/build.mjs:701`). The defining C source was not found in the public tree | [inference] same as V8 | TS-021P measured identical output on 23 of 23 pairs |
| Boa [`to_js_string_radix`](https://github.com/boa-dev/boa/blob/337a3668a0dc86dd401ea20906e782249a64a228/core/engine/src/builtins/number/mod.rs#L563-L672) (v0.22; blob `b4a0ad6a`) | MIT | A port of the V8 routine; its comment cites V8 `conversions.cc` | [inference] same failure class | Static only; not run |
| SpiderMonkey [`js_dtobasestr`](https://github.com/mozilla-firefox/firefox/blob/28b7a7bffb5f82828143d9ad63839ad263b598be/js/src/util/DoubleToString.cpp#L146-L339) (blob `92e537f2`) | MPL-2.0 file, with David Gay's dtoa notice | Integer part: **every exact digit** (u32 path or Bigint `divrem`). Fraction: exact Bigint free-format, with a quarter-ulp low bound at powers of two, closest last digit, and no even tie (comment at L318) | Fraction: [inference] yes. Integers ≥ 2^53: **no**, because the digits are not minimal | [model] the integer branch was shortest in 976 of 5,263 cases; e.g. MAX_VALUE in radix 3 has k = 647 where 35 is minimal |
| QuickJS-ng [`js_dtoa` free format](https://github.com/quickjs-ng/quickjs/blob/d7215b0ad3fc2c562e8317fd9bca058fd4863804/dtoa.c#L1183-L1234) (v0.18.0; blob `a89e824f`) | MIT (Bellard) | Exact mini-bignum. For P digits, from P_max downward, it rounds x to the nearest P-digit value, strips zeros, and keeps the result while it converts back. It stops at the first failure | Always in the interval. Not always shortest: the nearest candidate can sit on the narrow side of a power-of-two gap | [model] in the interval in 13,350 of 13,350 cases; not shortest in 27, all exact powers of two (e.g. 0.5 in radix 3 gives k = 35 where 34 is minimal) |
| engine262 [`NumberValue.toString`](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/value.mts) (pinned by TS-021P) | MIT | Delegates to the host's `toString(radix)` | Inherits the host's behavior | Per TS-021P |
| Burger & Dybvig free-format, [PLDI 1996, doi:10.1145/231379.231397](https://doi.org/10.1145/231379.231397), refining Steele & White [doi:10.1145/93542.93559](https://doi.org/10.1145/93542.93559) | Published algorithm; transcribed here as `free-format.mjs` | Exact r, s, m⁺, m⁻ scaled into the output radix. It generates digits until the low or high termination test holds. It handles unequal gaps, with bounds inclusive for an even significand | Yes, per the paper's proof | [measured] in the interval and shortest in 13,350 of 13,350 cases |

Ryū, Grisu and Schubfach were not shortlisted. Their precomputed tables and proofs are specific to
radix 10, and the decimal backend already covers radix 10.

## Measurements

[measured] Command: `node typescript/fixtures/assistance/radix-formatter-options/run.mjs` (exits 0),
under Node v26.13.0 with V8 14.6.202.34. Radix 10 is excluded. The corpus has 13,350 (x, radix)
pairs:
- the 23 retained TS-021P exploratory pairs and 60 of its fixed rows;
- 909 boundary pairs over all radices (subnormal/normal limits, MAX_VALUE, 1±ulp, 2^53, 2^60,
  1e21 and others);
- 4,522 powers of two with their neighbours, and 1,836 radix powers with their neighbours;
- 4,000 random bit patterns, and 2,000 random values between 2^-30 and 2^60.

The random values come from a fixed xorshift seed, so reruns are identical.

Every output is judged by `oracle.mjs`. For each k = 1, 2, … it enumerates every (s, n) whose exact
value lies in the rounding interval, using BigInt rationals only. It never generates digits and
never calls a host formatter. It judges the whole output string: the text must contain only
digits of the radix, with at most one interior point, and must equal the step 6 rendering of its
own (s, n, k). So `0.1.`, `0.10`, `00.1` and `1.` are rejected as malformed, while the zero
padding of a large integer (n > k) is required. `free-format.mjs` generates digits by a different
method. The run fails if the two disagree on interval membership or minimal k; they never did.
Every string judged in the corpus, from all four sources, was well formed (all cases for each).

| Formatter | In the interval | Shortest (required) | Note 2 choice |
|---|---|---|---|
| Node/V8, all | 6,012 / 13,350 | 5,605 | 4,878 |
| Node/V8, power-of-two radices | 1,956 / 1,956 | 1,956 | 1,956 |
| Node/V8, other radices, x between 2^-30 and 2^53 | 2,166 / 2,561 | 2,127 | 1,928 |
| Node/V8, other radices, x below 2^-30 | 795 / 4,325 | 760 | 533 |
| Node/V8, other radices, x at or above 2^53 | 1,095 / 4,508 | 762 | 461 |
| QuickJS-ng selection rule [model] | 13,350 / 13,350 | 13,323 | 13,323 |
| SpiderMonkey integer branch [model], integers ≥ 2^53 | 5,263 / 5,263 | 976 | 976 |
| Burger & Dybvig free-format (`free-format.mjs`) | 13,350 / 13,350 | **13,350** | 13,343 |

The corpus deliberately over-weights extreme magnitudes, so these are not population failure
rates. The 7 Note 2 differences for free-format are subnormal inputs such as 1e-323 in radix 5 or
5e-324 in radix 14:
- The paper chooses between digit d and d+1 at one scale.
- The closer candidate with the same k sits one radix power lower.
- Both candidates are conforming.

## Exact arithmetic, boundaries and output size

- **Numbers involved.** [measured] The largest intermediate in the free-format state over the corpus
  was 1,081 bits: x ranges over 2^-1074 to 2^1024, scaled by radix powers. There is no
  floating-point step, except the initial log estimate of k, which is corrected by exact loops.
- **Boundary cases a backend must handle explicitly:**
  - unequal gaps at significand 2^52, except the smallest normal;
  - the smallest subnormal, whose lower neighbour is 0;
  - MAX_VALUE, whose excluded upper midpoint is at 2^1024;
  - inclusive bounds for even significands;
  - carries that turn the last digit into a higher-order digit;
  - candidates that straddle a radix power, which matter only for Note 2;
  - integers ≥ 2^53, which need zero padding rather than exact digits.
- **Output size.** [measured] The longest shortest strings in the corpus come from 5e-324 and
  MAX_VALUE. By radix: 2 → 1,076 characters, 3 → 680, 8 → 360, 16 → 271, 36 → 210. A sign adds
  1, so 1,077 is the maximum. V8 reserves `kDoubleToRadixMaxChars = 2200`; SpiderMonkey reserves
  1,078.

## TypeScript representation under static compilation

- **[measured] Native `bigint` works under the current pins on Windows x64.**
  - `bigint-probe.ts` transcribes the free-format loop: 68 lines with `DataView.getBigUint64`,
    `bigint` arithmetic and `%`.
  - It builds with `scriptc 0.4.7 build --tier static-only` and covers 78 of 78 statements
    statically, under the existing fail-closed `probeVerdict` parser.
  - It typechecks with TypeScript 7.0.2.
  - Node and native produced byte-identical output for 167 cases (the retained 7, boundaries, and
    150 random values). Every case was in the interval and shortest; 166 were Note 2's choice.
  - Inputs arrive as process arguments after compilation, as in TS-021P (`parseFloat` token
    plumbing).
- **Readable shape for the future task.**
  - One typed function, `numberToStringRadix(value, radix)`, as TS-021P proposed. It extracts
    (f, e), builds the four exact integers, scales, then generates digits.
  - A short named helper for each boundary rule.
  - A final step that compares the chosen candidate with the alternative across the radix power,
    if the closest/even recommendation is adopted.
  - No host formatter or parser participates.
- **Fallback if `bigint` lowering regresses:** a small natural-number class over `number[]` limbs
  (for example 24-bit limbs, so products stay below 2^53). It needs multiply-by-small, add,
  compare, shift and divmod-by-bignum, which is more code and therefore needs its own probe.
- **[unproven]**
  - native `bigint` speed and memory;
  - macOS and Linux lanes;
  - behavior inside the full interpreter build;
  - whether a future scriptc pin keeps `bigint` static.

## Recommendation and bounded future task

1. **Algorithm.** Burger & Dybvig free-format with exact `bigint`, reimplemented from the paper,
   which avoids license questions. No engine code should be copied.
   - Use one path for all magnitudes, including integers ≥ 2^53.
   - Add an explicit Note 2 step that compares d, d+1 and the cross-power candidate exactly, with
     ties broken on the parity of s.
2. **Policy.** Require step 5 (interval plus minimal k), and target Note 2. Report any Note 2
   deviation as a documented choice, never as a step 5 failure.
3. **Scope.** Make it a backend-only task: `numberToStringRadix` for radix ≠ 10, with the decimal
   backend unchanged. Do not register `Number.prototype.toString` until it is accepted, and keep
   the TS-021P R/N matrices for that later integration.
4. **Oracle.** Adopt `oracle.mjs` (or an equivalent direct step 5 search) as a test-only oracle in
   the integrated suite. A host formatter and Node output must never be expected values.

## Acceptance matrix for the future backend task

| ID | Requirement | Check |
|---|---|---|
| A1 | The 7 retained counterexamples | Output is in the interval with minimal k, and equals the Note 2 choice (`0.3`/3 → `0.02200220022002200220022002200220022`) |
| A2 | Step 5 on a fixed corpus | At least this CL-005 corpus (13,350 pairs, fixed seed) in both lanes: every output in the interval with minimal k, judged by an exact oracle that shares no code with the backend |
| A3 | Note 2 | Matches the oracle's closest/even choice. This includes the 7 cross-power subnormal cases and odd-radix parity of s |
| A4 | Boundaries | 5e-324, the largest subnormal, the smallest normal, MAX_VALUE, 2^k and their neighbours, radix powers ± 1 ulp, 1 ± ulp, 2^53, 2^60, 1e21, in every radix 2–36 except 10 |
| A5 | Positional output | The whole string equals the oracle's step 6 rendering of its (s, n, k): n ≥ k zero padding, interior point, leading `0.` and zeros, no fraction trailing zeros or stray point; never exponential for radix ≠ 10; length ≤ 1,077 |
| A6 | Callers' special values | NaN, ±0, ±∞ and negatives are still handled by the TS-021P steps, not by the backend |
| A7 | Radix 10 | Unchanged backend; the existing 18 decimal cases and all guest suites pass |
| A8 | Static compilation | static-only build plus separate coverage at 100% for the CLI and drivers; Node and native byte-identical |
| A9 | Resources | Bounded intermediate size (about 1.1k bits measured) and a measured per-call time in both lanes, recorded but not gated |
| A10 | No host formatting | The backend source contains no `toString(radix)`, `toFixed` or `parseFloat` (enforced by a source check) |

## What ran, and what remains unproven

- **Ran** [measured]:
  - `run.mjs`, exit 0, writing `results.json`. It includes oracle self-checks such as 0.5→`0.1`
    in base 2, 255→`ff`, 2^60 in base 2, and rejection of a wrong value. It also checks that
    the judge rejects malformed or noncanonical text (`0.1.garbage`, `0.1.`, `0.10`, `1.`,
    `00.1`, `.1`, uppercase digits, a trailing `.0`) and unpadded integers, and still accepts
    canonical padded output such as 256→`100` in base 16.
  - After that oracle fix, the stored Node and native outputs in `probe-results.json` were
    re-judged with the stricter oracle: 334 of 334 lane verdicts unchanged. The probe was not
    rebuilt; it renders its text through the oracle's own `format`, so the fix cannot change it.
  - `probe-run.mjs`, exit 0, writing `probe-results.json`, with the pinned Zig 0.17.0 directory on
    PATH. Native linking worked without extra approval in this session.
- **Not run:** SpiderMonkey, QuickJS-ng, Boa and engine262. Their rows are static readings or
  models. The QuickJS-ng and SpiderMonkey models reproduce the selection rules as read, not the
  engines, so their counts are hypotheses for those engines.
- **Not proven:**
  - The oracle is checked by hand-derivable cases and by complete agreement with an independent
    method. That is evidence, not a formal proof.
  - Burger & Dybvig's shortest-output guarantee rests on the paper's proof plus these
    measurements.
  - No exhaustive search over all doubles was attempted.
- **Not addressed:** BigInt values, `toFixed`/`toPrecision`/`toExponential`, and parsing.
