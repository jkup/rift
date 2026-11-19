# Time difference options

Shared settings for Instant and PlainTime differences read largestUnit,
roundingIncrement, roundingMode and smallestUnit in order. Unknown unit strings
fail immediately; recognized units outside the time category are rejected after
all option reads. The default largest unit expands to the smallest unit when
needed. Rounding increments must properly divide 24, 60 or 1000 as appropriate.

This is the time-only portion of [GetDifferenceSettings](https://tc39.es/proposal-temporal/#sec-temporal-getdifferencesettings),
reviewed against engine262 at `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
The helper returns the original rounding mode; since callers negate the exact
difference before rounding, equivalent to negating the mode then the result.
No new guest methods are registered in this task. Tests use a private fixture
adapter to inspect defaults, coercion order, unit relationships and increments.
Combined acceptance remains pending.
