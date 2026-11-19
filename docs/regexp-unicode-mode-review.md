# Unicode RegExp integration review

TS-452, 2026-11-11. Review only; Unicode matching remains unsupported.

[Unicode matching](https://tc39.es/ecma262/multipage/text-processing.html#sec-regexpbuiltinexec)
uses code points internally while public match indices and lastIndex count UTF-16
units. Lone surrogates remain representable. Unicode ignore-case uses common and
simple mappings from CaseFolding.txt, not uppercasing, full folding or locale
conversion. Word characters also depend on this canonicalization. Unicode
syntax rejects legacy identity escapes, malformed escapes, invalid ranges and
quantified lookaheads that non-Unicode parsing may admit.

The pinned [engine262 exec implementation](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/RegExpPrototype.mts)
constructs code-point input and accumulated UTF-16 lengths, then translates
capture boundaries. This makes the two coordinate systems explicit. Rift can
instead retain its UTF-16 offsets and decode only at traversal boundaries,
avoiding an input-sized allocation. That is an implementation proposal requiring
tests, not evidence of equivalent behavior yet.

## Implementation sequence

First validate a pinned Unicode 17 common/simple case-fold table exhaustively on
both hosts. Keep the existing non-Unicode uppercase behavior separate. Include
Kelvin sign, long s, Ohm sign, sharp s, Turkish I and astral letters; never fold
one character into a multi-character string.

Then pass an explicit Unicode mode through constructor parsing, literal
validation and compilation. Decode raw pairs and the permitted escape pairs
without combining unrelated atom boundaries. The numeric character/range AST
can already hold astral code points. Keep property escapes and v-mode explicitly
unsupported until their own validators and matching semantics exist.

Update dot, character classes, search advancement, word boundaries and numeric
and named backreferences together. Backreference comparisons need independent
source/target code-point traversal, retaining UTF-16 capture spans. Charge
decoding, folding and range expansion through existing budgets. Reuse the
protocol helpers that already advance empty matches by code point, and test
matchAll, replace and split against real Unicode matchers.

## Required boundary decision

[ECMA-262 issue 128](https://github.com/tc39/ecma262/issues/128) remains open.
When manually supplied lastIndex points inside a surrogate pair, Node reports
the pair's leading index; the literal specification algorithm retains the
supplied index in parts of result construction. Record the intended compatibility
behavior and regression evidence before enabling this path. Do not silently
describe Node agreement as specification conformance.

The isolated reference program build/review-regexp-unicode-mode-reference.mjs
passes 24 matching, 15 syntax-rejection and three protocol/index checks.
Inside-pair observations are retained separately in its JSON report. No guest
execution is delegated to the reference engine. Full both-host feature suites,
native static/coverage checks and preserved legacy boundaries remain required.
