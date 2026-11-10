# Zero relative rounding

DifferenceTemporalZonedDateTime shortcuts equal epochs after option and timezone validation. DifferenceZonedDateTimeWithRounding does not: Duration.round uses it and must validate calendar windows even for a zero duration. Keep the shortcut in the public until/since builtin, not the shared arithmetic helper.

The existing helper regression now checks the internal operation's required RangeError result; public equality remains covered independently. Its previous source is retained in the draft's originals.json. Exact nanosecond and time-largest paths remain valid at the endpoint.

References: [DifferenceTemporalZonedDateTime](https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalzoneddatetime), [DifferenceZonedDateTimeWithRounding](https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetimewithrounding), and engine262 DurationProto_round at revision 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
