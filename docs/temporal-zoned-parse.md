# Zoned ISO record parser

The shared ISO scanner parses ZonedDateTime strings with a required timezone annotation. Records retain a local date/time, the supported UTC/fixed-offset zone, date-only start-of-day, and wall/exact/option offset behavior. Z produces an exact zero offset, numeric offsets preserve nanoseconds, and missing offsets use wall time. Calendar support remains ISO-only.

Parsing does not reject a local date solely because its epoch would exceed Instant bounds: offset interpretation must happen first. Date-only forms retain their separate start-of-day meaning. With the currently supported minute-aligned zone offsets, minute matching and exact matching have identical results; an IANA backend must retain the original numeric offset precision before extending interpretation.

Tests cover basic/extended grammar, date-only input, critical annotations, leap seconds, fractional seconds and offsets, unavailable zones, annotation ordering and malformed forms. Reference: [ToTemporalZonedDateTime](https://tc39.es/proposal-temporal/#sec-temporal-totemporalzoneddatetime) and [InterpretISODateTimeOffset](https://tc39.es/proposal-temporal/#sec-temporal-interpretisodatetimeoffset). This is an internal parser checkpoint; public from/compare/equals integration follows separately.
