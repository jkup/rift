# Exact BigInt conversion backend

The StringIntegerLiteral scanner accepts trimmed decimal integers (including
signs and leading zeros) and unsigned hexadecimal/octal/binary prefixes. Empty
trimmed strings represent zero. Invalid grammar returns null; guest-facing
callers will choose between SyntaxError and an unsuccessful comparison. Every
scanned digit and whitespace unit charges the current step budget.

Only validated digits are converted through host BigInt. Radix formatting uses
the pinned exact integer backend after validating radix 2–36. Tests use literal
expected integers and digit patterns, including values beyond 64 bits, rounding
at binary64 midpoints, overflow, signed division/remainder and shifts. Guest
BigInt values, operators and builtins are not yet exposed by this task.

The standalone test imports Realm for scriptc's value-import reachability rule.
Without it, a two-line normal-completion probe fails to lower
AsyncGeneratorCallable; adding the import passes. Original diagnostics and both
reduced probes are retained in build/bigint-conversion-draft/build. This is the
same opaque-type boundary already documented by the compiler contract.

Reference: [StringToBigInt and its grammar](https://262.ecma-international.org/16.0/#sec-stringtobigint).
