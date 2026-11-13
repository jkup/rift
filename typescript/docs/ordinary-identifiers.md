# Ordinary Unicode identifiers

Script lexing recognizes raw Unicode identifier characters and fixed/braced
Unicode escapes through the reviewed Unicode 17 tables. A shared scanner also
serves private identifiers. ASCII classification stays direct; decoded names are
not normalized, and token offsets retain the original UTF-16 spelling.

Word tokens record whether an escape occurred. Keyword recognition uses that
provenance, while binding/property identity uses decoded text. This keeps escaped
`async`, `let`, `of`, `get`, `set` and `static` names distinct from keyword syntax.
Reserved names, strictness, async/generator contexts and decoded constructor or
prototype names retain their existing checks. Word operators and directive
continuation also respect original spelling. Legacy lexing remains unchanged.

The focused test covers scanning, incremental tokens, source spans, private-name
agreement, malformed escapes, numeric adjacency, runtime name equality, source
preservation, bindings, properties, labels, modifiers and contextual restrictions.
All 170 independently reviewed grammar/execution controls pass under Node, as
do typechecking, the existing private-identifier lexer test and 35 runner tests.

The first full-regression launch lacked eleven historical transcript inputs in
the new draft. Those exact files were copied with hashes recorded; the failed
setup log is retained. Full Node regression passes 956/956 without skips with the restored inputs.
All 1070 source/control inputs are frozen. Focused native execution and all 170
reviewed controls pass on both hosts with static-only builds and zero dynamic
coverage. All 15 native tooling build gates and 296 tooling tests pass. Eight
escaped-name producer records per host pass the closed codec, and 16 records
pass parent envelopes. The isolated change is ready for integration after the
contextual-identifier milestone; combined acceptance and publication remain pending.

See `docs/ordinary-identifiers-review.md` for the grammar review and references.
No new syntax-error certification rule or historical fixture change is included.
