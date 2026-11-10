# Duration conversion and field replacement

`Duration.from` clones branded internal records, parses primitive strings, or reads
duration property bags in alphabetical order. Missing properties default to zero;
at least one recognized field is required. Objects are not coerced to primitives.
String scanning charges work before parsing and respects resource-limit cleanup.

`Duration.with` preserves missing receiver fields and reads the replacement
object's public properties, including when it is itself a Duration. This differs
from `from`'s branded fast path. Both methods validate combined signs and bounds
after field conversions and create fresh intrinsic results in the defining Realm.
Integral conversion is shared with the constructor; its ordering is unchanged.

This follows [ToTemporalDuration](https://tc39.es/proposal-temporal/#sec-temporal-totemporalduration)
and Duration.with/ToTemporalPartialDurationRecord, reviewed against engine262 at
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests cover all fields, exact fractions,
inherited properties, public overrides, abrupt completion, sign errors, branding,
subclasses, metadata and Realm/resource behavior. Evidence is retained under
build/temporal-duration-conversion-*; combined acceptance remains required.
