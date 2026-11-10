# PlainMonthDay conversion

From/equals use ordered date-field conversion and shared monthCode resolution.
Field bags use their supplied year for leap-day regulation, defaulting to 1972,
then normalize the result to 1972. The input year need not lie within PlainDate
bounds because it is not retained. Strings validate their written date before
normalization. Branded copies preserve the complete stored reference date.

Overflow is read after fields or string parsing, including for branded copies.
Equality compares the complete stored ISO date, so different reference years
can distinguish MonthDays with identical default strings. No compare method is
added. Results use the defining Realm's intrinsic MonthDay prototype.

References: [ToTemporalMonthDay](https://tc39.es/proposal-temporal/#sec-temporal-totemporalmonthday)
and engine262 plain-month-day.mts / CalendarMonthDayToISOReferenceDate in
calendar.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1. Tests cover leap-year
regulation, normalization, reference-year equality, getter/error order, invalid
fields, subclasses, metadata and Realm ownership.
