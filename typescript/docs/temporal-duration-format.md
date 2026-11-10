# Exact duration formatting

The ISO formatter preserves years through minutes as supplied and combines only
seconds and subseconds. BigInt accumulation prevents loss when milliseconds,
microseconds or nanoseconds exceed the safe integer range. A single leading minus
sign applies to negative durations. Blank durations produce PT0S.

Automatic precision trims fractional zeros; explicit 0–9 digit precision forces
a seconds component. The formatter does not round: callers must round before
requesting a shorter precision. Fraction formatting is shared with Instant and
PlainTime. Their output and validation remain unchanged.

The implementation follows [TemporalDurationToString](https://tc39.es/proposal-temporal/#sec-temporal-temporaldurationtostring)
and the equivalent engine262 operation at revision
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests cover all fields, signs, zeros,
precision widths, subsecond carry, unsafe integers and the exact duration bound.
Evidence is retained under build/temporal-duration-format-* and the draft build
directory. Guest serialization and option-aware toString are separate tasks.
