# PlainDateTime part methods

Part extraction returns fresh intrinsic PlainDate and PlainTime objects from
internal fields. withCalendar uses existing ISO calendar conversion, while
withPlainTime uses existing PlainTime conversion and defaults undefined to
midnight. Replacing time validates the combined DateTime bounds: midnight on
the earliest representable date is outside the DateTime range.

References: [PlainDateTime prototype](https://tc39.es/proposal-temporal/#sec-temporal-plaindatetime-prototype)
and engine262 PlainDateTimePrototype.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover field preservation, fresh intrinsic results, ignored public
properties, time-field read order, lower-bound failure, metadata and Realm
ownership. Calendar support remains ISO-only.
