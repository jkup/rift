# ZonedDateTime fields

TS-410 adds local ISO calendar/time getters and offset/offsetNanoseconds using exact slot-based epoch projection. UTC and fixed offsets share the existing calendar-field implementation. The wider local date-time range preserves offset shifts at either Instant endpoint.

hoursInDay validates both local-midnight epochs before returning 24. Even fixed-offset days can throw RangeError at the Instant limits; returning a constant without those checks would be incorrect. Tests cover all getters and metadata, nanosecond precision, day/week rollover, endpoint projections, both midnight checks, slot branding, bypassed guest properties and defining-Realm errors.
