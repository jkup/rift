# ZonedDateTime rounding

round shares the ordered Temporal time-rounding options and rounds relative to local midnight. Day rounding validates both bounding day starts before rounding progress through the day. Smaller units use local ISO rounding and the prefer-offset interpretation path, including its local-date precheck. A one-nanosecond quantum returns a fresh intrinsic copy without range-sensitive local reconstruction.

Tests cover all nine rounding modes, day ties before the epoch, increments, offset day carry, option order, Realm allocation and boundary failures. The UTC/fixed-offset policy has constant day lengths; named-zone day-length and disambiguation support remains future work. Reference: [ZonedDateTime.prototype.round](https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.round). Full Node and focused native/static coverage plus regressions gate acceptance.
