# Instant conversion and comparison

Instant.from clones branded instances into a base Instant in the builtin's Realm.
Other objects undergo string-hint primitive conversion; only primitive strings
are then accepted. Parsing work is charged before scanning, and malformed or
out-of-range strings produce RangeError. Other primitive kinds produce TypeError.

Instant.compare converts left before right and compares exact nanoseconds.
Instant.prototype.equals validates its receiver before converting its argument.
Both reuse the conversion helper; temporary Instant allocations needed only for
an internal comparison are elided. No guest constructor, species or epoch accessor
is consulted for branded instances. ZonedDateTime support remains separate.

Tests cover exact large comparisons, coercion order and abrupt completion, ignored
static receivers, subclass cloning, metadata, cross-Realm allocation/errors and
uncatchable resource exhaustion. Full combined milestone acceptance is separate.

References: [ToTemporalInstant](https://tc39.es/proposal-temporal/#sec-temporal-totemporalinstant)
and [engine262 instant operations at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/abstract-ops/temporal/instant.mts).
