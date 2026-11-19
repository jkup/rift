# ZonedDateTime projections and replacement

TS-411 adds toInstant, toPlainDate, toPlainTime and toPlainDateTime, plus withTimeZone and withCalendar. Projections preserve nanoseconds and fixed-offset local fields; replacements preserve the epoch and produce fresh intrinsic ZonedDateTime objects. Supported timezone/calendar brands bypass guest properties, and receiver validation precedes argument handling.

Tests cover negative epochs, rollover, endpoint projections, metadata, fresh allocation, subclass behavior, overwritten constructors, branded inputs and defining-Realm result ownership. Named zones and non-ISO calendars remain unsupported.
