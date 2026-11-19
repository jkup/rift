# Exact duration record bounds

Duration fields retain the integer Numbers supplied by guest conversion. All ten
fields must be finite integers and share a common sign. Years, months and weeks
must have magnitude below 2^32. The combined day/time portion, measured exactly
in nanoseconds, must have magnitude below 10^9 times 2^53.

The final sum uses BigInt so separate seconds and subsecond fields one nanosecond
below the limit are accepted accurately. An early magnitude check bounds BigInt
allocation; equal-sign fields cannot cancel. Calendar fields do not contribute
to the time sum. `durationSign` returns positive zero for a blank record.

This follows [IsValidDuration](https://tc39.es/proposal-temporal/#sec-temporal-isvalidduration)
and the exact-integer approach in engine262's temporal/duration.mts at revision
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests cover every field, mixed signs,
calendar limits, unsafe subsecond integers and one-nanosecond threshold cases.
No guest Duration object is added by this prerequisite.

The initial native test failed SC1043 because division through an indexed BigInt
array was inferred as bigint-or-undefined. An explicit array type did not fix the
reduction; direct value iteration did, with four static statements and zero dynamic
operations. The same boundary assertions are retained. Evidence is under
build/temporal-duration-records-* and the draft's build/bigint-index-* files.
