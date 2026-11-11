# Current Script starter-corpus diagnostic

TS-491, 2026-11-11; Node-hosted Rift at the frozen zoned Temporal integration.
All 33 pinned files and their 60 metadata-required variants remain represented.
Exact input blobs, metadata and harness hashes are validated through the existing
input planner. Each harness file is evaluated as its own Script in the test Realm;
the test body is a separate Script. Parse-negative cases are prepared without
executing the harness or body. Strict directives are prepended only to the strict
test variants; raw bodies are unchanged.

| Diagnostic outcome | Variants |
| --- | ---: |
| Expected outcome observed | 52 |
| Unsupported syntax provenance | 5 |
| Unsupported execution profile | 3 |
| Unexpected outcome, timeout, harness error or host fault | 0 |

These are diagnostic observations, not admitted conformance passes. Capability
admission remains unchanged. The three profile limitations are the module case
U04 and both async-harness variants of U08; they were retained, not executed as
ordinary synchronous Scripts.

The five syntax records are concrete classification follow-ups:

- S20, both modes: top-level return has parse.return-context provenance. The
  legacy parser's complete return audit does not apply to bounded Script parsing.
- U02, both modes: an async declaration used directly as a while body has
  parse.declaration-statement provenance.
- U03, raw: strict-mode var public has parse.binding-identifier provenance.

Each currently reports SyntaxError but carries unsupported-syntax provenance,
so it cannot count as a certified negative test. Any fix must validate the full
supported grammar, preserve first-error/unsupported/resource precedence, retain
historical inputs and cover valid neighboring programs. Changing only the report
classifier would conceal the missing parser certification.

An initial diagnostic incorrectly read an obsolete proto field instead of
GuestObject.getPrototypeOf(), misclassifying five genuine ReferenceErrors.
The corrected run verifies GuestError branding and exact Realm error-prototype
identity. Both reports and the initial worker are retained; no engine change was
needed for these five runtime-negative controls.

Evidence: build/current-starter-script-diagnostic/ (initial),
build/current-starter-script-diagnostic-corrected/ (corrected), and the producing
build/diagnose-current-starter-script*.mjs and
build/diagnose-starter-script-worker*.mjs helpers. Native reproduction and
independent diagnostic controls remain pending before closing this review.
