# ISO date-time records and limits

Date/time composition reuses existing ISO date and time records. Internal
nanosecond conversion remains separate from the narrower Instant range check.
PlainDateTime permits values strictly within one day of both Instant boundaries;
the lower midnight itself is excluded while the following nanosecond is valid.

The existing internal epoch-to-record helper retains its inclusive lower endpoint
for other algorithms. Guest PlainDateTime construction must use the new strict
range check. UTC Instant conversion keeps its original limits.

References: [ISODateTimeWithinLimits](https://tc39.es/proposal-temporal/#sec-temporal-isodatetimewithinlimits)
and engine262 `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Tests cover exact boundaries, both directions of the signed epoch range, invalid
fields and the distinction between internal, PlainDateTime and Instant bounds.
