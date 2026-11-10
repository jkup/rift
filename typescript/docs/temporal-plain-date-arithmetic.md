# PlainDate arithmetic

Add and subtract convert the duration before reading overflow options. Years and
months are combined before regulating the original day; weeks and days are added
afterward. Time fields contribute exact whole 24-hour days, truncating toward zero.
Subseconds remain BigInt until that division, including unsafe Number inputs.

Validated common-sign duration fields cannot return an out-of-range intermediate
year/month to the representable date range. The bounded ISO backend can therefore
reject that intermediate without computing an unbounded epoch. Calendar fields
and the resulting whole-day count are within exact Number integer range.

References: [AddDurationToDate](https://tc39.es/proposal-temporal/#sec-temporal-adddurationtodate),
[CalendarDateAdd](https://tc39.es/proposal-temporal/#sec-temporal-calendardateadd),
and engine262 `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Tests cover signed year/month transitions, leap-day regulation, exact time carries,
coercion/options order, bounds and Realm results. Only ISO calendars are supported.
