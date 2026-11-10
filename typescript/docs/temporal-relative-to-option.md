# Plain ISO relativeTo conversion

The shared converter reads options.relativeTo once. PlainDate and PlainDateTime use stored date records. Other objects read calendar and date/time/offset fields in specification order; time values still undergo integer conversion even though constrain makes their final values irrelevant to the resulting date. Offset syntax and coercion are validated even without a time zone. Strings reuse the ISO date-time scanner, preserving annotation parsing and the full PlainDate endpoint range.

The scanner now retains its first time-zone annotation without changing existing PlainDateTime parsing. Relative conversion rejects timezone-dependent inputs explicitly; timezone lookup and ZonedDateTime remain unsupported. The helper does not enable a public method yet. It is the shared option boundary for upcoming Duration comparisons.

Tests cover ordered getters/coercions and abrupt stops, branded records, leap regulation, offsets, unsupported zones/calendars and date endpoints.

References: https://tc39.es/proposal-temporal/#sec-gettemporalrelativetooption and engine262 abstract-ops/temporal/common.mts and calendar.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
