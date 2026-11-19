# PlainDate to PlainMonthDay

ToPlainMonthDay uses the stored ISO month/day and leap reference year 1972.
The result preserves February 29 and is valid for every supported PlainDate,
including both endpoints. Receiver fields, arguments and replaced constructors
do not participate; the defining Realm supplies the intrinsic result prototype.

Reference: [Temporal.PlainDate.prototype.toPlainMonthDay](https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.toplainmonthday)
and engine262 PlainDatePrototype.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover reference-year normalization, leap days, endpoints, branding,
metadata, ignored getters, subclasses and Realm-owned results/errors.
