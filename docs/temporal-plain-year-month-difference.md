# PlainYearMonth differences

Until/since default to years and months. Only year/month units are accepted,
with the shared ordered difference-option reads. Since reverses rounding mode
and the resulting duration while preserving the calendar operands.

Equal stored ISO records return zero after option validation. Other inputs use
first-day calendar dates, enforcing PlainDate bounds; reference days do not
contribute to the duration. Exact one-month rounding skips calendar windows,
including at the maximum month. Other increments use exact relative calendar
rounding, where month/year lengths determine ties and carries.

Reference: [DifferenceTemporalPlainYearMonth](https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplainyearmonth)
and engine262 plain-year-month.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover all signed rounding modes, actual calendar lengths, year carries,
reference-day equality, first-day boundaries, ordered conversion/options,
metadata and defining Realm Duration results.
