# Plain dates and date-times to zoned values

PlainDate and PlainDateTime expose toZonedDateTime for supported UTC/fixed offsets. PlainDate accepts a timezone directly or a wrapper carrying timeZone and optional plainTime. Its first timeZone property read is observable even for a branded ZonedDateTime; PlainDateTime timezone conversion reads branded slots directly. Exact offset projection applies before Instant range checks, and every result uses the defining Realm's intrinsic ZonedDateTime prototype.

Disambiguation validation is shared with zoned conversion. PlainDateTime reads only that option, after timezone conversion. Fixed offsets have one possible instant; all valid disambiguation values are equivalent. PlainDate's omitted time means start of day, with independent boundary validation.

Tests cover wrapper getters, slot bypass distinctions, coercion/error order, ignored options, required inputs, metadata, exact endpoints and Realm allocation. References: [PlainDate.toZonedDateTime](https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tozoneddatetime) and [PlainDateTime.toZonedDateTime](https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.tozoneddatetime). Named-zone disambiguation remains future work.
