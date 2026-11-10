# Exact time records

`temporal-time.ts` owns the six-field `TimeFields` type, range validation and exact
conversion to/from nanoseconds within one day. Conversion rejects negative or
next-day values; callers that require wrapping must request it explicitly before
conversion. Whole seconds and fractional nanoseconds are bounded integers before
conversion to BigInt.

The ISO calendar backend now shares these operations when splitting/joining epoch
nanoseconds. Date ranges and floor division for negative epochs are unchanged.
PlainTime's branded object and the formatter use the shared pure record type.
This prepares PlainTime rounding/string options without routing time-only work
through a calendar conversion.

Tests check fixed independent values, all 1,440 minute positions with nonzero
seconds/fractions, unit boundaries, invalid fields and ISO endpoint round trips.
The initial native build succeeded but coverage reported a dynamic computed-key
write in the test's invalid-field generator. A nested-loop reduction reproduces
that report; explicit test-record fields retain the same cases with zero dynamic
operations. The production helpers needed no compiler workaround.

Evidence uses `build/temporal-time-*` and the draft's `build/keyof-message-*`
reductions. The existing ISO/Temporal specification review applies; no new guest
methods are registered in this prerequisite. Combined acceptance remains required.
