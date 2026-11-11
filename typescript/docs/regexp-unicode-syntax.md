# Unicode RegExp syntax prerequisite

TS-454 adds an internal Unicode mode to parseRegExpSyntax; the default remains
the existing non-Unicode grammar. Constructor and literal admission of u/v flags
remain disabled until matching and public index semantics are integrated.

Raw surrogate pairs and permitted fixed-width escape pairs become code-point
atoms. Braced Unicode escapes allow values through 0x10FFFF, including lone
surrogates. Raw/escaped halves and braced surrogate halves remain separate atoms.
Named captures share the same Unicode escape decoder and retain their existing
identifier checks in either mode.

Unicode parsing rejects legacy identity, numeric and control escapes, malformed
hex/Unicode escapes, bare delimiters, incomplete quantifiers, character-class
ranges with non-character endpoints and quantified lookaheads. Property escapes
and lookbehind stay explicitly unsupported. This does not introduce a partial
property-name validator or delegate pattern parsing to the host.

Tests inspect code-point atoms, ranges and capture references; preserve default
legacy behavior; and check every budget cutoff in representative decode/name
paths. Public Unicode admission remains explicitly tested as unsupported.
The matcher still consumes code units; this parser mode must not be passed into
guest execution before the reviewed matcher integration. Isolated acceptance
and combined validation remain pending.

The isolated reference classification checks 480 generated patterns: 173 ready,
281 syntax errors and 26 explicitly unsupported, with no contradictions against
Node. Evidence is retained in build/regexp-unicode-syntax-reference.json.
