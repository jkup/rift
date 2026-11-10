# ISO date field conversion

Date fields are read and converted in day, month, monthCode, year order. Missing
fields remain explicit until resolution. Month-code grammar is checked during
conversion; ISO calendar compatibility and conflicting month values are checked
after options. Month and day must be positive even with constrain overflow.

The separate resolution step checks required fields, resolves the month, applies
overflow, and checks the representable date range. It is intended for PlainDate
conversion and field replacement; no guest method is registered by this task.

References: [PrepareCalendarFields](https://tc39.es/proposal-temporal/#sec-temporal-preparecalendarfields),
[CalendarResolveFields](https://tc39.es/proposal-temporal/#sec-temporal-calendarresolvefields),
and engine262 calendar operations at `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Tests exercise error phases, coercion order, month-code forms, leap days and range
edges. Full combined validation remains pending.
