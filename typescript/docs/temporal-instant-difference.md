# Instant differences

Instant until/since reuse branded/string conversion before reading difference
options. Exact signed nanosecond differences are rounded and balanced to the
requested time unit, defaulting to seconds. Since negates the difference before
rounding, preserving directed and tie behavior for every rounding mode. Results
are fresh intrinsic Duration objects in the defining Realm.

This follows [DifferenceTemporalInstant](https://tc39.es/proposal-temporal/#sec-temporal-differencetemporalinstant)
and engine262 at `18cdeb03c363eb31d775648a0d070bdc8a26ced1`. The full Instant
range difference fits the internal time-duration bound. Tests cover range
endpoints, signed rounding, unsafe Number field conversion, option ordering,
metadata and Realm/subclass behavior. Combined acceptance remains pending.
