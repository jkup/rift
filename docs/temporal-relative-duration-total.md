# Plain relative duration totals

The helper adds the duration to midnight at its relative ISO date, balancing all day/time units before calendar addition. Unlike comparison, total() validates the resulting date. Equal targets return zero before PlainDateTime range checks, so the minimum PlainDate midnight has a zero-result shortcut but rejects nonzero differences.

Fixed units use exact elapsed nanoseconds. Year/month/week totals reuse signed calendar windows, including the existing shifted-window rule, and convert the complete ratio once. Negative fractions borrow across midnight before calendar differences. No approximate year/month lengths or host Temporal calls are used.

Tests cover leap and end-of-month fractions, both signs, all units, midnight borrow, equal-target shortcuts and target/window bounds. Public option dispatch is a subsequent task.

References: https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.total, DifferencePlainDateTimeWithTotal and NudgeToCalendarUnit; engine262 temporal duration/plain-date-time abstract operations at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
