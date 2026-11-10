# PlainTime serialization

PlainTime `toJSON` and the non-Intl `toLocaleString` fallback serialize the branded
internal time as `HH:mm:ss` with an automatic fractional suffix. Trailing zeroes
are removed while leading zeroes preserve exact nanoseconds. Both methods ignore
reserved arguments and public field/formatting overrides.

The time formatter is shared with Instant's date-time output. Precision handling
is unchanged and directly tested for minute, automatic and every 0–9 digit width.
The existing UTC and offset Instant paths retain their range checks. No locale
provider, time-zone backend or host Date formatting is introduced.

Review: [PlainTime.toJSON](https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.tojson),
[PlainTime.toLocaleString](https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.tolocalestring)
and [TimeRecordToString](https://tc39.es/proposal-temporal/#sec-temporal-timerecordtostring).
The established Instant formatter supplies the same reviewed fractional formatting.
Option-aware `toString` and rounding remain separate follow-ups.

Tests cover exact output, JSON integration, ignored arguments, generic-call brand
errors, subclass/foreign Realm receivers and defining Realm errors. Evidence uses
`build/temporal-plain-time-format-*`; combined integration acceptance is required.
