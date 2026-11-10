# ISO PlainMonthDay construction

PlainMonthDay stores an ISO date whose default reference year is 1972, allowing
February 29. An explicit reference year must make a valid date within PlainDate
bounds. Construction converts month/day, validates the ISO calendar, then
converts the reference year. Only calendarId, monthCode and day are exposed.

Realm-owned prototypes, newTarget fallback, calendar-bearing lookup and partial
object rejection follow the other Temporal types. Unsupported calendars fail
explicitly; formatting, conversion and replacement are follow-up tasks.

Reference: [Temporal.PlainMonthDay](https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday)
and engine262 PlainMonthDay.mts / plain-month-day.mts at
18cdeb03c363eb31d775648a0d070bdc8a26ced1. Tests cover leap reference years, exact
date boundaries, coercion/error order, metadata, branding, subclasses and Realms.
