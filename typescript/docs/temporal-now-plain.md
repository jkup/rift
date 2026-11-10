# Temporal Now plain ISO projections

TS-408 adds plainDateTimeISO, plainDateISO and plainTimeISO for the default UTC zone and supported explicit UTC/fixed-offset strings. Timezone conversion and input budgeting precede clock access; non-string arguments are rejected without invoking coercion hooks. Each call reads the defining Realm's clock once and allocates a fresh intrinsic result with the ISO calendar where applicable.

Offset shifts use the wider PlainDateTime epoch range, including the day adjacent to each Instant endpoint. Tests cover timezone formats, ignored date components in timezone strings, offset day rollover, metadata, error ordering, fresh results, overwritten constructors, defining-Realm ownership and endpoint shifts. Named IANA zones, ZonedDateTime arguments and zonedDateTimeISO remain unsupported.
