# Zoned difference implementation review

Do not directly reuse `roundDateTimeDifference` for ZonedDateTime.until/since. A read-only experiment compared that candidate against Node 26.13.0 in 1,296 cases across UTC/fixed offsets, calendar units, rounding modes and Instant endpoints. It found 196 differences: 192 candidate results where zoned evaluation throws RangeError, and four different rounded duration values. No production behavior changed during this review.

The 192 range differences require a zoned algorithm. Calendar rounding checks both window endpoints as instants. Time rounding relative to a calendar duration checks the start and next/previous day's endpoint even when truncation would keep the original duration. Plain date-time helpers use different bounds and do not perform those zoned checks. Preserve these operations explicitly when implementing the fixed-offset path; a constant offset does not erase their observable errors.

The four ordinary month/week differences are an upstream oracle issue, not a Rift regression. From 2020-01-31T12:34:56.123456789 to 2020-03-01 at the same time, rounding to weeks with largestUnit months and halfExpand currently returns P1M1W in Node; Rift returns P1M. The older proposal text tests whether the smallest rounded unit is zero before using the origin as the window start. That loses a retained nonzero month. [TC39 proposal-temporal PR 3319](https://github.com/tc39/proposal-temporal/pull/3319), merged after consensus on 2026-05-19, corrects the test to check the entire start duration. Pinned engine262 revision 18cdeb03c363eb31d775648a0d070bdc8a26ced1 implements that correction. Keep Rift's calendar-added start boundary; do not change it just to match this Node result.

The next implementation should:

- Default largestUnit to hours, with exact instant subtraction for time units, allowing different timezone identifiers.
- Require equal canonical timezone identifiers for calendar units, including UTC versus +00:00.
- Preserve conversion and options order before equality shortcuts and range-sensitive work.
- Implement zoned calendar windows, day-span rounding and calendar carry with checked intermediate instants.
- Retain the upstream corrected full-duration zero test and verify since rounding polarity independently.

References: [DifferenceTemporalZonedDateTime](https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalzoneddatetime), [NudgeToZonedTime](https://tc39.es/proposal-temporal/#sec-temporal-nudgetozonedtime), [ComputeNudgeWindow](https://tc39.es/proposal-temporal/#sec-temporal-computenudgewindow), and the merged correction above. Experiment and exact rows: `build/audit-zoned-difference-reuse.mjs` and `build/zoned-difference-reuse-audit.json`. The proposal document's calendar-window condition predates the consensus correction; consult the implementation and merged change alongside it.

## Isolated implementation checks

TS-427–432 implement the fixed-offset difference pipeline in separate drafts: calendar decomposition, checked calendar rounding, checked time rounding, calendar carry, composition, then public until/since integration. The canonical Duration/Date validation snapshot remains unchanged while these successors are tested.

Unrounded differences pass 7,200 differential cases; calendar rounding and time rounding each pass 12,960. The composed rounder checks 49,680 cases: 49,605 match Node exactly, and 75 independently verified deviations follow PR3319. These also cover retained years when rounding months, and retained years/months/weeks when rounding days. For each deviation, native Temporal date addition independently computes the corrected start/end instants, the target is strictly less than halfway through that window, and Rift returns that start duration. No unexplained deviation is accepted. The test harness's initial invalid subsecond increments are retained separately; corrected cases use divisors of 1,000.

Evidence: `build/temporal-zoned-{difference-record,calendar-round,time-round,difference-round}-oracle.json`, with initial reports preserved. Full Node, focused native static-coverage and regression checks are recorded separately per successor. These checks are not combined acceptance or a change to the 190-completion corpus count.
