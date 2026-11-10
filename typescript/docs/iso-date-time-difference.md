# Exact ISO date-time differences

The unrounded difference retains date components and exact nanosecond time.
When clock-time direction opposes date direction, the destination date moves
one day toward the origin and the time component borrows the matching day.
Calendar differences then use the existing constant-time ISO algorithm. For a
time-only largest unit, date days fold into the exact time component.

References: [DifferenceISODateTime](https://tc39.es/proposal-temporal/#sec-temporal-differenceisodatetime)
and engine262 plain-date-time.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover signed midnight/month borrowing, exact epoch crossing, week/time
units, full-range nanosecond records and reconstruction across all ten largest
units. Public difference options and relative rounding remain separate work.
