# Duration rounding

Duration.prototype.round uses the shared ordered settings reader. Without relativeTo, it rounds exact day/time nanoseconds and balances into the requested largest unit; calendar units require a relative date. Plain relative rounding reuses the date-time difference/window/carry implementation, with a zero-target shortcut before DateTime endpoint checks.

Results use the method's intrinsic Duration prototype and Realm. Zoned inputs remain explicitly unsupported. Tests cover all nine modes and signs, proper increments, time balancing, leap-month ties, calendar carries, equal-target and magnitude boundaries, receiver branding, getter order and cross-Realm results/errors.

References: https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.round and engine262 DurationPrototype.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
