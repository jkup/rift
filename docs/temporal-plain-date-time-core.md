# PlainDateTime core

The ISO-only constructor converts nine date/time arguments in order, validates
the calendar, checks strict date-time bounds, then resolves the newTarget
prototype. Optional time arguments default to zero. Date and time accessors are
branded; calendar values share the implementation used by PlainDate.

Existing PlainDate.from, PlainTime.from and calendar conversion recognize the
new internal brand without reading public overrides. Both existing with methods
reject a PlainDateTime partial before reading calendar/timeZone properties.
Prototypes and results remain Realm-owned.

References: [PlainDateTime constructor](https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime)
and engine262 `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Tests cover all accessors, argument/error/prototype order, exact boundaries,
subclasses, existing conversion paths and cross-Realm behavior. DateTime
formatting, conversion methods and arithmetic remain follow-ups.
