# Legacy numeric literal review

TS-513 checks 110 sources against explicit independent Node expectations: 58
valid and 52 invalid. Both current Rift hosts agree on every structured result.
Three existing modern-number/string-conversion controls execute correctly; the
other 55 valid sources reach explicit unsupported behavior. No valid source is
incorrectly certified as a syntax error.

C++ `src/frontend/lexer/lexer.cpp` handles legacy octal and leading-zero decimal
forms. TypeScript currently rejects them with `lex.leading-zero`. This is a
concrete syntax parity gap, independent of the remaining fixture failures.

## Required distinctions

The [numeric-literal grammar and early errors](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-literals-numeric-literals)
distinguish legacy octal integers from leading-zero decimal forms containing an
8 or 9. Both are invalid in strict code. Octal values use radix eight; the decimal
forms can continue into fractions and exponents. Separators are forbidden in
their leading-zero integer portion but allowed in valid decimal fractions and
exponents.

The controls establish examples and boundaries:

- `077` is 63, `078` is 78, and `08.1_2` is 8.12. `077.1`, `077e1`, legacy BigInt
  suffixes and integer-part separators are invalid.
- `077.toString()` is valid member access. Numeric object keys use the decoded
  numeric value; an object's method name is outside its own strict function body.
- Script/function directives, inherited strictness and class bodies need context
  checks. A later string expression does not retroactively create strict code.
- Direct eval inherits strictness; indirect eval and Function have their own
  source contexts. Rejection in strict dynamic source must become a catchable
  SyntaxError only through a sound, complete syntax audit.
- Number/string conversion and explicit `0o`, binary and hexadecimal literals
  retain their existing behavior.

## Implementation constraints

Preserve raw source spans and legacy-form provenance while decoding values.
Apply strictness to numeric property names and nested contexts as well as primary
expressions. Keep the existing numeric-separator audit intact: four invalid
controls already receive that certificate. Unsupported syntax elsewhere must
still prevent a whole-source certificate. Do not copy C++ behavior without the
independent grammar checks.

Evidence is in `build/legacy-numeric-literals-reviewed/`: original source text,
hashes, explicit outputs, fresh Node results, both-host records and `reviewed.json`.
The native diagnostic executable and canonical source snapshot were verified.
The initial review remains in `build/legacy-numeric-literals-review/`; one dynamic
Function control had malformed quoting and was corrected before the final replay.
No engine source or historical fixture changed. Implementation needs a successor
task after the whitespace draft is READY.
