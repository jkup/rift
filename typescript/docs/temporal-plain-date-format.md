# PlainDate formatting

PlainDate toString reads only calendarName and supports auto, never, always and
critical annotations. Its branded fields use shared ISO date/year formatting,
including six-digit signed years. toJSON and non-Intl toLocaleString ignore
reserved arguments and public toString overrides, returning the automatic form.

This follows [PlainDate.toString](https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tostring)
and TemporalDateToString, with the existing ISO formatting reviewed against
engine262 at `18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests cover date bounds,
annotation/coercion behavior, JSON protocol, metadata and Realm errors. Existing
Instant formatters use the same extracted date formatter; their regression gates
are required. Combined acceptance remains pending.
