# Temporal Now core

TS-406 creates the Realm-owned Temporal.Now namespace with instant and timeZoneId. The engine's timezone identifier is UTC. Instant uses the existing Realm-local clock boundary at millisecond resolution, scales exactly to nanoseconds and allocates a fresh intrinsic Instant. It does not call guest Date methods or guest Temporal constructors.

Tests cover clock-read count, fresh allocation, negative and endpoint epochs, namespace descriptors, receiver independence, overwritten constructors, defining-Realm clocks/prototypes and invalid host-clock failures. Calendar projections and zonedDateTimeISO remain follow-ups.

Reference: https://tc39.es/proposal-temporal/#sec-temporal-now-object
