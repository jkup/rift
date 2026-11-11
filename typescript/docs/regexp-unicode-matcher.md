# Unicode matcher prerequisite

TS-455 adds an explicit internal Unicode compilation mode. Public u/v admission
remains disabled. The parser mode and matcher mode must agree; the future public
integration supplies both together.

Characters, dot, ranges, search advancement and word boundaries consume code
points while capture storage retains UTF-16 offsets. Unicode case-insensitive
matching uses the TS-453 exhaustively checked simple-fold table. Non-Unicode
matching retains its uppercase mapping and existing backreference comparison.
Unicode references advance captured and candidate text independently by code
point, charging the existing matcher budget for each comparison. Range folding
also retains its compilation budget.

An internal start within a surrogate pair selects the containing code point.
The matcher reports that point's UTF-16 start. This establishes the matching
coordinate conversion only; deciding public result indices for manually supplied
inside-pair lastIndex remains part of the documented Unicode admission review.

Tests carry the 24 independent matching references into Rift, covering astral
characters, lone surrogates, case-fold exceptions, classes and word boundaries.
Additional checks inspect UTF-16 captures through repeated duplicate names,
lookahead, backtracking and named references; exhaust every budget cutoff in an
astral reference match; and stop large case-fold range expansion. Isolated and
combined acceptance remain pending.
