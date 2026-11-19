# PlainDateTime parsing

PlainDate and PlainDateTime use the same ISO date/optional-time scanner. Missing
time means midnight; leap seconds normalize to 59. Numeric offsets and valid
zone annotations do not shift wall-clock fields. Z is invalid for these forms.
The shared annotation rules retain the first calendar and enforce critical
annotation restrictions. This engine currently accepts only ISO calendars.

Parsing validates calendar fields and grammar, but does not impose the final
PlainDateTime bounds. Conversion must read overflow options before that range
check. The parser performs no host date or regular-expression evaluation.

References: [ToTemporalDateTime](https://tc39.es/proposal-temporal/#sec-temporal-totemporaldatetime)
and engine262 plain-date-time.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover compact/extended forms, signed years, fractions, offsets, annotations,
invalid mixed forms, exact endpoints and deferred range failures. Guest from,
compare and equals methods are separate follow-up work.
