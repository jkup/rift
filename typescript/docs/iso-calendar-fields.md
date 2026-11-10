# ISO calendar fields

Pure helpers compute day-of-year and ISO week/year-of-week from validated dates.
Week numbering follows the first-Thursday rule and handles year boundaries,
including year zero. PlainDate limits admit epoch days -100000001 through
100000000, matching the specification's noon-based date-time range check.

These follow [ISOWeekOfYear](https://tc39.es/proposal-temporal/#sec-temporal-isoweekofyear)
and [ISODateWithinLimits](https://tc39.es/proposal-temporal/#sec-temporal-isodatewithinlimits),
reviewed against engine262 calendar.mts at
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests cover fixed leap/year-boundary
cases and all 146097 days of a Gregorian cycle, reconstructing each date from
its week fields using January 4 and checking the Thursday's year.
No guest date objects are added here; combined acceptance remains pending.
