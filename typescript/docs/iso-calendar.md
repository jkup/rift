# ISO calendar and UTC nanoseconds

The backend uses the Gregorian DayFromYear formula and a 400-year estimate,
corrected at year boundaries, to convert dates and epoch days. Integer arithmetic
stays exact throughout the supported range. Negative years use floor division;
negative epoch nanoseconds use a nonnegative within-day remainder.

Date conversion accepts valid calendar dates within ±100000001 epoch days, leaving
one day beyond the Instant range for later plain-date/time work. Calendar input
validation first bounds years to ±1000000 to keep intermediate arithmetic safe.
UTC composition/decomposition accepts exactly ±8640000000000000000000 nanoseconds.
Invalid input returns null. Internal invariant failures alone throw host errors.
All time components are integers; leap-second regulation belongs to later parsing.

Tests include independently fixed epoch/calendar vectors, every day of a complete
146097-day Gregorian cycle, sampled inverses across the entire range, leap-century
rules, negative-year weekdays and exact negative submillisecond timestamps.
Both hosts pass static-only/zero-dynamic validation; the full Node suite passes
783/783. No guest Date/Temporal object, host clock, host date parsing, named zones
or non-ISO calendar is exposed here.

References: [DayFromYear](https://262.ecma-international.org/16.0/#sec-dayfromyear),
[Temporal ISODateToEpochDays](https://tc39.es/proposal-temporal/#sec-temporal-isodatetoepochdays),
and [engine262 date arithmetic at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/abstract-ops/date-objects.mts).
