# ZonedDateTime transition queries

getTimeZoneTransition validates the receiver and required next/previous direction, including object getters and string coercion, before returning null. Every currently supported timezone (UTC and minute fixed offsets) has no transitions. Missing arguments are TypeError; missing or invalid direction properties are RangeError. Named-zone support must replace the constant result with database-backed transition lookup.

Tests cover both directions and Instant endpoints, required options, abrupt getters, metadata, receiver-first validation and defining-Realm errors. Reference: [getTimeZoneTransition](https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.gettimezonetransition). Full Node and focused native checks gate acceptance.
