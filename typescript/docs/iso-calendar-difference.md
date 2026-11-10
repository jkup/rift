# ISO calendar differences

The helper calculates whole years/months using a direct candidate and at most one
correction per unit. Candidates compare their original day without clamping;
only the accepted candidate is regulated before residual days are calculated.
This preserves asymmetric month-end and leap-year differences. Weeks use signed
whole-day division. Runtime does not grow with the distance between the dates.

The algorithm follows [CalendarDateUntil](https://tc39.es/proposal-temporal/#sec-temporal-calendardateuntil)
and ISODateSurpasses. Engine262 `18cdeb03c363eb31d775648a0d070bdc8a26ced1` provides
an iterative reference; the direct candidates avoid iterating across the full
representable year range. Tests include fixed asymmetric expectations, both full
range directions, and Gregorian-cycle reconstruction/maximality checks.

This is an unrounded backend. Guest difference options and rounding remain pending.
