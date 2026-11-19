# RegExp range compilation cost

TS-533, 2026-11-13. The READY lookbehind successor reproduces an existing
ignore-case compilation cost on both hosts, without changing execution limits.

| Pattern and input | Expected | Node-hosted/native Rift |
| --- | --- | --- |
| `/[a-z]/iu.test('K')` | true | true |
| `/[\u{0}-\u{10ffff}]/iu.test('😀')` | true | execution-step limit |
| `/[\u{0}-\u{10ffff}]/u.test('😀')` | true | true |
| `/[\u0000-\uffff]/i.test('x')` | true | true |
| `/[^\u{0}-\u{10ffff}]/iu.test('😀')` | false | execution-step limit |
| `/\p{Any}/iu.test('😀')` | true | true |

An independent Node process confirms each expected result. The two failing
patterns are valid; their resource-limit classification is honest. The compiler
enumerates every member of an ignore-case range, charges a step and inserts its
canonical value into a Set. A full Unicode range has 1,114,112 members, so this
representation exhausts the ordinary execution budget before matching begins.
Process timings include startup and are retained only as observations, not a
throughput benchmark or a claimed speedup.

## Proposed bounded change

Keep wide Unicode ranges as intervals. The existing generated property backend
already stores complete equivalence groups for simple/common case folding.
Given a canonical input character, check whether any member of its group lies
inside the interval; if no group exists, test the character itself. This avoids
enumerating the interval. It also handles folded values outside its endpoints.
Do not fold only the endpoints: folding does not preserve numeric order.

This follows the existence test in
[CharacterSetMatcher](https://262.ecma-international.org/16.0/#sec-runtime-semantics-charactersetmatcher) and
[Canonicalize](https://262.ecma-international.org/16.0/#sec-runtime-semantics-canonicalize-ch).
Unicode matching uses simple/common folding; non-Unicode matching uses the
separate uppercase algorithm. Preserve the legacy path in this change rather
than applying Unicode groups to it. Negation stays outside range membership,
and scoped flags and backward cursor handling keep their existing semantics.

The implementation should add a small range-membership helper to the generated
Unicode backend and its generator, then use it for Unicode ignore-case ranges.
Retain charges for pattern parts and matching work. Prove the equivalence groups
against the pinned data, include range boundaries and non-monotonic folds, and
exercise mixed classes, negation, scoped flags, lookbehind and tight budgets.
Measure compile work before/after and check ordinary small-pattern matching for
regressions on both hosts. Full regression and static/zero-dynamic gates remain
required; no budget increase or source admission change is proposed.

The first interval-only candidate increased ordinary-pattern matching cost in
three alternating native comparisons: baseline medians were 7 ms per sample,
versus 8–8.5 ms for the candidate. Initial non-alternating runs had larger timing
variation and are retained. The revised design therefore keeps the existing Set
path for ranges of at most 256 code points and uses interval lookup above that
bound in Unicode mode. This caps per-range expansion while retaining the measured
small-range path; 256 is a conservative bound, not a claimed optimal threshold.
The full Unicode range then compiles in four charged steps, while ASCII and
non-Unicode counts remain unchanged. Revised alternating native comparisons have
eight of nine medians equal to baseline at 7 ms and one at 7.5 ms, with identical
semantic transcripts and charged matching work. No consistent small-pattern
slowdown remains in this sample; full regression acceptance is still pending.

Evidence: `build/regexp-range-cost-review/observations.json` retains all twelve
Rift observations, source hashes, expected outputs and the native executable
hash. `build/review-regexp-range-cost.mjs` produced the inputs and independently
checked their expectations. Canonical source and READY snapshots are unchanged.
