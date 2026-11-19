# ZonedDateTime inputs to plain conversions

Shared PlainTime, PlainDate and PlainDateTime conversion recognizes ZonedDateTime internal slots and projects the instant through its supported UTC/fixed offset. Guest calendar, date and time getters are bypassed. Existing overflow validation and intrinsic allocation remain in the shared callers, including from, compare, equals and replacement APIs.

Tests cover throwing shadow getters, negative subsecond epochs, offset day boundaries, option validation and coercion, subclasses, detached prototypes, the extended local minimum and defining-Realm allocation. Named zones and non-ISO calendars remain outside the supported scope.

References: Temporal [ToTemporalTime](https://tc39.es/proposal-temporal/#sec-temporal-totemporaltime), [ToTemporalDate](https://tc39.es/proposal-temporal/#sec-temporal-totemporaldate), and [ToTemporalDateTime](https://tc39.es/proposal-temporal/#sec-temporal-totemporaldatetime). Integration requires full Node tests, focused static-only native execution with zero dynamic coverage, and plain conversion regressions.
