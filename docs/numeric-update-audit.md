# Numeric update-target errors

Prefix and postfix ++/-- now share the token-backed assignment audit. The helper
records only Number/BigInt literal targets, and the existing collector verifies
source spans and complete grammar/declaration coverage before certification.
The ordinary parser is unchanged outside this audit mode.

Tests cover grouping, line breaks and ASI, malformed suffixes, source conflicts,
exact locations and direct/indirect eval and Function. No preceding statement
executes when the invalid update is certified. Historical U12 and U14 sources
are retained with explicit current-expectation migrations. All 102 historical
audit inputs pass in both orders on both hosts; full Node passes 794/794 and
focused native static/zero-dynamic checks pass.

Reference: [update-expression early errors](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-update-expressions-static-semantics-early-errors).
