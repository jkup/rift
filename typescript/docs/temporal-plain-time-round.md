# PlainTime rounding

`PlainTime.round` creates a fresh intrinsic PlainTime after rounding its internal
fields. Options are read in order: roundingIncrement, roundingMode, smallestUnit.
String shorthand names the required smallest unit; the default mode is halfExpand.
Hour through nanosecond units work, including plurals and all nine rounding modes.
Midnight carry wraps into the next day's time, without exposing a date.

PlainTime increments must be proper divisors of the next unit: 24 for hours, 60
for minutes/seconds and 1000 for subsecond units. Instant retains its different
rule allowing increments that divide a whole day. The shared helpers perform
numeric conversion and unit lookup; each caller validates its own limit.

Implementation follows [Temporal PlainTime round](https://tc39.es/proposal-temporal/#sec-temporal-plaintime-prototype-round)
and engine262's PlainTimePrototype.mts at revision
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests check all unit widths and modes,
increment divisibility and conversion, tie boundaries, midnight wrap, option
evaluation order and failures, fresh results, subclass behavior and defining-Realm
ownership. Separate Instant cases retain its full-day increment behavior.

Evidence is in build/temporal-plain-time-round-* and the isolated draft build
directory. Parsing, arithmetic, comparison and duration results remain separate
tasks; combined acceptance is still required before publishing this method.
