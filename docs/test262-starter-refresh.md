# Starter Script diagnostic refresh

TS-535 reviewed the accepted matcher/species implementation using the same 33 pinned
files and 60 variants. Both hosts produce expected outcomes for all 57 executable
variants, with the same three module/async-profile exclusions. Structured results
agree; no files were admitted as conformance passes.

All 17 original diagnostic control sources remain intact. The lookbehind control
still asks for a parse SyntaxError, but its valid source now correctly produces
an unexpected-outcome diagnostic. Independent Node parsing confirms the source
is valid. Two additional controls check a successful lookbehind match and the
still-unsupported Unicode sets flag. All 19 controls pass on both hosts.

The original failed reports, exact expectation migration, independent reference
and static-only/zero-dynamic probe evidence are retained under
`build/starter-species-final-reviewed.json`. The probe's engine sources match
the accepted matcher/species implementation. These diagnostic outcomes do not establish
a Test262 conformance score or expand async/module profile admission.

## Earlier scoped-modifier diagnostic (TS-525)

TS-525, 2026-11-13. The unchanged TS-491 selection still contains 33 pinned files
and 60 variants. Replanning reproduces the original selection exactly, including
metadata and harness hashes. The hash-verified scoped-modifier diagnostic probe
uses the original typed diagnostic driver unchanged and passes static-only
compilation with zero dynamic operations.

Both hosts now produce the expected outcomes for all 57 executable variants,
up from 52. Full structured results agree. The five changes are certified
preparation errors with no harness or body execution:

| Input | Variants | Syntax rule |
| --- | --- | --- |
| S20, top-level return | strict and non-strict | return-outside-function |
| U02, async declaration as a while body | strict and non-strict | async-function-statement |
| U03, strict reserved binding | raw | strict-reserved-identifier |

These close the parser gaps identified in the [earlier diagnostic](test262-current-script-diagnostic.md).
The module variant U04 and both async-profile variants U08 remain excluded from
this synchronous Script diagnostic. All 60 variants remain in the denominator.
No capability admission or conformance classification changes were made.

Seventeen controls per host distinguish genuine error brands, wrong error types,
missing throws, certified syntax errors, unsupported lookbehind, resource limits,
harness failures, job failures and separate-Script strictness. The original
`return;` control now expects its independently reviewed certified SyntaxError;
its source is unchanged. A separate lookbehind control preserves an unsupported
syntax check. Other original control expectations are unchanged.

Evidence is retained in `build/starter-script-refresh-final-reviewed.json`,
the two lane reports and `build/starter-script-refresh-source-freeze.json`.
The original reports and all fixture/harness bytes are preserved. This is
isolated diagnostic evidence; it does not accept the pending lexical or modifier
milestones, expand async/module support, or establish a conformance score.
