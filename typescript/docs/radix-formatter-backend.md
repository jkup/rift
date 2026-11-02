# Exact nondecimal formatter: TS-032P

2026-11-02; design/proof plan for independent review, base `2bf6fd2` on
`codex/test262-classification`. No production implementation or registration.
Prerequisites: accepted CL-005 `d532a14` and
[TS-021P](number-prototype-conversions.md). The existing 212-case, 36-gate runtime
baseline is inherited, not rerun here.

## Frozen decision and ownership

Implement one readable bigint free-format backend, then review it independently
before assigning Number.prototype.toString integration. Use an exact iterative
scale search, digit generation with two half-gap margins, and a bounded final
closest-candidate comparison across three possible radix exponents. No floating
log estimate, integer-only shortcut, host number formatter, decimal replacement,
cache, custom bignum package, or dynamic compilation is needed.

Proposed module: `src/number-radix.ts`, exporting only
`numberToStringRadix(value: number, radix: number): GuestString`. The input is a
positive finite binary64 and an integer radix 2–36 other than 10. `GuestString`
is the existing alias in `strings.ts`. Internal records use named bigint fields;
`n`, `k`, radix and digit indices are small exact Numbers. Keep boundary setup,
digit generation, candidate selection and rendering as short named helpers.
Do not expose mutable buffers or a guest BigInt type.

Check the precondition before DataView extraction or BigInt(radix): reject NaN,
infinities, signed zeros, negatives, nonintegral/out-of-range radix, and radix 10
with a host `Error("invalid nondecimal formatter input")`. This is an internal
programming fault, never a guest RangeError or ordinary Completion path. Valid
inputs must not hit any guard or fallback. The backend performs no guest calls,
reads, coercions, Realm changes, budget ticks or I/O. Add defensive iteration
guards with host faults; never return an approximate/truncated string.

Future caller order remains TS-021P: receiver extraction first, absent/undefined
radix defaults to 10; otherwise numeric-hint ToPrimitive then ToIntegerOrInfinity;
range check before formatting even NaN/zero/infinity. Propagate original abrupt
completions. Caller handles NaN, both zeros, sign and infinities, dispatches radix
10 through unchanged `numberToString`, and sends only positive finite nondecimal
inputs here. No methods, primitive member access, constructors, converter
widening or test262 admission are authorized by this design.

## Sources, normative boundary and derivation

Verified on 2026-11-02:

* [ECMA-262 2025 §6.1.6.1.20](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-tostring),
  steps 5–6 and Note 2; also the Number-type rounding definition in §6.1.6.1.
  Required: interval membership, smallest significant-digit count, and canonical
  positional rendering. Recommended: closest rational, then even significand.
  **This project adopts the recommendation as an additional acceptance target.**
  Track a Note 2 failure separately from a required-step failure.
