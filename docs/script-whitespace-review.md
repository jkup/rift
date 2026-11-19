# Script whitespace review

TS-510 checks 146 sources against explicit syntax and output expectations in
independent Node and both Rift hosts. Of 138 valid sources, Rift executes 81
correctly and reports 57 as unsupported lexical input. Eight excluded characters
remain rejected. Both Rift hosts agree on every structured result.

The missing cases are 19 whitespace characters in three contexts each: token
separation, return expressions and strict directives. They are VT, FF, NBSP,
U+1680, U+2000–U+200A, U+202F, U+205F, U+3000 and BOM. C++ already accepts VT
and FF through its whitespace scanner. Rift's existing `isStringWhitespace`
helper recognizes the complete required set, including line terminators.

The [ECMAScript lexical rules](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-white-space)
define whitespace using TAB, VT, FF, BOM and Unicode Space_Separator characters.
The four line terminators are LF, CR, LS and PS. Other characters with Unicode's
White_Space property are not automatically valid Script whitespace.

Reuse the existing predicate for Script token separation while retaining the
lexer's separate line-terminator handling. Whitespace must not trigger return
ASI or end a line comment; line terminators must. Preserve string/template
contents, UTF-16 offsets, CRLF accounting and legacy lexing.

The controls cover all 21 whitespace characters in tokens, return statements,
comments, strings, templates and directives; four line terminators in tokens,
returns and comments; and eight excluded near-neighbors. Seven additional
position checks verify the currently supported separators and CRLF accounting.
All 57 missing cases retain `unsupported-syntax` / `lex.character` provenance;
none is incorrectly certified as a syntax error.

Evidence is retained in `build/script-whitespace-review/`, including original
sources, independent reference results, both-host records and `reviewed.json`.
This review changes no engine source. Implementation should follow the ordinary
identifier task in an isolated draft, with focused both-host tests and existing
regression and static-compilation gates.
