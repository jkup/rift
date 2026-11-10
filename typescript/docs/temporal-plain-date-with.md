# PlainDate field and calendar replacement

With checks the receiver and partial-object restrictions before reading fields.
At least one date field is required before options are read. Replacing either
month or monthCode removes the old month representation; providing both requires
agreement. The shared resolver applies overflow and representable date bounds.

WithCalendar uses the shared calendar conversion and returns a fresh ISO date.
Both methods use the defining Realm's intrinsic prototype. Partial-object checks
are shared with PlainTime.with; future calendar-bearing Temporal brands must be
added when their object types are introduced.

References: [PlainDate.with](https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.with),
[CalendarMergeFields](https://tc39.es/proposal-temporal/#sec-temporal-calendarmergefields),
and engine262 `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Tests cover coercion order, empty partials, month conflicts, leap-day overflow,
range edges, metadata and cross-Realm results.
