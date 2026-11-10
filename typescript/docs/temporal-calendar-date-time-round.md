# Calendar rounding for date-time differences

Calendar window construction and exact rational endpoint selection are shared
with date-only differences. DateTime windows preserve the origin's clock time
and use BigInt nanosecond distances, so a one-nanosecond change around a
fractional-day midpoint cannot disappear through floating-point rounding.

Inputs must be valid DateTimes. Internal window endpoints follow CalendarDateAdd
bounds, not public PlainDateTime construction bounds. In particular, midnight
on the minimum ISO date can be a valid internal rounding endpoint even though
a public DateTime cannot represent it. The initial overstrict draft and its
corrected test expectation are retained in build/strict-window-*-initial.ts.

References: [ComputeNudgeWindow](https://tc39.es/proposal-temporal/#sec-temporal-computenudgewindow)
and [NudgeToCalendarUnit](https://tc39.es/proposal-temporal/#sec-temporal-nudgetocalendarunit),
plus engine262 duration.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover signed fractional-day ties, half-even parity, exact nanosecond
neighbors, retained larger units, shifted windows and calendar-range failures.
