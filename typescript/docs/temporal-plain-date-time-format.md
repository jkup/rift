# PlainDateTime formatting

String conversion reads calendarName, fractionalSecondDigits, roundingMode and
smallestUnit in order. Exact integer rounding acts on time since midnight, then
carries into the ISO date; rounding an epoch directly would give incorrect trunc
and expand results before 1970. Strict DateTime bounds apply after rounding.

Calendar options and annotation output are shared with PlainDate. ISO date-time
formatting is shared with Instant. JSON and the non-Intl locale fallback read
internal fields and ignore arguments and overridden public methods.

References: [PlainDateTime.toString](https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.tostring)
and [engine262 PlainDateTimePrototype](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/Temporal/PlainDateTimePrototype.mts).
Tests cover signed years, all nine rounding modes, calendar-day carries, strict
endpoints, option/error order, method descriptors and cross-Realm errors.
