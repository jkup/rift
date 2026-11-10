# PlainYearMonth formatting

ISO YearMonth strings omit the reference day by default. The always and critical
calendarName options include it before the ISO calendar annotation. Formatting
uses the stored record, preserving reference days outside PlainDate's range.
JSON and the locale fallback use auto formatting and ignore supplied arguments.
Locale-aware formatting remains unsupported.

Reference: [TemporalYearMonthToString](https://tc39.es/proposal-temporal/#sec-temporal-temporalyearmonthtostring)
and engine262 plain-year-month.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover extended years, boundary reference days, every calendarName option,
getter/coercion order, branding, metadata, JSON and cross-Realm errors.
