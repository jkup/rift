# Zoned relativeTo

Duration compare, total and round accept branded ZonedDateTime values, zoned ISO strings and ordered property bags for UTC/fixed-offset zones. Branded inputs use internal slots. Bags read and convert calendar/date/time/offset/zone fields once in order, constrain calendar/time fields and reject inconsistent offsets. Plain relative dates retain their existing path.

Comparison uses checked zoned targets when either duration contains a calendar date part; time-only comparison avoids unnecessary endpoint addition. Equal durations still validate relativeTo first. Total and round use checked zoned addition, exact ratios and the dedicated zoned rounding pipeline. Zero-duration calendar rounding retains its boundary errors.

Historical unsupported-zone inputs now have positive tests. Negative tests use an invalid zone instead; their original sources remain in originals.json. IANA zones and non-ISO calendars remain unsupported.

References: [Duration.compare](https://tc39.es/proposal-temporal/#sec-temporal.duration.compare), [Duration.round](https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.round), [Duration.total](https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.total), and engine262 revision 18cdeb03c363eb31d775648a0d070bdc8a26ced1. Public guest evaluation passes 360 randomized comparisons across branded, string and bag inputs.
