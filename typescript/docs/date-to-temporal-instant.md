# Date to Temporal Instant

TS-413 adds Date.prototype.toTemporalInstant. It validates the Date brand, rejects invalid dates with RangeError and scales the stored integer milliseconds exactly to nanoseconds. It reads no guest conversion hooks and creates a fresh intrinsic Instant in the method's defining Realm.

Tests cover both range endpoints, negative and fractional/clipped inputs, mutated and frozen dates, subclassing, prototype relinking, ignored arguments, metadata, overwritten constructors and cross-Realm results/errors.
