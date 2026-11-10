# PlainDate conversion and comparison

PlainDate.from copies branded dates, parses strings, or reads calendar then date
fields from property bags. Options are read after conversion; string date limits
are checked afterward. Objects do not undergo primitive conversion. Calendar
conversion accepts strings or branded dates; this implementation supports ISO only.

Compare converts both inputs in order. Equals checks its receiver first. From
returns a fresh intrinsic object in the method's Realm. Parsing charges the
execution budget for both date and calendar input. Shared overflow handling keeps
PlainTime behavior unchanged.

The implementation follows [ToTemporalDate](https://tc39.es/proposal-temporal/#sec-temporal-totemporaldate)
and [ToTemporalCalendarIdentifier](https://tc39.es/proposal-temporal/#sec-temporal-totemporalcalendaridentifier),
reviewed against engine262 `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Future PlainDateTime and ZonedDateTime objects require explicit conversion branches.
Tests cover input/option/error order, constraints, branding, Realm results and budgets.
