# PlainYearMonth arithmetic

Add/subtract convert a duration and validate overflow before rejecting nonzero
week, day or time components. ISO arithmetic uses the first day of the stored
month and produces a reference day of one, including when adding zero.

The current specification converts that first day through CalendarDateFromFields.
Consequently arithmetic involving April -271821 as that date throws: its first
day is outside PlainDate bounds even though the YearMonth itself is valid.
This includes adding zero to that minimum month. September +275760 works while
its arithmetic result stays within the date boundary.

References: [AddDurationToYearMonth](https://tc39.es/proposal-temporal/#sec-temporal-adddurationtoyearmonth)
(checked 2026-11-10) and engine262 plain-year-month.mts at
18cdeb03c363eb31d775648a0d070bdc8a26ced1. Tests cover signed carries, reference-day
normalization, unsupported duration units, option/error order, bounds and Realms.
