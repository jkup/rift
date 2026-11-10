# Duration sign transformations

`Duration.negated` and `Duration.abs` read branded internal fields and return fresh
intrinsic Duration objects. Negation reverses nonzero fields; absolute value makes
them nonnegative. Every zero remains positive zero. Neither method reads public
field overrides, constructors or subclass hooks.

This follows [Duration negated](https://tc39.es/proposal-temporal/#sec-temporal-duration-prototype-negated)
and abs, with engine262's CreateNegatedTemporalDuration reviewed at revision
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests cover all fields, blank durations,
unsafe subsecond integers, bounds, metadata, subclass results and Realm ownership.
The initial test reused a non-writable host-defined global between its two Realm
cases; the corrected test creates fresh Realms per method. Its failure and the
separately validated correction are retained in the draft build directory.
Evidence is under build/temporal-duration-sign-*; combined acceptance is pending.
