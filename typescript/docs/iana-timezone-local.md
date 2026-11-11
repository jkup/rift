# Production named-zone local-time resolution

TS-484 adds possible instants, all four disambiguation modes and start of day.
Each zone computes its unique offsets once in descending order. Subtracting
those offsets yields candidate instants in ascending order, without scanning
historical tables per local-time lookup. Exact BigInt arithmetic retains
nanoseconds and floors negative instants before offset lookup.

Matching out-of-range candidates remain range failures, distinct from gaps.
Gap resolution uses actual adjacent offset changes; start of day chooses the
first valid instant, including midnight gaps and skipped dates. The shared
bounded offset provider replaces the prototype's separate endpoint logic.

The focused production test passes on both hosts with 345 static statements
and zero dynamic operations. It checks 63 independent semantic controls,
precomputed offset completeness/order, nanosecond fold candidates, clock gaps
and exact instant endpoints. Eight data-generator corruption controls and ten
identifier binding controls pass with updated provenance. All seven native
regression groups and 947 Node guests pass without skips. Production code passes
182,917 historical candidate cases, 731,668 disambiguation checks, 81,201 day-start
cases, 200,490 recurrence cycle cases and 582 recurrence endpoints on both hosts.
All 15 native tooling builds, 296 tooling tests, eight codec checks per host
and 16 parent-envelope checks pass. Generator and inherited-source checks
are the final isolated readiness gate.

Implementation is isolated in `build/iana-timezone-local-draft/`. Canonical
foundation inputs remain frozen, and guest named-zone admission is unchanged.
