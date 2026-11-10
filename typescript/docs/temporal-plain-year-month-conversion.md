# PlainYearMonth conversion

From, compare and equals share ordered ISO conversion. Branded copies preserve
their reference day; strings and field bags normalize to day one. Comparisons
include the reference day, so a custom reference day can compare differently
from a string with the same printed year/month. Field bags read month, monthCode
and year, then overflow; day and era fields are ignored.

Month/monthCode resolution is shared with Date fields. Calendar lookup now
recognizes all supported calendar-bearing brands before reading a guest calendar
property, including YearMonth inputs to existing Date and DateTime conversion.
Results use the defining Realm's intrinsic prototype.

References: [ToTemporalYearMonth](https://tc39.es/proposal-temporal/#sec-temporal-totemporalyearmonth)
and engine262 plain-year-month.mts / calendar.mts at
18cdeb03c363eb31d775648a0d070bdc8a26ced1. Tests cover normalization, reference-day
comparison, month bounds, option/coercion order, branded calendar lookup,
missing/conflicting fields, subclasses, metadata and Realm ownership.
