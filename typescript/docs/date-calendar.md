# Date calendar construction

MakeDay truncates inputs, balances months into years, computes the Gregorian first day and then applies the supplied day offset. Month balancing uses integer division before the specified floating-point year addition; year arithmetic uses exact integers before conversion back to Number. The final day-offset additions retain their prescribed floating-point order.

This helper does not delegate to host Date.UTC or apply its constructor-specific 0–99 year mapping. Large year/month inputs can cancel into an ordinary year before calendar calculation. Tests cover negative components, leap centuries, month/day overflow, full Date endpoints, balanced large inputs and field round trips.

References: https://tc39.es/ecma262/#sec-makeday and engine262 abstract-ops/date-objects.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1. No guest Date API is enabled here.
