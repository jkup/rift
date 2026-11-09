# Number bitwise and shift operators

TS-123 adds Script `~`, `&`, `|`, `^`, `<<`, `>>`, `>>>` and their compound
assignment forms. BigInt and logical assignment remain unsupported; the legacy
parser keeps its existing boundaries.

The precedence table places bitwise OR/XOR/AND below equality and shifts between
relational and additive expressions. Unary/update operands remain above
exponentiation, including its unparenthesized-unary-base restriction. Longest
match handles four-character unsigned-shift assignment before shorter tokens.

Guest evaluation, numeric coercion and reference handling reuse the existing
arithmetic path. Both binary operands are evaluated before left-to-right numeric
conversion. Compound forms capture one reference and old value before evaluating
the RHS, then write once. No guest operation is delegated to host source execution.

After guest conversion, host numeric operators provide 32-bit wrapping and shift
counts modulo 32. Expected-result tests exercise this on Node and native scriptc,
including NaN/infinities, signed zero, fractions, negative/large shift counts,
signed and unsigned boundaries, and numbers outside the 32-bit range. No compiler
workaround was needed in the focused native build (7286/7286 statements static).
Tests also cover key/get/RHS/set order, rebound bases, abrupt hooks, const writes,
foreign error Realms and resource limits.

Sources consulted 2026-11-09:
[Number shifts and bitwise operations](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-leftShift),
[expression grammar](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-bitwise-shift-operators),
and [V8 token precedence](https://github.com/v8/v8/blob/main/src/parsing/token.h).
Rift keeps its existing precedence parser and explicit completion records.
No engine source was copied.
