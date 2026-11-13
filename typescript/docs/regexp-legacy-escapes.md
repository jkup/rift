# Legacy RegExp character escapes

Non-Unicode patterns support legacy octal, identity and control escapes. Numeric
escapes outside classes use the complete capture count to choose a decimal
backreference. Unavailable references fall back from the first digit: leading
octal digits 0–3 consume at most three digits, 4–7 consume at most two, and 8/9
are identity characters. Character classes always use character-escape semantics.
Strict JavaScript source retains these non-Unicode pattern rules.

Digits and underscore after `\c` produce controls inside classes. Malformed
controls otherwise preserve the literal backslash and leave `c` to be parsed
as the next atom, including its quantifier. Whole-pattern named-capture detection
governs identity `\k`; named references and Unicode-mode syntax checks remain
distinct. The existing parser budget charges speculative decimal scanning and
fallback consumption, with no refunded work.

The focused tests check matching, digit boundaries, forward references, named
references, class and quantifier behavior, every smaller parsing budget for
representative patterns, and retained Unicode/unsupported boundaries. All 122
reviewed controls pass on both hosts. All 15 native tooling builds, 296 tooling
tests, 35 runner tests and producer/envelope checks pass. The first full Node
run passed 958/961; its three failing historical tests rejected newly supported
escapes. Fifteen expectations across twelve original patterns were reviewed on
old/new Rift hosts and against an independent reference. Only those three tests
were amended after tooling passed; production code and original reports retain
their hashes. Full Node regression passes 961/961 without skips, and all three
amended tests pass native execution and static coverage. The isolated feature
passes canonical combined lexical acceptance.
Unicode sets mode, lookbehind, legacy class-range extensions and quantified
assertions remain outside this feature.

Semantics follow the [ECMAScript Annex B pattern grammar](https://tc39.es/ecma262/multipage/additional-ecmascript-features-for-web-browsers.html#sec-regular-expressions-patterns).
The original sources, reference outcomes and C++ differences remain in the
legacy escape boundary review. The C++ executable is reference evidence, not
the semantic definition.
