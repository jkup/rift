# Unique named RegExp captures

TS-446 implements the first increment from the TS-445 named-capture review.
Unique ASCII names share existing numbered capture slots. The parser retains
ordered name/index metadata and validates forward references after parsing.
Compilation resolves names to existing backreference instructions; matching,
backtracking, lookahead and repeat clearing retain their current paths.
Numeric-reference counting includes named groups.

Exec creates null-prototype groups objects from existing numbered values. Named
indices reuse numbered pair objects, preserving identity and defining-Realm
array allocation. Replacement, matchAll and split use their existing protocols.
Name scanning, resolution and result construction charge current resource budgets.

Escaped and non-ASCII names, duplicate names, legacy k escapes, lookbehind,
Unicode matching and modifiers remain explicitly unsupported. Valid duplicate
names in disjoint alternatives must not be certified as syntax errors. Full name
validation and duplicate-name participation are separate reviewed follow-ups.

Focused tests cover numbering, forward/unmatched references, capture clearing,
backtracking, property safety, indices identity, replacement callbacks/templates,
matchAll/split, foreign builtin allocation, invalid names and resource stops.
Historical named-group inputs are retained as positive tests. Both-host and
full-suite acceptance remains pending.
