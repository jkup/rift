# PlainDateTime field replacement

with screens partial Temporal objects before reading fields. Combined field
preparation preserves the receiver's time for undefined fields and reports
whether any recognized field was supplied; an empty partial fails before
options. Date fields merge through the same helper as PlainDate.with, so a
replacement month or monthCode replaces its counterpart while an explicitly
supplied pair must agree.

Options follow field preparation. The existing date/time resolver constrains
or rejects fields and enforces strict DateTime bounds. Results are fresh
intrinsic objects in the defining Realm; public receiver overrides are ignored.

References: [PlainDateTime.with](https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.with)
and engine262 PlainDateTimePrototype.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover month merging, preserved fractional fields, getter/error order,
empty and branded partials, constrain/reject, strict bounds and Realm results.
