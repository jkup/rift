# PlainTime string precision

`PlainTime.prototype.toString` checks the receiver brand before reading options,
then reads fractionalSecondDigits, roundingMode and smallestUnit in that order.
Its exact within-day nanoseconds are rounded and reduced modulo one day before
formatting, so a carry at midnight produces 00:00 rather than an invalid hour.
All nine Temporal rounding modes and minute through nanosecond precision work.
The default truncates; automatic precision removes trailing fractional zeros.

Instant and PlainTime share option conversion and precision helpers. Instant's
timeZone getter still runs before the final allowed-unit validation. PlainTime
does not read timeZone or roundingIncrement. Neither method converts non-object
options into wrapper objects. Branded internal fields bypass public overrides.

The algorithm follows [Temporal PlainTime toString](https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.tostring)
and was checked against engine262's PlainTimePrototype.mts at revision
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Existing nonnegative nanosecond rounding
matches RoundTime; dropping its day carry is specific to this time-only result.
This task does not add PlainTime.round, parsing, comparison or arithmetic.

Tests cover every fractional width, singular/plural units, all rounding modes,
midnight carry, numeric digit truncation, coercion/getter ordering and abrupt
completion, invalid options, receiver branding, subclasses, property metadata
and cross-Realm error ownership. Existing Instant string tests guard its distinct
time-zone ordering. Evidence is retained under build/temporal-plain-time-string-*
and the isolated draft build directory; combined acceptance remains required.
