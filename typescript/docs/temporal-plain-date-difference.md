# PlainDate differences

Until and since convert the other date before reading ordered difference options.
Differences default to days and support year/month/week/day precision, increments
and all signed rounding modes. Since reverses rounding direction and negates the
result; it does not swap the calendar endpoints, which would change asymmetric
month-end differences. Equal dates still validate options before returning zero.

The shared backend preserves exact day differences, actual calendar boundaries
and specified carries. Results are fresh Duration objects in the method's Realm.
Only ISO calendars are currently supported.

References: [DifferenceTemporalPlainDate](https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalplaindate)
and engine262 `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Tests cover asymmetry, direction, rounding, full-range dates, input/option order,
equal dates, metadata and Realm results. Shared integer rounding regressions are
required alongside the new native entry.
