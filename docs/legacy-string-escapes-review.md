# Legacy string escape review

TS-515 checks 141 sources against explicit independent Node expectations: 75
valid and 66 invalid. Both current Rift hosts agree on every structured result.
Fourteen existing NUL/template controls execute correctly; 61 valid sources
remain unsupported. No valid source receives a false syntax certificate.

C++ implements the legacy numeric string escapes that TypeScript's Script lexer
currently rejects. The [string-literal grammar](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-literals-string-literals)
allows these forms in non-strict code and rejects them in strict code. Octal
consumption depends on the first digit; non-octal decimal escapes decode to the
corresponding digit character.

The controls verify exact code units, including `\377` → 255, `\400` → 32 then
48, `\777` → 63 then 55, and `\08` → 0 then 56. Bare `\0` remains valid in
strict code when the next character is not a decimal digit. Both quote forms,
octal boundaries, trailing digits and ordinary characters are retained.

Strictness must be applied after directive discovery. A legacy escape in an
earlier directive becomes invalid if a later raw `"use strict"` directive activates
strictness. Escaped spellings of that directive do not activate it themselves.
The review also covers inherited/function strictness, class fields/static blocks,
literal/computed property names, destructuring, direct/indirect eval, Function
and preservation of function source text.

Keep templates separate: untagged legacy escapes remain invalid; tagged forms
retain undefined cooked values and exact raw text. Six tagged controls already
pass both Rift hosts. Ordinary-string admission must not widen template grammar.

Implementation should preserve escape provenance on string tokens and check it
in the declaration collector's strict scopes, including literal object keys.
Dynamic-source SyntaxErrors need a closed certificate after complete supported
grammar/resource checks. Retain malformed-input precedence and legacy lexing.

Evidence: `build/legacy-string-escapes-review/` contains all sources, hashes,
explicit expected code units, independent results, both-host records and
`reviewed.json`. Native executable provenance and the canonical source snapshot
verify. No engine or historical fixture was changed.
