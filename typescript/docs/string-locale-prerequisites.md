# String locale prerequisites

TS-195, pinned scriptc 0.4.7 / Windows x64, 2026-11-10.
No guest String methods are registered by this review.

Explicit Turkish case mapping, Greek final sigma and German sharp-s expansion
pass both hosts with four static statements and zero dynamic coverage.
Default comparison smoke checks also pass. Explicit comparison locales/options
have no native lowering (SC2020); the initial complete probe therefore fails.

The broader default comparison check fails every canonical-equivalence example
in [ECMAScript 2025 localeCompare](https://262.ecma-international.org/16.0/#sec-string.prototype.localecompare):
Angstrom sign/decomposed A-ring, Ohm sign/Omega, reordered combining marks in two
examples, and decomposed/composed Hangul. Node returns zero for all five; native
returns 1, 1, 1, -1, -1. The reduced probe compiles statically with zero dynamic.
Its initial nested-literal inference error was removed by spelling the same
five calls with explicitly typed parameters; both reports are retained.

Pinned scr_string.c, scr_coll_compare_lists and scr_str_locale_compare, falls
back to code-point comparison for uncovered characters. Successful ASCII and
accent smoke tests do not establish canonical equivalence or a consistent
ordering across the full String domain. Do not expose this host comparison as
a conforming guest localeCompare implementation without a reviewed provider.

ECMAScript 2025 permits a non-Intl implementation to leave the reserved
locale/options parameters unused. That does not waive canonical equivalence
or comparator consistency. engine262 at 18cdeb03 uses normalized comparison;
its implementation was consulted, not treated as proof of this host boundary.
Casing remains a possible separate feature. A broader Intl implementation or
a reviewed comparison backend is required before claiming locale support.

Evidence: build/string-locale-review/{methods,casing,comparison,canonical}.ts,
results.json, reduced-results.json, canonical-results.json and
canonical-initial-results.json. Compiler versions and frozen corpus stay intact.

## Normalization provider review (TS-440)

On 2026-11-11, the pinned host String.normalize backend passed 12 targeted
normalization checks on both hosts, with all 16 analyzed statements static.
It then passed all 20,034 rows of Unicode 17's NormalizationTest, exercising
all 20 prescribed relationships per row and the unchanged-code-point invariant
for every code point absent from Part 1. Both hosts report 4,788,784 checks and
zero failures. The additional code-point loop includes unassigned values and
lone surrogates, beyond the file's assigned-code-point requirement.

Input: https://www.unicode.org/Public/17.0.0/ucd/NormalizationTest.txt,
SHA-256 5019ffd530751a741900c849c0e010332f142a3612234639bd200b82138a87db.
Evidence: build/string-normalization-review/{normalization.ts,results.json,
conformance.ts,conformance-results.json}. Both probes use static-only builds and
the parsed zero-dynamic coverage gate; the full input stays in the ignored review
directory with its copyright and license notice intact.

This supports a separately validated String.normalize implementation. It also
offers a route to a deterministic non-Intl comparator: normalize both strings
to NFC, then use the engine's UTF-16 comparison. engine262 StringPrototype.mts
at 18cdeb03c363eb31d775648a0d070bdc8a26ced1 uses this arrangement. This is a
locale-neutral ordering policy, not language-specific collation. It avoids the
known host localeCompare failures without weakening canonical equivalence.
No guest method is enabled by this review.
