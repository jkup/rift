# String trimming

TS-091 adds Script trim, trimStart and trimEnd with one shared implementation.
Each coerces its receiver with the string hint, ignores extra arguments and scans
only the requested ends. Every removed code unit consumes a guest step. Retained
text is sliced once. All ECMAScript whitespace code points fit in one UTF-16 unit;
surrogates and supplementary characters are preserved without normalization.

The existing numeric-conversion whitespace predicate now lives in strings.ts and
is shared with trimming. Its membership is unchanged: whitespace plus line
terminators, including NBSP and BOM, excluding U+0085, U+180E and U+200B.
Legacy builtin registration is unchanged. Annex B trimLeft/trimRight aliases
are outside this task.

References: [TrimString](https://tc39.es/ecma262/2023/multipage/text-processing.html#sec-trimstring)
and src/builtins/string/string.cpp at base 31525b3d. Tests cover all 25 accepted
characters, excluded neighbours, lone surrogates, generic conversion, ignored
arguments, empty and interior whitespace, metadata and bounded long scans.
Acceptance evidence is recorded in TASKS.md and COORDINATION.md.
