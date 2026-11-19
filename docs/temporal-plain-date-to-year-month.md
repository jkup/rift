# PlainDate to PlainYearMonth

ToPlainYearMonth uses the receiver's stored ISO year and month with reference
day one. Every valid PlainDate maps to a valid YearMonth, including the minimum
date whose month's first day lies outside PlainDate bounds. Guest getters,
arguments, subclasses and replaced constructors do not affect the result.

Reference: [Temporal.PlainDate.prototype.toPlainYearMonth](https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.toplainyearmonth)
and engine262 PlainDatePrototype.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover reference-day normalization, endpoints, branding, metadata and the
defining Realm's intrinsic result and error prototypes.
