# Disjoint duplicate capture names

TS-451 implements the participation rule reviewed in
regexp-duplicate-names-review.md. Equal decoded names are legal only when
different alternatives of a shared enclosing disjunction separate their group
specifiers. Parser-local paths are copied when each name is declared and are
discarded before compilation. All path comparisons charge the parser budget.

Named backreferences compile their numeric capture indices once. Matching scans
those indices with budget checks and uses the participating capture, or matches
the empty string when none participated. Numeric references keep their existing
instruction. More than one participating capture is an internal invariant error.

Result groups retain first-definition property order, publish the participating
value and reuse its numbered index pair. Unmatched later alternatives cannot
overwrite an earlier participating capture. Repeat clearing and assertion
backtracking continue to operate on numbered capture storage.

Tests cover constructor and literal paths, structural syntax errors, decoded
Unicode equality, forward and empty references, repetition, lookahead,
backtracking, replacement, matchAll, special keys, property order and every
budget cutoff in a representative parser/compiler/matcher path. Earlier source
inputs are retained with their newly certified outcomes. Unicode matching flags
and lookbehind remain unsupported. Isolated and combined acceptance are pending.
