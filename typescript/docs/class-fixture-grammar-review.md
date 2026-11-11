# Recent class fixture grammar review

TS-462, 2026-11-11. Read-only review at `76ee3062`, while canonical Unicode
validation remains frozen. This checks the syntax of positive test inputs,
not their runtime results or full engine conformance.

The review extracted 117 complete source literals from five canonical tests:

| Test | Inputs checked |
| --- | ---: |
| class-empty-fields | 33 |
| class-field-initializers | 32 |
| class-static-blocks | 21 |
| base-classes | 24 |
| object-methods | 7 |

Extraction includes literal `passes(...)` arguments and the first positive
`for (const text of [...])` arrays in the initializer, static-block and base-class
tests. It excludes concatenated/generated sources, later arrays, negative tests,
and direct calls with other result expectations. The existing lexer decodes the
quoted literals; no source is evaluated by the extraction script. Each decoded
input is sent to an independent Node 26.13.0 `--check` process. The report records
input-file hashes, exact decoded source, source lines, extraction method and raw
process results.

115 inputs pass Node syntax checking. The only two failures are the accessor
newline cases already identified by TS-461, at lines 40 and 41 of the canonical
`test/class-empty-fields.ts`. The first splits `get` and `set` from literal
names; the second splits them from computed names. Both should be rejected.
TS-461 preserves these exact source strings while migrating their expectations
to rejection and removing the incorrect parser fallback. Its original source
and test results are retained in `build/private-class-before-accessor-fix/`.

No additional grammar contradiction was found in this bounded sample. This does
not validate unchecked sources or runtime assertions. The existing both-host
tests and independent semantic references remain necessary.

Evidence: `build/review-class-fixture-grammar.mjs` and
`build/class-fixture-grammar-review.json`. The correction follows the
[ASI rules](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-rules-of-automatic-semicolon-insertion)
and [method grammar](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-method-definitions).
