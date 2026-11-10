# Date construction and core methods

Date instances own a clipped millisecond value, including NaN for invalid dates. The prototype is an ordinary object with no Date slot. Construction supports current time, direct Date cloning without coercion hooks, one-argument primitive conversion and ordered component conversion. Date.UTC shares component conversion and the constructor-specific 0–99 year rule. The engine's default local timezone is UTC.

The only host operation is current epoch milliseconds. A Realm-local clock provider supports deterministic embedding/tests; a null provider selects the host clock. Calls and cross-Realm methods use their defining Realm's clock. Invalid host-clock values are host faults, not guest errors.

Core methods include now/parse/UTC, getTime/valueOf, ISO/UTC/date/time/full string formatting, the toGMTString alias and generic Symbol.toPrimitive. Date branding survives prototype relinking, and prototype fallback follows newTarget's Realm. Getters, setters, JSON and locale fallbacks are follow-ups.

Tests cover construction/coercion order, invalid values, Date-slot branding, cloning without hooks, subclassing, primitive hints/descriptors, aliases, required string round trips, independent clocks and cross-Realm errors/prototypes. A test initially inspected the legacy profile through the Script-only globalObject accessor; it was corrected to inspect legacy bindings, with the initial test retained.

References: https://tc39.es/ecma262/#sec-date-constructor, https://tc39.es/ecma262/#sec-properties-of-the-date-prototype-object and the Date host review. Modern Date.prototype has no DateValue slot (unlike pre-2015 editions).

The first full Node run exposed six stale exact-global-key expectations. The shared literal builtin inventory now includes Date after Temporal, matching its registration order. The initial 876/882 log is retained; the corrected full run passes 882/882 without skips.
