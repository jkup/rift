# Script string escape sequences

TS-134 extends ordinary Script string literals with backspace, form feed, vertical tab, NUL (not followed by a digit), identity escapes, two-digit hex, four-digit Unicode and braced Unicode code points. Backslash line continuations consume LF, CR, CRLF, U+2028 or U+2029 without adding a string unit. Legacy lexing is unchanged; decimal and legacy octal escapes remain unsupported.

Templates and ordinary strings share the existing bounded hexadecimal scanner and UTF-16 encoding helper. Braced values are limited to 0x10ffff; surrogate values remain valid string code units. Fixed-width escapes require exactly their prescribed digits. Invalid strings block whole-source preparation before declaration or execution effects.

Token values are decoded while offsets, locations and function source text retain the original spelling. Directive recognition still examines raw source: escaped spellings of use strict do not enable strict mode. No host source evaluation or JSON decoding is used.

References consulted 2026-11-09: [String Literals](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-literals-string-literals) and V8's [scanner.cc](https://github.com/v8/v8/blob/main/src/parsing/scanner.cc), especially fixed-width and bounded Unicode scanning. Rift reuses its template scanner and continues to reject Annex B numeric escapes rather than adding contextual octal tracking in this slice.

Focused tests cover code-unit boundaries, supplementary and lone-surrogate values, identity escapes, quotes/backslashes, line continuations and diagnostic locations, raw function source, escaped directives, property names, malformed forms and source limits. Full acceptance is pending.
