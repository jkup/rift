# PlainTime conversion and comparison

`PlainTime.from` accepts a branded PlainTime, a Temporal time string or a property
bag with at least one recognized time field. It returns a fresh intrinsic object.
Objects are read as fields without primitive coercion; missing fields default to
zero. Branded inputs use internal fields and bypass public overrides. String
parsing charges work before scanning. Overflow options are validated after the
input, including for branded objects and strings. Field regulation is shared
with `with`, preserving constrain/reject behavior and property-read ordering.

`compare` converts left before right and compares all six time fields in order.
`equals` checks its receiver before converting the other value. Malformed strings
throw RangeError; they do not produce false. Conversion does not consult calendar
or timeZone properties on property bags. Future PlainDateTime/ZonedDateTime
objects need dedicated brand branches when those types are introduced.

These paths follow [ToTemporalTime](https://tc39.es/proposal-temporal/#sec-temporal-totemporaltime),
PlainTime.from/compare/equals and the reviewed engine262 Temporal implementation
at `18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests check independent expected
values, all field comparisons, coercion and option order, abrupt completion,
subclasses, metadata, resource cleanup and defining-Realm ownership. Existing
constructor/with and Instant conversion tests provide regression checks.
Evidence is retained under build/temporal-plain-time-conversion-*; combined
acceptance remains required.
