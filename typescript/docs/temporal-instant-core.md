# Temporal.Instant object boundary

Each Script Realm owns a Temporal namespace and an ordinary Instant prototype.
Instances store exact epoch nanoseconds in a branded GuestTemporalInstant object.
The constructor requires new, performs ToBigInt and range validation before
reading newTarget.prototype, and allocates through the existing Realm-aware
constructor-prototype helper. Subclasses retain their prototype; static factories
always use the builtin's defining Realm intrinsic.

fromEpochNanoseconds uses ToBigInt; fromEpochMilliseconds uses ToNumber and
rejects fractional/nonfinite/out-of-range input. Epoch getters require the brand.
Milliseconds use floor division, so -1 nanosecond exposes -1 millisecond.
valueOf rejects implicit numeric conversion. Descriptor and metadata tests cover
the namespace, constructor, factories and accessors.

The original C++ corpus remains untouched. Its nanosecond-as-Number expectation
and constructors called without new are incompatible with Temporal semantics.
This slice does not implement string parsing/formatting, from/compare, arithmetic,
Now, other Temporal types or named zones; those are separate successors.

References: [Instant constructor and methods](https://tc39.es/proposal-temporal/#sec-temporal-instant-objects)
and [engine262 Instant at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/Temporal/Instant.mts).
