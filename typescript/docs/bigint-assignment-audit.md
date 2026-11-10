# BigInt assignment error certification

BigInt literals now participate in the existing token-backed numeric assignment
audit. The parser records the original token for the audit-only literal tree;
the declaration collector verifies its kind, text, span and source location.
No retained executable tree is produced by this audit.

The supported assignment operators remain =, +=, -=, *=, /= and %=. Malformed
right-hand sides, conflicting declarations and other unsupported target forms
still block certification. This deliberately does not broaden the older audit
to update, exponentiation or logical assignment operators.

Tests cover decimal and radix literals, separators, exact token spans and line
locations, chained candidates, direct and indirect eval, and Function. Invalid
BigInt targets produce catchable guest SyntaxError before execution.

Reference: [assignment early errors](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-assignment-operators-static-semantics-early-errors).
The implementation extends the existing Rift certification path rather than
introducing a second parser or changing the historical audit corpus.
