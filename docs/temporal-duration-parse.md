# ISO duration parsing

The manual scanner accepts ordered ISO date/time units, optional ASCII sign,
case-insensitive ASCII designators, and a terminal fractional hour, minute or
second. Fractions use dot or comma and one to nine digits. Duplicate, out-of-order
and missing units are rejected, as are fractions on date units.

Fractional time units are expanded with bounded integer nanoseconds. Integer
components are accumulated only within the maximum potentially valid range;
the complete record then passes exact duration validation. Negative zero fields
are normalized. No host RegExp or guest execution is used for parsing.

This follows [ParseTemporalDurationString](https://tc39.es/proposal-temporal/#sec-temporal-parsetemporaldurationstring)
and the engine262 TemporalParser implementation at revision
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests include fixed fractional records,
the specification's precision example, maximum seconds plus nanoseconds, calendar
bounds, leading zeros and malformed grammar. Evidence is retained under
build/temporal-duration-parse-*; guest conversion is a separate task.
