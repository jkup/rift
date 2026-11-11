# Named-zone local-time resolution review

TS-481 is a review task; no local-time implementation or guest admission changes
are accepted yet.

The pinned 440 records have at most eight distinct offsets each, including the
initial offset, historical transitions and both recurrence offsets. Every offset
is an integer number of seconds strictly within one day. Evidence is retained in
`build/iana-timezone-review/local-resolution-reference.json`.

This permits a bounded candidate algorithm: generate each zone's unique offset
set once, subtract each offset from the local nanoseconds, then check the actual
offset at that candidate. Return matching instants in ascending order. Do not
scan the transition history on every call. Convert nanoseconds to seconds using
BigInt floor division before Number conversion; truncation is wrong before the
epoch, and converting the whole nanosecond value loses precision.

## Range and ambiguity contract

[Temporal's timezone operations](https://tc39.es/proposal-temporal/#sec-temporal-time-zones)
distinguish a gap from an out-of-range matching instant. Matching candidates must
be range-checked, not silently discarded. A local time near a range endpoint can
have candidate instants outside it; internal offset evaluation therefore needs
a reviewed small margin beyond the public instant range. Keep the existing
public range checks intact.

For folds, earlier/compatible select the first instant and later selects the
last; reject fails. For gaps, use the offsets on the actual neighboring valid
local times. Start of day selects the first valid local time, which can be after
midnight or on the following date. Do not assume a one-hour gap or a 24-hour day.

The initial independent Node reference records 60 disambiguation/range cases and
three start-of-day cases: New York, Lord Howe, Samoa's skipped date, Paris's
historical second offset, negative subsecond instants, exact endpoints and
one-nanosecond failures. It retains 22 expected RangeErrors. These are controls,
not proof of complete release equivalence: Node uses 2026e, while Rift pins 2026f.

## Implementation order to review

Add bounded adjacent-transition queries over the historical table and recurrence
first. Ignore TZif entries that do not actually change offsets. Those queries
must support exact nanosecond boundaries, final-table handoff and range endpoints.
Then prove possible-instants and gap/start-of-day resolution, using the pinned
upstream reference for historical boundaries and version-stable Node controls.
Only after those layers pass should fixed-offset consumers migrate and guest
named identifiers become available.
