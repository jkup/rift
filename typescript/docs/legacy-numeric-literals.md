# Legacy numeric literals

Script scanning admits legacy octal and leading-zero decimal numbers while
preserving raw UTF-16 spans and legacy-form provenance. Octal token values use
the existing explicit-radix number conversion. Decimal fractions and exponents
retain their separator rules; legacy integer portions and BigInt suffixes do not.
Legacy-parser behavior and Number/string conversions remain unchanged.

The declaration collector checks token provenance in the correct strict scope,
including numeric property names, class bodies and nested functions. Legacy
numeric object keys retain literal nodes so their source locations survive
collection. Supported strict violations use the closed strict-legacy-number
certificate only after full grammar/resource checks; eval and Function then
produce guest SyntaxErrors through the existing preparation path.

Typechecking, focused native execution, all 110 reviewed controls on both hosts,
35 runner tests and eight Node producer-codec records pass. The first control
replay exposed lost provenance in numeric object keys; that report is preserved
and the corrected replay passes. Final validation passes 958 Node guests without
skips, 15 native tooling gates, all 296 tooling tests, eight producer records per
host and 16 parent envelopes. Integration and combined acceptance remain pending.
The initial full Node run passed 956/958: the retained `console.log(01)`
fixture now succeeds, and the retained `1_; 01;` separator case can complete its
audit. Both exact expectation migrations were reviewed on old/new Node/native
hosts; strict mode retains its veto. The new snapshot changes only those test
expectations, with production code unchanged. Initial reports and snapshots are
preserved. See docs/legacy-numeric-literals-review.md for the reviewed boundary.

The first tooling run passed 295/296 and exposed a numeric-assignment audit
invariant: decoded octal token text was being compared with raw source bytes.
Audit candidates now retain the raw spelling and verify it against the same
token, including its explicit octal normalization. Focused controls cover octal,
leading-zero decimal and modern octal targets and their strict-scope vetoes.
The 102 historical assignment inputs retain their original bytes; only G2
(`01=7;`) changes from a lexer limitation to an assignment-target certificate.
The original failure, source snapshot and native executables are retained in
`build/before-assignment-token-fix/`. Corrected full validation passes, including
all 102 retained assignment inputs on both hosts with exactly the reviewed G2
change. The isolated source is READY; promotion requires predecessor acceptance.

Six additional property-name/source controls pass both Rift hosts. Two preserve
explicit differences from Node 26.13.0: Node infers the name `08` instead of `8`
and uses `08` as an accessor key. Rift follows
[numeric property-name evaluation](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-object-initializer-runtime-semantics-evaluation),
which converts NumericValue to a string, and passes that key to NamedEvaluation.
The exact Node outputs and expected Rift outputs are retained separately in
`build/legacy-numeric-key-controls/`; this is not claimed as complete Node agreement.
