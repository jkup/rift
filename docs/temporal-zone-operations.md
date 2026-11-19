# Temporal timezone operations

Temporal consumers use a tagged fixed-offset or named-zone record. Offset lookup,
local projection, possible instants, disambiguation, day start, transitions and
identity are shared operations. Named records retain their spelling for display
and their primary identifier for equality. UTC and a fixed +00:00 zone remain
distinct identities. Guest parsing still admits only UTC and fixed offsets.

Calendar additions resolve the destination local date before adding elapsed time.
Differences, rounding and totals use actual local boundaries; day length is not
assumed to be 24 hours. Offset options preserve exact object offsets and the
minute-matching rule for applicable strings. String rendering queries the offset
after rounding, while the offset getter retains historical seconds.

Calendar-window starts retain larger date units, following
[TC39 PR3319](https://github.com/tc39/proposal-temporal/pull/3319).
Ten of the 970 calendar reference rows need that correction to Node's older
behavior; independent date addition and exact distance/span checks justify each.
The original observations are retained separately. Other controls cover gaps,
folds, skipped dates, historical second offsets, alias identity and option modes.

The local-time provider return assertions isolate scriptc's indexed BigInt
return-type widening. Bounds are established inside the provider; no values are
coerced. Static-only builds and parsed zero-dynamic coverage remain required.
