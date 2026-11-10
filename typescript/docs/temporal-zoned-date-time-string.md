# ZonedDateTime formatting

TS-414 adds toString/toJSON and a non-Intl locale fallback. Formatting rounds the exact Instant epoch before projecting into the supported UTC/fixed-offset zone, then emits local ISO fields, the selected offset and timezone/calendar annotations. toString reads and validates options in normative order; JSON and locale fallback ignore their arguments.

Tests cover precision, all rounding modes, negative ties, day carry, endpoint shifts, display annotations, option getter/error order, metadata, JSON integration, branding and defining-Realm errors. The locale method is a deterministic fallback, not ECMA-402 formatting.
