# PlainYearMonth fields

With reads a nonempty partial year/month/monthCode record, merges it with the
stored ISO year and month, then applies overflow. The result's reference day is
one. Temporal-branded partials and calendar/timeZone properties are rejected.

ToPlainDate reads only the supplied object's day and constrains it within the
stored month. The resulting date must satisfy PlainDate's narrower bounds.
Results use intrinsic prototypes, independent of subclass or constructor changes.

Reference: engine262 PlainYearMonthPrototype.mts at
18cdeb03c363eb31d775648a0d070bdc8a26ced1 and
[Temporal.PlainYearMonth.prototype](https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plainyearmonth-prototype-object).
Tests cover merging, reference-day normalization, overflow, empty partials,
calendar boundaries, getter/error order, metadata and defining Realm ownership.
