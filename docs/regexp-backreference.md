# Numeric RegExp backreferences

Valid numeric backreferences compile to an instruction that compares the current
input with the capture's UTF-16 span. Forward or unmatched captures succeed
without consuming input. Existing backtracking snapshots and repeated-group
capture clearing are reused. Ignore-case comparisons apply the existing
non-Unicode canonicalization to both code units.

A capture-count scan runs once, only when numeric reference syntax needs it.
It ignores escaped parentheses and character classes and charges work. Decimal
reference parsing saturates above the capture count. Matching charges each
comparison. Neither path invokes host RegExp.

Out-of-range decimal escapes and numeric character-class escapes still require
the separate legacy escape grammar. Named references/groups, lookaround and
Unicode modes remain explicitly unsupported. Exact historical (a)\1 constructor,
parser and literal cases are migrated from unsupported to supported.

Tests cover forward/self references, unmatched captures, backtracking, repeated
capture clearing, ten-group references, escaped/class parentheses, case folding,
surrogates, indices, sticky/global execution, replace and matchAll, and budgets.
The focused native/static check and full 795-case Node suite pass; combined
acceptance remains separate.

References: [BackreferenceMatcher](https://tc39.es/ecma262/2025/multipage/text-processing.html#sec-backreferencematcher)
and [engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/RegExp.mts).
The pinned matcher confirms empty unmatched captures and canonicalized comparisons;
Rift retains its instruction-based, budgeted matcher.
