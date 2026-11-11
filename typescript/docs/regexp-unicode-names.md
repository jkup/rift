# Unicode RegExp capture names

TS-449 extends the reviewed named-capture path with Unicode 17 identifier
properties and Unicode name escapes. Literal astral pairs, fixed-width escape
pairs and braced code points decode to the same UTF-16 name used by capture
metadata, references, exec groups, indices and replacements. Names are not
normalized or case-folded. ECMAScript's $, _, ZWNJ and ZWJ rules are applied
separately from the generated ID_Start/ID_Continue tables.

A fixed-width escaped lead surrogate combines only with a following fixed-width
escaped trail surrogate. Raw pairs combine separately; mixing raw and escaped
halves or braced surrogate escapes does not manufacture a valid identifier.
Malformed escapes, invalid identifier positions and out-of-range code points
produce syntax errors. Each consumed source unit charges the parser budget.
Duplicate decoded names remain explicitly unsupported pending participation
analysis. This does not enable Unicode matching flags or lookbehind.

The property table is copied from the TS-447 exhaustive both-host review; only
its provenance comment changes. Source and license: unicode-identifiers-review.md
and unicode-license.txt. Twenty-four independent Node reference cases verify
accepted names and rejected escape combinations. Guest tests exercise both
constructor and literal paths, groups/indices identity, forward references,
replacement/matchAll, distinct non-normalized names and resource stops.
Historical Unicode-name inputs remain as positive tests. Combined acceptance
is pending.
