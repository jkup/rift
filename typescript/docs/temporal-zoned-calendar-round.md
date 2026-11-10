# Zoned calendar rounding windows

The pure zoned calendar rounder computes year/month/week/day bounding durations, projects both local endpoints through the fixed offset, and rejects either endpoint outside Instant bounds. Exact rational selection reuses the shared signed rounding operation. Retained larger units keep their calendar-added window start, following TC39's merged PR3319 correction rather than Node's older zero-smallest-unit condition.

Day windows preserve the existing years/months/weeks and round only the residual day count. Both bounds are validated even when truncation would select the valid one. Calendar carry and time-unit rounding are separate follow-ups before public zoned differences.

Tests cover all signed day-tie modes, nanosecond calendar ties, increments, retained larger units and both endpoint failures. References: ComputeNudgeWindow/NudgeToCalendarUnit and [TC39 PR3319](https://github.com/tc39/proposal-temporal/pull/3319). Full Node and focused native checks plus calendar regressions gate integration.
