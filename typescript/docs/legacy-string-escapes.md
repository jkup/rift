# Legacy string escapes

Script string scanning decodes legacy octal and non-octal decimal escapes and
retains their provenance. Octal consumption stops after three digits for initial
0–3 and two for initial 4–7; 8 and 9 decode to their digit characters. Bare NUL
without a following decimal digit remains valid in strict code. Raw source spans,
legacy parsing and template escape handling are preserved.

The declaration collector checks both numeric and string legacy literals after
strictness is established. Earlier prologue strings, inherited strictness,
class bodies and literal property keys are included. Whole-source grammar and
resource checks precede the closed strict-legacy-escape certificate. This lets
eval and Function report catchable guest SyntaxErrors through existing paths.

The behavior follows the [string literal grammar and early errors](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-literals-string-literals).
All 141 reviewed controls pass on both hosts. Full Node regression passes
959/959 without skips, with 35 runner tests, 15 native tooling gates and 296
tooling tests passing. Eight producer records per host and 16 parent envelopes
pass. Integration and combined acceptance remain pending. Original controls and expected code
units are retained in build/legacy-string-escapes-review.

The initial full Node regression passed 958/959. The older string-escapes test
still rejects five now-supported literals: `\01`, `\08`, `\1`, `\8` and `\9`.
Their exact original preparation inputs, decoded values and strict-mode vetoes
were reviewed on old/new Node and native hosts with independent expectations.
Evidence is retained in build/legacy-string-migration/reviewed.json. The test-only
expectation update was applied after all 296 tooling tests passed. Only the
standalone historical test changes; production code is unchanged. Original
snapshots and reports retain their identity. Full Node regression and the
separate native compilation/execution of the amended test pass. The source is
accepted after integration and combined lexical validation.
