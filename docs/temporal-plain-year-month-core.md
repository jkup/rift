# ISO PlainYearMonth construction

PlainYearMonth stores a validated ISO date including its reference day. Bounds
apply to the year/month: April -271821 through September +275760, inclusive.
Reference days still follow the month's length but may lie outside PlainDate's
narrower endpoint range. Calendar getters use the shared ISO field machinery.

Construction requires new, converts year and month, validates the ISO calendar,
then converts the optional reference day before validating the complete record.
Prototype selection honors newTarget and its Realm. Calendar conversion recognizes
the brand; partial-field replacement rejects it before invoking guest getters.

References: [Temporal.PlainYearMonth](https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth)
and engine262 PlainYearMonth.mts / plain-year-month.mts at
18cdeb03c363eb31d775648a0d070bdc8a26ced1. Tests cover exact boundary months,
reference days, coercion order, metadata, branding, subclasses and Realm fallback.
Only ISO calendars are supported. Parsing, formatting and methods are follow-ups.
