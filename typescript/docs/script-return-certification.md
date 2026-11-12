# Bounded Script return certification

TS-492, isolated implementation, 2026-11-12. Bounded Script preparation certifies
`return-outside-function` when its original failure is `parse.return-context`
and a fresh, complete supported-grammar parse finds the same first invalid
return. Unsupported syntax, resource failures or competing certification failures
retain the original rejection. The audit produces no executable plan. Public
declaration planners and the legacy parser are unchanged.

The [Script grammar](https://tc39.es/ecma262/2024/multipage/ecmascript-language-scripts-and-modules.html#sec-scripts)
disables Return. Function bodies enable it; class static blocks disable it again,
including inside an enclosing function. The implementation reuses these parser
contexts. Script observation admits the existing return-outside-function wire
rule; unknown rules and wrong phases remain rejected.

## Semantic evidence

- All 42 focused controls pass both hosts: 26 invalid returns, nine valid neighbors
  and seven unsupported/resource precedence cases. Native compilation reports
  20,280 static statements and zero dynamic operations.
- Unchanged pinned S20 bytes certify in both Script modes on both hosts, preserving
  diagnostic locations and causing no guest effects. The native probe reports
  20,259 static statements and zero dynamic operations.
- The original eval input `try{eval('return 1')}catch(e){true}` is preserved. Its
  expectation changes from fatal unsupported operation to normal true:
  [PerformEval](https://tc39.es/ecma262/2022/#sec-performeval) parses a Script and
  throws SyntaxError for invalid syntax. Direct, indirect, caller-function,
  foreign-Realm, no-effect and unsupported-tail controls pass both hosts;
  native coverage is 20,313 static statements and zero dynamic operations.

## Regression evidence

The final Node suite passes 950/950 guests without skips after the observation
repair. All 35 runner tests pass. Fifteen native tooling drivers pass: six were
rebuilt for the observation change, and nine retain results only after checking
their compiler-resolved source hashes. Eight codec controls per host and sixteen
parent-envelope controls pass. All 296 tooling tests pass outside the sandbox; final ownership checks
are pending; combined native milestone acceptance remains separate.

Initial failures are retained in the draft build directory: a missing unchanged
historical replay input, the old eval expectation, and the observation producer's
unreviewed-rule guard. The sandboxed tooling attempt retains its filesystem
permission failures. Historical validation files were copied unchanged for tooling
prerequisites; redundant copies may be removed after readiness with hash checks.

Evidence lives under build/script-return-certification-draft/build/ and
build/script-return-certification-*. Source inputs are frozen for validation.
This change does not admit additional Test262 capabilities or claim corpus-wide
conformance. Async declarations in Statement position and strict reserved-word
bindings remain separate follow-ups.
