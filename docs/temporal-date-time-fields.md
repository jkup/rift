# Ordered date-time fields

Date-time field preparation reads and converts properties in lexical order:
day, hour, microsecond, millisecond, minute, month, monthCode, nanosecond,
second, year. Missing time fields default to zero. Missing date fields stay
absent until resolution, after the caller has read overflow options.

Date field conversion is shared with PlainDate. Time regulation is separated
from option lookup so DateTime reads overflow once, then resolves the date
before regulating the time. Combined values use strict DateTime bounds.

References: [InterpretTemporalDateTimeFields](https://tc39.es/proposal-temporal/#sec-temporal-interprettemporaldatetimefields)
and engine262 plain-date-time.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover getter/coercion order, early and deferred errors, default midnight,
constrain/reject behavior and nanosecond endpoints. Public conversion methods
remain a separate task.

Native validation exposed a composition-dependent scriptc SC1090 after indexed
writes into the temporary time record. The standalone indexed-write probe is
static, while the isolated full field driver reproduces the failure. Collecting
ordered numeric values and constructing the record afterward passes the same
coverage check and matches the existing PlainTime preparation pattern. Initial
logs and both isolated coverage reports remain under build/date-time-fields-*;
the pinned compiler and engine execution machinery are unchanged.
