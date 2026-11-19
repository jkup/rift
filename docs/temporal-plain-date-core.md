# PlainDate core

PlainDate construction converts year, month and day in order, validates the
calendar string, then validates date/range before reading newTarget.prototype.
ISO 8601 is the only supported calendar, as permitted by Temporal's minimum
calendar requirement. Its identifier is case-insensitive; other calendars throw
RangeError. Calendar objects are not coerced to strings.

The Realm-owned prototype supplies branded date/calendar fields, including week
year, leap-year data and undefined ISO era fields. Constructor prototype fallback
uses newTarget's Realm. PlainTime.with now rejects the new PlainDate brand before
reading partial fields. Numeric truncation is shared in temporal-integer.ts.

This follows [PlainDate construction](https://tc39.es/proposal-temporal/#sec-temporal.plaindate)
and [Calendar Types](https://tc39.es/proposal-temporal/#sec-temporal-calendar-types),
with calendar operations reviewed against engine262 at
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests cover bounds, leap/ISO fields,
coercion and prototype order, branding, metadata and cross-Realm construction.
Formatting, conversion and arithmetic remain separate; combined acceptance is pending.
