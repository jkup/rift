# PlainDateTime rounding

PlainTime and PlainDateTime share ordered rounding option conversion. DateTime
additionally permits a one-day increment; time increments must be proper
divisors of the next larger unit. Exact rounding uses time since midnight and
carries into the date, including for negative years and pre-epoch dates.

DateTime bounds apply after rounding. Even a no-op nanosecond rounding produces
a fresh intrinsic object. Calendar names and public date/time properties do not
participate in rounding.

References: [PlainDateTime.round](https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.round)
and engine262 PlainDateTimePrototype.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover all modes, day/midnight/leap/year carries, proper increments,
option/error order, strict bounds, fresh results and Realm ownership.
