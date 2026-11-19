# PlainTime string grammar

`parseTemporalPlainTime` accepts TemporalTimeString forms using the shared ISO
scanner. Time-only strings may start with T/t. Full valid ISO dates may precede
the required time; their date fields are ignored. Numeric offsets and valid
zone/calendar annotations are validated and ignored. Z/z designators are invalid.

An unprefixed time and offset must not also parse as a valid month-day or
year-month. For example, 1231 and 2021-12 are rejected, while T1231 and T2021-12
are accepted. February 29 is a valid ambiguous month-day regardless of year.
Invalid calendar combinations such as 0230 remain valid time-only strings.
The ambiguity check includes the numeric offset but excludes annotations.

The parser follows [Temporal ISO grammar and early errors](https://tc39.es/proposal-temporal/#sec-temporal-iso8601grammar)
and the TemporalTimeString route in engine262's TemporalParser.mts at revision
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. It preserves exact fractions and the
specified leap-second clamp. Tests include fixed records, expanded years, invalid
dates, offsets and annotations, ambiguity boundaries and all 1,440 minute positions.
No guest conversion method is introduced by this parser task.
