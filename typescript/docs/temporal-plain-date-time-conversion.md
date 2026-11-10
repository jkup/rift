# PlainDateTime conversion

from, compare and equals share conversion to validated ISO date-time records.
Internal DateTime values are cloned without reading public properties; PlainDate
values contribute midnight. Property bags read calendar first, then combined
fields in lexical order, then overflow. String grammar errors precede options;
valid syntax outside the DateTime bounds fails after options.

Results use the defining Realm's intrinsic prototype, regardless of the static
method receiver. Comparison uses exact nanoseconds only after both operands
have been converted in order. Parsing and calendar scanning charge work to the
operation context; no host Temporal or Date implementation executes guest code.

References: [ToTemporalDateTime](https://tc39.es/proposal-temporal/#sec-temporal-totemporaldatetime)
and engine262 plain-date-time.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover clones, subclasses, property overrides, date-to-midnight bounds,
conversion/option order, metadata, Realm ownership and resource-limit cleanup.
ZonedDateTime conversion remains dependent on the future timezone subsystem.
