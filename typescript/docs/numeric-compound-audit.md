# Numeric compound-assignment errors

The token-backed numeric assignment audit now covers every supported compound
assignment operator, including exponentiation, bitwise/shift and logical forms.
Number and BigInt literal targets retain their exact token text, spans and
locations. The complete parse and declaration audit still veto malformed source
or conflicts before producing a certified SyntaxError. Update expressions remain
outside this task.

Tests cover all added operators with Number and BigInt targets, direct/indirect
eval and Function, and demonstrate that the RHS does not execute. Historical G4
and G5 inputs remain byte-for-byte unchanged; only the current audit expectations
are migrated to eligible candidates. Frozen evidence is untouched.

The historical driver's first native build exposed the separate host BigInt AST
serialization limitation, repaired by TS-303. Initial failure evidence and the
post-repair native/static and both-host audit results are retained in build.

Reference: [assignment early errors](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-assignment-operators-static-semantics-early-errors).
