# PlainTime field replacement

`PlainTime.with` screens the partial object before reading time fields. The
currently implemented PlainTime brand is rejected without accessing properties;
calendar and timeZone are then read in order and must both be undefined. Instant
is deliberately not a prohibited brand. New date-related Temporal brands must
extend this screening when introduced.

Fields are read and converted in alphabetical order: hour, microsecond,
millisecond, minute, nanosecond, second. Undefined fields retain the receiver's
internal values, but at least one recognized field must be supplied. Finite
integer conversion is shared with the constructor. Constructor undefined
arguments still default to zero before conversion.

After all fields are read, the overflow option selects constrain (the default)
or reject. Constrain clamps each field independently; it does not balance values
into adjacent units. Non-finite inputs fail during conversion even in constrain
mode. A fresh intrinsic PlainTime is created in the defining Realm.

The method follows [Temporal PlainTime with](https://tc39.es/proposal-temporal/#sec-temporal-plaintime-prototype-with)
and was compared with engine262's PlainTimePrototype.mts at revision
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Tests cover preserved and replaced
fields, inherited properties, truncation/negative zero, per-field constraints,
read/coercion order and abrupt completion, prohibited partial objects, subclasses,
internal-field access, metadata and Realm ownership. Evidence is retained in
build/temporal-plain-time-with-* and the isolated draft; combined acceptance is
required before publication.
