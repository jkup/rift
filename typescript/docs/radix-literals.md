# Radix integer literals

TS-075 adds Script `0b`/`0B`, `0o`/`0O` and `0x`/`0X` literals. Prefixes require
at least one valid digit. Invalid digits, identifier suffixes, separators and
BigInt suffixes are rejected. Raw token spelling and source spans are preserved;
the parser's existing Number conversion provides binary64 rounding after lexing.
Numeric property keys use the same conversion, and unary minus stays separate.

This follows the [numeric literal grammar](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-literals-numeric-literals).
The C++ lexer was consulted. Its treatment of BigInt suffixes as ordinary Numbers
is not copied. Tests cover each radix and prefix case, malformed inputs, property
keys, member access, operators, rounding ties, overflow, negative zero and raw
spans. Legacy parsing, separators, BigInt and legacy octal remain separate.

Acceptance pending.
