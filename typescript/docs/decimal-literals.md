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
exponents. Legacy parsing is unchanged. TS-075 adds [radix literals](radix-literals.md);
numeric separators, BigInt and legacy leading-zero forms remain unsupported.

Both guest suites pass 496/496, runner30 and probes10 pass. All 87 native entries pass build and static coverage in one invocation; decimal driver4975/4975 static. Initial Node494/496 exposed two stale exponent rejection expectations, corrected before the passing rerun. Both full tooling attempts pass289/290; the sole failing assignment-audit group had stale exponent and leading-dot rejection expectations. Its corrected focused rerun passes all rows in both hosts and input orders, accounting for all 290 checks without claiming a single green full invocation. Historical matrices remain unchanged. All 225 C++ fixture results agree across hosts: 66 reported successes, 30 unchecked completions, 55 parse errors, 72 runtime errors and two reported failures. All 96 previously successful or unchecked files retain their outcomes. The Math fixture advances to its later hexadecimal literal. Reports: build/legacy-suite-node-ZajkAj/report.json and build/legacy-suite-native-7CFWcf/report.json. Logs: build/decimal-literals-*.
