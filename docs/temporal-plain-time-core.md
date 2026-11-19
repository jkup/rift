# Temporal PlainTime core

`new Temporal.PlainTime(hour, minute, second, millisecond, microsecond, nanosecond)`
creates a branded object with six immutable internal numeric fields. Missing or
undefined arguments default to zero. Other arguments are converted in order,
must be finite, and truncate toward zero. Field ranges are checked after all six
conversions, before observing `newTarget.prototype`; negative zero becomes positive
zero. Calling without `new` throws before coercion.

Each Realm owns its prototype. Subclass construction and foreign `newTarget`
fallback use the existing constructor-prototype operation. Accessors require the
brand even when invoked across Realms; their TypeErrors use the defining Realm.
Public property changes cannot change the internal time. `valueOf` always throws.
Parsing, formatting, arithmetic, equality and comparison remain follow-up work.

Review sources: [Temporal.PlainTime](https://tc39.es/proposal-temporal/#sec-temporal-plaintime)
and [engine262 PlainTime at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/Temporal/PlainTime.mts).
The original C++ PlainTime fixture calls its constructor without `new`; its bytes
remain unchanged, and passing it is not an acceptance criterion for that call.

Focused tests cover conversion and error order, endpoints, descriptors, subclass
construction, prototype getter timing and cross-Realm behavior. Logs and reports
use `build/temporal-plain-time-core-*`; combined integration acceptance is required.
