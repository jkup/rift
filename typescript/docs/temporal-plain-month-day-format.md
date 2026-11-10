# PlainMonthDay formatting

ISO MonthDay strings contain month and day. Always/critical calendar annotations
include the stored reference year, which defaults to 1972 but can be explicitly
chosen during construction. JSON and the locale fallback use auto formatting;
locale-aware output remains unsupported.

Reference: [TemporalMonthDayToString](https://tc39.es/proposal-temporal/#sec-temporal-temporalmonthdaytostring)
and engine262 plain-month-day.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover extended reference years, exact boundaries, calendar options,
getter order, ignored locale arguments, branding, metadata and Realm errors.
