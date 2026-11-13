# Date local conversion foundation

Pure helpers share the existing IANA/fixed-offset provider. They return local
fields, millisecond offsets and compatible local-to-instant results without
changing public Date behavior or storing mutable timezone state.

Instant inputs must be integral clipped Date milliseconds. Nominal local inputs
allow a one-day margin so boundary instants remain representable; conversion
then returns a clipped instant or NaN. Invalid inputs are rejected before bigint
conversion. Existing UTC field and Temporal instant guards remain unchanged.

Historical offset seconds remain exact. Local fields may extend beyond the
instant range, overlaps select the earlier instant, and gaps shift forward.
Fractional millisecond local inputs are outside this internal helper contract;
component construction already produces integral nominal milliseconds.

Focused tests pass on both hosts with all 736 analyzed native statements static.
All 963 Node regression cases, 35 runner tests and 296 tooling checks pass without
skips. The tooling run uses 15 predecessor binaries after whole-existing-source,
standalone-test amendment and executable-hash verification. The new standalone
Date helper entry has its own fresh native build and coverage gate.

The isolated foundation is ready for integration after preceding acceptance.
Realm configuration, public Date routing, parsing, formatting and CLI support
remain separate work under TS-526's review; public Date behavior remains UTC.
