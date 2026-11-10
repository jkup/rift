# Zoned relative duration totals

Adds the duration using checked calendar-first zoned arithmetic. Time-unit totals divide the exact instant difference; year/month/week/day totals use the same checked calendar window as zoned rounding and the shared exact-ratio conversion. A zero calendar total still checks both window endpoints.

This pure helper supports UTC and fixed offsets. Public zoned relativeTo conversion and Duration method integration remain separate work.

References: [DifferenceZonedDateTimeWithTotal](https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetimewithtotal) and [Duration.total](https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.total), checked against engine262 revision 18cdeb03c363eb31d775648a0d070bdc8a26ced1. The exact ratio oracle covers 4,800 cases.
