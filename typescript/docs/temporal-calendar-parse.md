# Temporal calendar strings

Calendar strings accept bare annotation values or Temporal date/time, time,
year-month and month-day forms. Parsing returns the first calendar annotation,
or ISO 8601 when absent. Calendar support is a separate validation step.
Partial dates permit only ISO annotations. Full dates need no epoch-range check.

Date/time strings may include Z; standalone time strings may not. An invalid date
can still be syntactically valid as a bare calendar name, so parsing such a name
does not imply that the calendar exists.

The implementation follows [ParseTemporalCalendarString](https://tc39.es/proposal-temporal/#sec-temporal-parsetemporalcalendarstring)
and the grammar review against engine262 `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Tests cover every form, malformed fields, first/critical annotations and unknown
calendar identifiers. Guest calendar conversion remains a follow-up.
