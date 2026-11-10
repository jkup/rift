# Date-time difference options

DateTime differences read largestUnit, roundingIncrement, roundingMode and
smallestUnit in the shared order. Defaults are day/nanosecond, increment one and
truncation. Automatic largest units expand to a larger requested calendar unit.
All ten units are accepted in descending order; time increments must properly
divide the next time unit, while calendar increments retain the general bound.

The shared duration-unit mapping now covers calendar units as well as time.
Existing time-only callers still validate their allowed unit group first.

References: [GetDifferenceSettings](https://tc39.es/proposal-temporal/#sec-temporal-getdifferencesettings)
and engine262 temporal.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover defaults, all unit pairs, calendar/time increments, all rounding
modes, getter/coercion order and error phases. Public date-time differences and
relative rounding remain separate tasks.
