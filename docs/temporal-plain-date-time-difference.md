# PlainDateTime differences

PlainDateTime until/since convert the other operand before reading ordered
rounding settings, then use exact ISO calendar and nanosecond arithmetic.
Defaults retain days and nanoseconds. Calendar rounding uses clock-sensitive
windows and carries; time rounding balances exact integer nanoseconds.

Since reverses the rounding mode and resulting duration, preserving the original
calendar operands. Swapping operands would change constrained month-end results.
Results and errors belong to the active Realm and ignore user-replaced Duration
constructors. Equal operands still validate the other operand and options.

References: [DifferenceTemporalPlainDateTime](https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaindatetime)
and engine262 PlainDateTimePrototype.mts / plain-date-time.mts at
18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover signed rounding modes, asymmetric leap-year differences, midnight
and calendar carries, nanosecond ties, full-range endpoints, conversion and
getter order, option errors, branding, descriptors and Realm ownership.
