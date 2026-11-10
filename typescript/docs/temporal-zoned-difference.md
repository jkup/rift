# ZonedDateTime differences

`until` and `since` convert the other value before reading difference options in order. They default to hours; time-unit differences permit different zones, while calendar-unit differences require matching canonical identifiers even for equal instants. Only ISO calendars and UTC/fixed-offset zones are supported.

The shared settings helper accepts an explicit hour default while retaining the PlainDateTime day default. Since negates the rounding mode before computation and negates the final duration afterward. Results use the defining builtin Realm's Duration prototype.

Regression coverage includes conversion and getter order, signed ties, checked boundary errors, equal and exact-nanosecond shortcuts, constrained month carry and the TC39 PR3319 calendar-window correction.
