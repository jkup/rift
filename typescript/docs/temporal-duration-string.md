# Duration string precision

Duration.toString reads fractionalSecondDigits, roundingMode and smallestUnit in
order. It accepts second through nanosecond precision, with truncation by default.
Full nanosecond precision preserves existing fields. Coarser precision rounds the
exact signed time amount and balances into the original largest unit, never
smaller than seconds. Calendar fields remain unchanged except for day carry.
Out-of-range rounded durations throw RangeError before formatting.

The implementation follows [Duration.prototype.toString](https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.tostring)
and TemporalDurationFromInternal, reviewed against engine262 at
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. BigInt division and remainder preserve
negative fields without converting the entire time amount to Number. Tests cover
all rounding modes, precision widths, signed carries, range overflow and option
ordering. Combined acceptance remains pending.
