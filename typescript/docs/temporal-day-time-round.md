# Day/time nudging

Valid ISO date-time difference records combine day fields and exact time before
rounding. Calendar fields are preserved. Calendar largest units split the
rounded result into whole days and time; time-only largest units keep the entire
amount in nanoseconds. Expansion compares signed whole-day changes, including
the specified zero-equals-zero case.

Nudged epoch values are internal arithmetic endpoints and may lie outside the
public DateTime range. Later calendar bubbling applies its own date bounds.
This helper consumes validated ISO differences; public option validation is a
separate step.

Reference: [NudgeToDayOrTime](https://tc39.es/proposal-temporal/#sec-temporal-nudgetodayortime),
and engine262 duration.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover all signed day ties, midnight carries, calendar retention, time-only
units, exact/zero cases, internal endpoints and large day increments.

Native review reduced an SC2009 runtime-type failure to importing pure unit math
through temporal-options.ts. Unit lengths now live in the pure temporal-time.ts
module; existing options exports remain compatible. The standalone old/new
import probes and initial native failure are retained under build.
