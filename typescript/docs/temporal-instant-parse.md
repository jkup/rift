# Exact Instant string parsing

The scanner implements the Instant date/time/required-offset grammar, including
basic and extended forms, signed six-digit years, fractional seconds, leap-second
normalization, and RFC 9557 annotations. Annotation syntax and critical flags are
validated even when their values do not affect an Instant. Named-zone annotations
are not resolved. Unknown noncritical keys and noncritical duplicate calendars
are ignored as specified.

Offsets are subtracted using exact nanoseconds before checking the Instant range.
The calendar helper permits the adjacent day needed at either range boundary.
Parsing is linear in input size and returns null for invalid syntax or range.
Guest conversion and resource accounting are separate integration work.

Tests use fixed epoch values, both range boundaries with offset rescue, malformed
separators and annotations, and exact formatter roundtrips. Native static-only
compilation and the zero-dynamic gate pass; combined acceptance remains pending.

References: [Temporal grammar](https://tc39.es/proposal-temporal/#sec-temporal-iso8601grammar),
[ToTemporalInstant](https://tc39.es/proposal-temporal/#sec-temporal-totemporalinstant),
and engine262 at [18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/parser/TemporalParser.mts).
The pinned engine confirms annotation validation and offset-before-range order;
Rift uses a small manual scanner instead of importing its general parser.
