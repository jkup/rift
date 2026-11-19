# ZonedDateTime local time replacement

withPlainTime preserves the receiver's local date and supported UTC/fixed offset, converts the supplied time through the shared Temporal path, and allocates a fresh intrinsic ZonedDateTime. Omission uses midnight. startOfDay performs the same midnight projection and ignores arguments. The local date-time is converted without prematurely applying Instant bounds; subtracting the offset precedes the final Instant range check.

Tests exercise exact nanoseconds, constrained fields, getter order, receiver-first errors, branded inputs, intrinsic Realm allocation, subclass overrides and both Instant endpoints. The fixed-offset policy has no gaps or overlaps; named-zone disambiguation remains future work.

References: [withPlainTime](https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.withplaintime), [startOfDay](https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.startofday), and GetEpochNanosecondsFor/GetStartOfDay. Acceptance requires full Node and focused native static-only zero-dynamic tests plus conversion/parts regressions.
