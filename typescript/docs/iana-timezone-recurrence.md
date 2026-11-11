# IANA footer recurrence

The internal offset provider combines historical transition records with typed
POSIX footer rules generated from the pinned IANA 2026f release. Named guest
identifiers and local-time resolution remain disabled.

Each zone references one of 94 generated recurrence records. The build-time
parser handles constant offsets, Julian and ordinal days, month/week/weekday
rules, signed transition times and explicit daylight offsets. Runtime code uses
typed records; it does not parse strings or consult the host timezone.

Historical lookup preserves the table's initial offset and transition ordering.
At and beyond the final transition, the provider evaluates recurrence. Recurrence
maps the day into an equivalent Gregorian 400-year cycle before calculating
neighboring years, preserving the second within the day. This avoids calendar
range guards at the exact Temporal endpoints. Historical table lookup never
uses this mapping. Invalid or out-of-range epoch seconds return null.

Both hosts pass 4,962 independently referenced full-zone offsets covering all 440
records, historical and table/footer boundaries, and exact range endpoints. The
focused native driver has 203 static statements and zero dynamic operations;
six existing regression groups pass. A separate production-code driver passes
200,490 full-cycle reference cases and 582 endpoint cases across all 94 released
rules and three synthetic Julian/ordinal/year-boundary rules on both hosts.
Reference offsets come from the pinned upstream C implementation at the original
instants. Twelve malformed parser controls and eight generator integrity controls
also pass. All 943 Node guest cases, 15 tooling builds, 296 tooling tests and
16 parent-envelope checks pass. The isolated draft is validated; combined
integration acceptance remains pending.
