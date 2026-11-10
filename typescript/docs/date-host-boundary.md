# Date host boundary review

Pinned scriptc 0.4.7 / Windows x64, Node 26.13.0; 2026-11-10.
Guest Date is not registered by this review.

The expanded UTC probe passes static-only compilation and parsed coverage
(35 static statements, zero dynamic) on both hosts. It covers TimeClip endpoints
and overflow, truncation and positive zero, invalid ISO errors, expanded years,
UTC field extraction, leap/century/month rollover, ISO offsets and invalid
components, and setters reviving invalid dates. Fixed expected results are
asserted; field extraction rows are compared between hosts. An initial expected
month-rollover value omitted year zero's leap day; corrected to January 31 of
year 1 after checking the Gregorian calendar. The initial report is retained.
These checks support a narrow UTC/clock boundary, not complete Date conformance.

Local-time checks compile with eight static statements and zero dynamic, but
only the UTC environment agrees. Fresh processes with TZ=America/New_York or
TZ=Europe/London disagree on historical offsets and modern DST behavior.
For example, at 2024-03-10T06:30Z under America/New_York, Node reports 01:30
with offset 300 minutes; native reports 07:30 with offset -60. Construction,
local parsing and setters also disagree around transitions.

The installed runtime's scr_lib.c routes Windows local conversion through
localtime_s (scr_date_localtime). Outside the CRT's supported year range it
uses a calendar-equivalent surrogate year, explicitly sacrificing historical
zone data. Microsoft's [CRT TZ contract](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/tzset?view=msvc-170)
uses a three-letter name and numeric offset format, not IANA zone identifiers.
This explains why forwarding Node's TZ setting is not a portable boundary.

Before guest Date local operations are accepted, choose and validate a common
time-zone provider or a clearly documented host configuration contract.
Do not silently map IANA identifiers to fixed offsets, force all local calls to
UTC, or claim a passing UTC probe proves local-time parity. UTC calculations,
TimeClip, explicit ISO parsing/formatting and the clock can be developed
separately. Guest coercion, slots, metadata and errors still belong to Rift.

References: [ECMAScript Date](https://262.ecma-international.org/16.0/#sec-date-objects),
pinned runtime node_modules/@scriptc/cli-win32-x64-msvc/dist/lib/runtime-sources/src/scr_lib.c.
Evidence: build/date-host-review/{utc,local}.ts, results.json,
initial-results.json and local-results.json. No compiler or corpus changes.
