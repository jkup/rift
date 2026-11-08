# Decimal literals

TS-074 extends Script decimal literals with leading-dot fractions and `e`/`E`
exponents, including optional exponent signs. Every exponent requires digits;
whitespace cannot split a literal. Token text and source spans remain exact.
The parser's existing numeric conversion handles values and numeric property
names. Unary minus retains its separate role, including negative underflow zero.

This follows the [decimal literal grammar](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-literals-numeric-literals).
The C++ lexer was consulted for exponent validation; its documented leading-dot
limitation is not copied. Tests cover raw spans, property keys, member access,
operator boundaries, rounding, subnormals, overflow, underflow and malformed
exponents. Legacy parsing is unchanged. Radix literals, numeric separators,
BigInt and legacy leading-zero forms remain unsupported.

Acceptance pending.
