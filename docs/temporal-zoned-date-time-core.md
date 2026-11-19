# ZonedDateTime core

TS-409 introduces branded Temporal.ZonedDateTime construction with an exact Instant-range epoch, UTC or minute-precision fixed offset, and ISO calendar. The constructor accepts raw timezone identifiers, not the richer ISO strings accepted by timezone conversion. Core getters expose epochNanoseconds, floor-based epochMilliseconds, timeZoneId and calendarId. The prototype is an ordinary object with no instance slots.

Timezone/calendar conversion recognizes the new brand without reading guest properties; partial-object operations reject it before getters. Tests cover coercion/error order, range boundaries, metadata, direct-identifier grammar, subclass/newTarget behavior, defining-Realm errors and cross-Realm slot access. Formatting, additional getters, object/string conversion, arithmetic and named IANA zones remain separate work.
