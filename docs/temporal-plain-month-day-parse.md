# PlainMonthDay syntax

Short ISO month-day forms accept basic/extended separators and an optional double
hyphen. They use leap reference year 1972. Full date/time forms validate their
own year and retain it in the parse record; conversion later normalizes ISO
MonthDay strings to reference year 1972. Syntax parsing does not apply public
date bounds.

Short scanning is shared with calendar strings. Existing date/time and annotation
scanners reject UTC Z, non-ISO calendars and malformed annotations, while numeric
offsets and zone annotations leave the calendar date unchanged.

Reference: [TemporalMonthDayString](https://tc39.es/proposal-temporal/#prod-TemporalMonthDayString)
and engine262 TemporalParser.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover yearless leap days, full-year validation, signed years, offsets,
annotations and malformed input. Public conversion remains separate.
