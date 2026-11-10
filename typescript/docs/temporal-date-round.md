# Relative ISO date rounding

The helper combines unrounded calendar differences with exact calendar windows or
signed integer day rounding. Expanded results follow BubbleRelativeDuration's
larger-unit boundary checks. Exact one-day precision preserves the original
unrounded record; equal dates return zero without building a rounding window.

Day rounding can produce a duration whose added endpoint exceeds the PlainDate
range. Calendar rounding and carry boundaries still require representable dates.
Carrying replaces the lower fields as specified, rather than recomputing a new
unrounded difference and accidentally reintroducing discarded precision.

References: [RoundRelativeDuration](https://tc39.es/proposal-temporal/#sec-temporal-roundrelativeduration),
NudgeToDayOrTime, BubbleRelativeDuration, and engine262
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Tests distinguish exact versus expanded days, month/year/week carries, signed ties,
large increments, equal dates and range behavior. Guest methods remain pending.
