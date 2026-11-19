# Private identifier lexing

TS-459 recognizes Script private-identifier tokens and keeps their decoded name
and original UTF-16 source span separate. Names use the reviewed Unicode17
ID_Start/ID_Continue tables, with dollar and underscore support. Unicode escapes
contribute individual code points; fixed surrogate escapes cannot be combined
into an identifier character. Names are not normalized. See the specification's
[Names and Keywords](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-names-and-keywords).

Raw text is copied in spans; only escaped segments require decoding. Scanning
remains bounded by the lexer's existing100000-unit source limit. Comments,
strings, templates, punctuation and incremental token boundaries retain their
existing paths. Legacy lexing still rejects private identifiers.

This does not admit private declarations, references or brand tests to execution.
Malformed tokens retain unsupported-syntax classification until the private
syntax/early-error audit is implemented. Complete-class declaration validation,
private environment capture and execution remain separate prerequisites.

Tests cover raw/escaped ASCII and Unicode, astral and combining characters,
joiners, malformed escapes, surrogate halves, source positions, incremental
scanning, source limits and explicit parser boundaries. Both-host and combined
acceptance remain pending.

Independent Node26.13.0 syntax references cover25 accepted/rejected private names, including escaped surrogate-pair rejection. Inputs and outcomes are retained in build/private-identifier-reference.json.