* Burger and Dybvig, PLDI 1996, pp.108–116,
  [DOI 10.1145/231379.231397](https://doi.org/10.1145/231379.231397),
  [author-hosted corrected PDF](https://www.burgerrg.com/FP-Printing-PLDI96.pdf),
  §§2.2–2.3, §3.1 and Appendix A. The corrected copy explicitly warns that the
  original mathematical rounding condition/correct-rounding theorem is too strong. Do not cite
  it as a proof of global Note 2 selection. Its useful ingredients are exact
  remainder/margin bookkeeping and first-hit termination. Our derivation below
  covers the selected binary64 contract, including the extra exponent search.
* [Accepted CL-005](assistance/radix-formatter-options.md) pins engine revisions,
  licenses and retained experiments. Its engine survey is not repeated. V8 host
  agreement is insufficient; the existing bigint probe is portability evidence,
  not a production implementation or proof.

The paper is copyrighted; no Scheme listing, engine code or paper text is
transplanted. Implement from the equations and invariants derived here, with
paper attribution. No third-party engine license is introduced. Source-access
details and limitations are in the [evidence README](validation/ts-032p/README.md).

## Exact interval

Use DataView with explicitly consistent byte order to extract biased exponent
`a` and 52-bit fraction `t`. Set `f=t` for a=0, otherwise `f=2^52+t`; set
`e=(a===0 ? 1 : a)-1075`. Thus x=f·2^e exactly. Both midpoint endpoints belong
to x precisely when f is even. This binary significand parity is distinct from
the later radix significand parity.

Let the positive integers R,D,Mminus,Mplus describe
`x=R/D`, `L=(R-Mminus)/D`, `H=(R+Mplus)/D`. Initialize:

| case | R | D | Mminus | Mplus |
|---|---|---|---|---|
| e≥0, equal gaps | 2f·2^e | 2 | 2^e | 2^e |
| e≥0, unequal gaps | 4f·2^e | 4 | 2^e | 2·2^e |
| e<0, equal gaps | 2f | 2^(1-e) | 1 | 1 |
| e<0, unequal gaps | 4f | 2^(2-e) | 1 | 2 |

Unequal means `a>1 && t===0`: a normal power of two above the smallest normal.
The smallest normal has equal gaps. At minimum subnormal f=1, the predecessor
is zero and both ends are open. At maximum finite f=2^53−1, use the mathematical
successor 2^1024 to form H, not IEEE infinity; the upper end is open. The table
already yields this overflow threshold. No epsilon comparison is allowed.
Retain immutable original R,D,margins for final candidate selection.

## Scale and generate a minimum-length significand

Use B=BigInt(radix). Working r,d,mminus,mplus begin as R,D,Mminus,Mplus; n=0.
The scaled value is x/B^n=r/d and the half-gaps scale by the same factor.
Find the smallest n for which H<B^n when closed, or H≤B^n when open:

1. While closed ? r+mplus≥d : r+mplus>d, multiply d by B and increment n.
2. While closed ? (r+mplus)B<d : (r+mplus)B≤d, multiply r and both margins
   by B and decrement n.

Both comparisons deliberately change equality with endpoint ownership. Starting
at zero makes the two loops monotone; no floating estimate or exponentiation is
needed for this stage. It follows that x/B^n<1, and B^(n−1) is at or below the
largest admissible magnitude of the interval.

Set prefix=0, k=0. Each iteration:

1. Multiply r,mminus,mplus by B. Compute digit=floor(r/d), then r=r mod d.
   Set prefix=prefix·B+digit and increment k.
2. low = closed ? r≤mminus : r<mminus.
   high = closed ? r+mplus≥d : r+mplus>d.
3. If neither, continue. Otherwise k is minimal. Keep k and n; final selection
   below determines the output significand. Do not stringify the provisional
   digits or commit to just one last digit.

After k digits the invariant is
`x=(prefix+r/d)·B^(n−k)`; the current margins divided by d, times B^(n−k),
are the original half-gaps. Consequently low says that prefix·B^(n−k) is
admissible; high says the next grid point is admissible. The points bracket x;
all other points on that grid are farther away on their respective sides. If
neither is inside the interval, no point on that grid is inside it.

This proves minimality at the chosen exponent by induction over digit count.
It also proves global minimality: if the interval contains values with a lower
radix magnitude than n, the intervening power B^(n−1) itself is admissible
(including equality only when closed), and the first iteration succeeds with
one digit. Otherwise every admissible value has magnitude n. No higher
magnitude is possible by construction. Thus another exponent cannot hide a
shorter significand. A nonminimal final zero would imply a shorter previously
available representation, a contradiction.

The familiar final-digit carry cannot require prefix rewriting: an increment
that carries into an earlier digit would have been admissible on an earlier
iteration. The final selector independently enforces the k-digit range, so it
does not need this optimization as an implementation assumption. Assert the
selected s lies in [B^(k−1),B^k) and s mod B≠0 (except k=1, where it is already
nonzero and <B). Do not repair a failed invariant by stripping digits silently.

## Global closest/even selection, including subnormals

Compute n0 exactly with B^(n0−1)≤x<B^n0, using a separate scale loop on R/D:
start u=R,v=D,n0=0; while u≥v multiply v by B and increment n0; while uB<v
multiply u by B and decrement n0. Equality at the lower power stays at n0.

Every admissible y satisfies x/2≤y≤3x/2. Since B≥2, its canonical magnitude
lies among n0−1,n0,n0+1. Endpoints may make this set larger than necessary;
filtering handles that. For each of these three n at the already minimal k:

1. Represent q=B^(n−k) as positive integers A/C: if n≥k, A=B^(n−k),C=1;
   otherwise A=1,C=B^(k−n). Use a small iterative power helper, not negative
   bigint exponents. Set lo=B^(k−1), hi=B^k−1.
2. Compute j=floor(R·C/(D·A)). Consider clamp(j,lo,hi) and
   clamp(j+1,lo,hi); duplicate candidates may simply be skipped.
3. For each candidate s, compare s·A·D with (R−Mminus)·C and
   (R+Mplus)·C, using the original closed/open rule. Discard outside candidates.
4. Its distance from x is |s·A·D−R·C|/(C·D). Compare two distances by
   cross-multiplying their nonnegative numerators with the other's C; D is
   common and cancels. Choose smaller distance, then even **whole s**.

There are at most six candidates, not an unbounded enumeration. On each grid
distance from x is monotone away from floor/ceil. Clipping those to the k-digit
range gives the closest point on either side that can exist in that range.
If that point fails interval membership, every farther point on the same side
fails too. Taking the best across all three grids is therefore globally closest
among all shortest representations. This is not the oracle's enumeration of
all s at every k; no test oracle code is imported into production.

At a tie on one grid, consecutive integers have opposite parity. Across a radix
power, adjacent canonical significands are B^k−1 and B^(k−1), also opposite
parity unless B is even and k=1. That exceptional pair cannot tie for an actual
binary64 x while both round to it: a normal's interval is far narrower than
their relative separation (at least 1/71); for a subnormal, the midpoint would
require half of the power-grid spacing to lie on the 2^-1074 lattice, making
the distance at least one subnormal ulp, outside the half-ulp interval. For a
negative radix exponent with an odd factor in B the midpoint is not dyadic at
all. Identical candidates are harmless; any distinct equal-distance same-parity
pair should raise an invariant fault, not acquire an undocumented tiebreaker.

In odd radices the last digit's parity is insufficient: base3 significands
`10` and `11` are integers 3 and 4. A synthetic equal-distance helper control
must choose 4 although its last digit is odd. The endpoint inclusion rule uses
f, not either of these s values.

The seven accepted subnormal differences all have k=1. For example input bits
`0000000000000002`, radix5: the free-format choice (s=1,n=−461,k=1) is admissible;
the closer choice is (s=4,n=−462,k=1). Both satisfy the required steps. Searching
only d and d+1 at the first exponent cannot achieve the chosen Note 2 target.
[All seven literal alternatives](validation/ts-032p/vectors.json) are frozen.

## Canonical rendering

Convert selected s to exactly k digits by repeated bigint divmod B and indexing
`0123456789abcdefghijklmnopqrstuvwxyz`; reverse the small digit buffer. Do not
call Number/BigInt.toString(radix), toFixed, toPrecision, parseFloat, Number(text)
or a host radix parser within the backend. Extraction and small digit conversion
to Number are exact; no bigint significand is converted to a floating number.

If n≥k append n−k zeroes. If 0<n<k insert one point after n digits. If n≤0
prefix `0.` and −n zeroes. No sign, uppercase, exponent, leading integer zero,
trailing fractional zero or stray point. Integer padding zeroes are mandatory
and are not significant digits: 256 in radix16 is `100`, with (s,n,k)=(1,3,1).

## Termination and conservative resource envelope

These are derived bounds for this design, not benchmark results. For all valid
inputs x≥2^-1074, x<2^1024, H≤1.5x, and both half-gaps are at least x·2^-54.
The selected scale satisfies B^n≤B·H≤1.5B·x. At k=57 its grid spacing is at
most 1.5x·B^-56, strictly below either half-gap for B≥2. The floor grid point
then terminates the loop, unless a radix boundary already terminated at k=1.
Thus **k≤57** is a conservative bound (measured accepted corpus maximum:53).

Both scale searches stay within n,n0∈[−1073,1024]; allow 1076 iterations per
scale phase as a defensive check. Selection considers n∈[−1074,1025], so each
power exponent has absolute value at most1131. A 1132-multiplication power
guard and a 57-digit generation guard suffice. Constant-many power operations
and at most six candidates make the work bounded independently of guest state.

A deliberately loose integer bound is **16384 bits per intermediate** for the
specified operations. Initial R,D have at most1077 bits. Scale multiplication
adds at most1076·6 bits (B<64), generation at most57·6; selection powers add at
most1131·6. Candidate value and endpoint cross-products are below8000 bits;
distance comparison adds a second denominator below6800 bits, hence below16384.
The loop-specific actual bound is much smaller; CL-005 measured1081 bits for
its different scaling implementation. Do not treat1081 as a universal cap.
The test harness can instrument bit lengths; production need not format
bigints to measure them. No unbounded exponent or user-length buffer enters.

Unsigned output is at most **1076 code units**, with a caller sign at most1077.
For B=2 the exact normalized bit representation is shortest: deleting a
significant low bit changes the value by at least an ulp, outside its half-gap.
It has at most1074 fractional places (minimum subnormal), or1024 integer places.
For B≥3 take t=ceil(1076/log2(B)) only in this proof: grid B^-t is sufficiently
fine that its nearest point is strictly inside every interval and nonzero.
This gives a representation with at most t fractional places. Minimal k cannot
exceed its digit count. Candidate magnitudes differ by at most2, so any selected
shortest candidate needs at most t+2 fractional places; t≤679, giving at most683
characters below1. Interior-point output has k+1≤58; padded integers have
n≤1025. All are below1076. No logarithm is needed in production.

These bounds limit arithmetic/string sizes, not OS allocation cost, GC latency
or wall time. Future validation records total and per-call timing (warm batch,
median and maximum), peak instrumented integer width, max iterations/k/length,
and available memory observations separately for Node and native. Timing is
diagnostic, not an arbitrary semantic pass threshold. Host transport deadlines
and crashes must fail validation rather than disappear from its denominator.

## Acceptance and independent proof plan

The frozen [evidence package](validation/ts-032p/README.md) contains 24 full-text
literal vectors and a 13350-pair bit-pattern corpus. Freeze bytes and order, not
just a seed; platform differences in historical radix-power generation must not
silently change the denominator. Extend with controls without replacing it.

| ID | Required acceptance before backend review |
|---|---|
| B01 | All24 literal vectors, including seven retained failures, seven cross-power choices, positional branches and extremes, exact in both lanes |
| B02 | All13350 frozen pairs in each lane: canonical text, interval, minimum k, Note2 independently recorded; zero skips/crashes/timeouts; pair identity/order and duplicate/missing outputs checked |
| B03 | Endpoint unit checks: exact L/H inclusion for even f, exclusion for odd f; minsub, maxsub, minnormal, next normal power and MAX_VALUE; negative/outside neighbors rejected |
| B04 | Final selector controls: only low, only high, both, same-grid ties both parity orders; odd-base whole-s parity; cross-power seven; clipping and duplicate candidates; no distinct same-parity tie |
| B05 | Every radix2–36 except10 with boundaries and neighboring binary64 patterns; preserve accepted corpus plus all-radix boundary supplementation if not present |
| B06 | Malformed/noncanonical whole-string rejects retained from CL005: junk suffix, newline, point-only endings, `.1`, `00.1`, `0.10`, uppercase, signs/space, padded fractional zero; unpadded large integers fail interval |
| B07 | Preconditions fail with host fault before arithmetic: x±0, negative, NaN, ±Infinity; radix0,1,10,37,NaN,±Infinity,2.5; no guest diagnostics or fallback |
| B08 | Exact derived iteration, integer-width and1076 unsigned-length envelopes; retain observed maxima and timing; no corpus-dependent relaxation |
| B09 | Production and runtime-input driver build with scriptc0.4.7 static-only AND separately parsed100% static coverage, zero dynamic; Node/native exact-byte agreement is additional evidence only |
| B10 | Existing typecheck, runner20, probes10, full212 expected cases each lane and36 existing gates preserved; add a separate backend driver gate, do not replace old ones |
| B11 | All18 TS021P decimal controls preserved; source/diff audit proves decimal/registration/compiler/test262/CL006 unchanged; source scan and review reject host formatting/parsing in the backend |

Independent oracle: retain corrected CL005 `oracle.mjs` unchanged as host-only
test logic. It decodes adjacent bit patterns, constructs rational midpoint sums,
searches k in increasing order, enumerates all permitted integers at three
magnitudes, and validates the entire canonical string. Production uses half-gap
initialization plus digit remainder termination and at most six nearest
candidates only after k is known. They share the mathematical contract, not
implementation helpers, renderer, candidate list or decoder. Driver reconstructs
runtime bit patterns with DataView; never reparse native printed decimals to
identify inputs. Host formatting is allowed in the oracle's bigint renderer,
not in the implementation under test.

The oracle's three-magnitude coverage follows the x/2…3x/2 bound above; its
smallest-k search is mathematically independent of digit termination. Hand-derived
endpoint/parity and exact binary/padding vectors guard shared conceptual mistakes.
Literal complex strings were frozen from accepted exact research, not declared
independent proofs. Future review must inspect the derivation as well as rerun
tests. In particular, unit-test rational helpers on synthetic intervals so real
binary64 sampling does not leave exact ties unexercised.

Native evidence must retain exact compiler version/command, successful static-only
build, complete separate coverage text and fail-closed parse, artifact hashes,
runtime input/output, exit/signal/timeout and errors. Feed every corpus pair after
compilation, preferably in bounded batches; no embedded constant-output switch.
No native success claim follows from the old78-statement/167-case probe. No
new lowering question justifies recompiling that old probe during this design.

## Ordered handoff and remaining decisions

1. Independently review this design, the bound arguments, sources and literal
   corpus identity. This task stops here; acceptance is coordinator-owned.
2. Assign a bounded backend-only implementation and dedicated typed runtime-input
   test driver, plus host oracle orchestration/evidence. No builtins/decimal or
   semantic migrations. Keep helpers local; reduce any actual compiler failure
   before considering a workaround. A bigint regression blocks acceptance; it
   does not authorize a limb implementation or pin upgrade.
3. After independent backend acceptance, separately assign complete
   Number.prototype.toString integration. Apply all TS021P N1–N8/R1–R16,
   receiver/radix ordering, saved/borrowed methods, registration metadata, Realm
   restoration, reentry budgets and precise expectation migration inventory.
   Rebase that inventory on the then-current baseline; preserve every negative
   and existing case identity. Radix hooks execute even for special numbers;
   no backend-call budget ticks are invented. No main merge follows implicitly.

Frozen here: exact bigint, no log estimator, defensive host faults, full Note2
target, three-exponent/six-candidate selector, and1076 unsigned bound. Remaining
implementation decisions are the smallest typed driver/batch transport compatible
with static coverage, location of private test hooks for synthetic ties/resource
counters, and whether measured resource cost warrants a separately reviewed scale
optimization. These do not change numerical behavior. Full-module native lowering,
performance/memory and non-Windows platforms remain unverified. Finite corpus
agreement cannot replace proof review or establish exhaustive binary64 conformance.
