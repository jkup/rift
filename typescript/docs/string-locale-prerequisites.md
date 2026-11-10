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
