# PlainDateTime arithmetic

add/subtract convert a duration, then read overflow. Time arithmetic uses exact
nanoseconds with floor division into a day carry and a nonnegative time of day.
The signed carry joins duration days; the existing ISO date helper regulates
years/months before applying weeks/days. Combined DateTime bounds are checked
last. Common-sign duration fields keep the date-only intermediate valid for
that helper; no timezone or daylight-saving interpretation is involved.

References: [AddDurationToDateTime](https://tc39.es/proposal-temporal/#sec-temporal-adddurationtodatetime)
and engine262 plain-date-time.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover nanosecond borrow/carry, calendar/time ordering, leap days, negative
years, exactly representable large nanosecond fields, overflow options, endpoint
failures, brand checks and Realm ownership.
