# Instant rounding and JSON serialization

Instant.round validates the receiver before reading options. It accepts a unit
string or an options object, reads increment/mode/unit in specification order,
and performs each conversion before continuing. Singular/plural time units are
supported; the positive integer increment must divide a day and fit its unit.
The exact as-if-positive backend determines negative and half-tie behavior.
Results are fresh base Instant objects from the builtin's defining Realm, without
consulting the receiver's constructor or species.

Branded toJSON emits the default exact UTC representation; JSON.stringify uses it
through the ordinary JSON hook. toLocaleString follows Temporal's specified
non-Intl UTC fallback and ignores its reserved arguments. Shared receiver and
allocation helpers serve construction, accessors and methods. toString options,
string parsing, timezone resolution and duration arithmetic remain separate.

Tests cover all rounding modes, unit sizes, inclusive day increments, truncating
increment conversion, bounds, getter/coercion order and abruptness, descriptors,
subclass/base allocation, cross-Realm calls and serialization hooks.

References: [Instant.round](https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.round),
[Instant.toJSON](https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tojson),
and [non-Intl locale fallback](https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tolocalestring).
