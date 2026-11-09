# Numeric separators

TS-138 admits separators between digits in Script decimal and radix literals. The digit scanner checks the current radix and both neighboring digits; leading-zero decimal integer parts retain their existing restrictions. Fractions and exponents allow separators independently. Malformed positions continue to fail during whole-source preparation.

Tokens retain raw spelling and spans. The parser removes separators only when converting an already validated numeric token or numeric property key. Function source, identifiers, string-to-number conversion, JSON and legacy parsing are unchanged.

References consulted 2026-11-09: ECMAScript [numeric literal grammar](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-literals-numeric-literals) and V8 [ScanDigitsWithNumericSeparators](https://github.com/v8/v8/blob/main/src/parsing/scanner.cc). Rift shares one bounded digit loop across decimal parts and radix forms, without changing the numeric conversion backend.

Acceptance pending. Historical radix/decimal rejection rows retain their sources with explicit updated expectations for newly supported forms.
