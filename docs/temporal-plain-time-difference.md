# PlainTime differences

PlainTime until/since convert the other time before reading difference options.
They subtract exact within-day nanoseconds without wrapping midnight, then round
and balance into Duration fields, defaulting to hours. Input property bags use
the standard constrain behavior. Options unrelated to differences are ignored.
Results use the defining Realm's intrinsic Duration prototype.

This follows [DifferenceTemporalPlainTime](https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaintime)
and engine262's DifferenceTemporalPlainTime at
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests cover both directions, signed
rounding, day-edge results, input/option ordering, brands and Realm/subclasses.
Combined acceptance remains pending.
