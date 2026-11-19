# Temporal Duration construction

The new-only Duration constructor converts ten optional fields in argument order.
Undefined becomes zero; other inputs must convert to finite integral Numbers.
Unlike PlainTime construction, fractional values are rejected, not truncated.
After all conversions, shared duration validation rejects mixed signs or exact
range violations before accessing newTarget.prototype.

Each Realm owns the Duration prototype. Ten branded field accessors, sign and
blank read internal records; valueOf always throws. Subclasses and cross-Realm
newTarget fallback follow the existing constructor protocol. Zero fields are
stored as positive zero. Parsing, formatting and arithmetic are separate work.

The implementation follows [Temporal.Duration](https://tc39.es/proposal-temporal/#sec-temporal-duration)
and the constructor in engine262 at `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Tests cover all fields and metadata, numeric and sign boundaries, observable
conversion/prototype order, public overrides, subclasses and Realm ownership.
Evidence is retained in build/temporal-duration-core-*; combined acceptance is
required before publication.
