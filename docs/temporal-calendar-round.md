# Calendar rounding windows

Year/month/week rounding uses two calendar boundaries around the target date.
Their actual day distance determines progress, so leap years and unequal months
are preserved. Integer-scaled rational rounding handles all signed modes and
half-even parity without floating-point division. Results retain the selected
date duration, epoch day, and whether a later carry step is needed.

Both window boundaries must be representable, even when truncation would choose
the inner boundary. Month/year windows may shift once as required by the
specification. Day rounding and carrying into larger units remain separate.

References: [NudgeToCalendarUnit](https://tc39.es/proposal-temporal/#sec-temporal-nudgetocalendarunit),
ComputeNudgeWindow, and engine262 `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Tests cover signed ties, half-even parity, leap/month lengths, exact boundaries,
large increments, retained larger units and range failures.
