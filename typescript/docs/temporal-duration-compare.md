# Duration comparison

Temporal.Duration.compare converts both operands before reading relativeTo. Equal stored fields return positive zero after options validation, even when calendar units would otherwise require a relative date. Unequal calendar durations require a plain relative date; years/months/weeks use constrained ISO calendar arithmetic, with original days added separately. Both time totals use exact nanoseconds and retain the duration magnitude limit.

Absent relativeTo and plain ISO strings, property bags, PlainDate and PlainDateTime are supported. Timezone-dependent relativeTo remains explicitly unsupported. This implementation does not use a host Temporal implementation or approximate month/year lengths.

Tests cover signed and sub-double-precision differences, calendar ties, leap/end-of-month behavior, endpoint shortcuts, overflow, getter order, option validation, metadata and defining-Realm errors.

References: https://tc39.es/proposal-temporal/#sec-temporal.duration.compare and engine262 intrinsics/Temporal/Duration.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
