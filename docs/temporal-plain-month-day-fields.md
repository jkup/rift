# PlainMonthDay fields

With merges partial date fields into the stored month/day. The stored reference
year is not a field default: only an explicitly supplied year affects leap-day
regulation; otherwise regulation uses 1972. Results normalize to reference year
1972. Empty partials and Temporal objects are rejected before reading overflow.

ToPlainDate reads only the supplied year, constrains the stored day for that
year, and applies PlainDate bounds. Extra arguments and unrelated properties
are ignored. Results use intrinsic prototypes in the defining Realm.

Reference: engine262 PlainMonthDayPrototype.mts / ISODateToFields at
18cdeb03c363eb31d775648a0d070bdc8a26ced1 and
[Temporal.PlainMonthDay.prototype](https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plainmonthday-prototype-object).
Tests cover reference-year independence, leap-day regulation, monthCode merging,
ordered getters, bounds, metadata, subclasses and Realm-owned results/errors.
