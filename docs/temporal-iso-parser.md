# Shared Temporal ISO scanner

Date, time and annotation grammar now live in `temporal-iso-parser.ts`. Each
operation advances an explicit scanner; the caller validates separators and
remaining input. Date parsing validates ISO fields, while the caller owns any
epoch-range restriction. Time parsing preserves leap-second clamping and exact
one-to-nine-digit fractions. Annotation parsing preserves the original Instant
rules for zone syntax, critical annotations and duplicate calendars.

Instant retains mandatory date/time separation and offset parsing, applies the
offset before checking the final epoch range, and uses shared exact within-day
conversion. No new guest methods or additional Instant syntax are introduced.

This extraction carries forward the specification and engine262 review recorded
in temporal-instant-parse.md. New tests verify records, scanner positions, expanded
years, time fractions and malformed input; original Instant parser/conversion
tests remain unchanged. Reports are retained under build/temporal-iso-parser-*.
