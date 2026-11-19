# PlainYearMonth syntax

The parser accepts basic or extended year-month forms and full ISO date/time
forms. Short forms default the reference day to one; full forms preserve the
parsed day. Conversion, rather than syntax parsing, applies public month bounds
and normalizes a string-derived ISO reference day.

Short forms share scanning with calendar strings. Existing scanners validate
full dates, times, offsets and annotations. UTC Z designators and non-ISO
calendars are rejected; numeric offsets and zone annotations do not shift dates.

References: [TemporalYearMonthString](https://tc39.es/proposal-temporal/#prod-TemporalYearMonthString)
and engine262 TemporalParser.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover exact syntax, reference days, signed years, annotations and invalid
calendar/time combinations. Public conversion is a separate task.
