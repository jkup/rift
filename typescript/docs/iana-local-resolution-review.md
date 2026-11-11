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

## Complete historical transition evidence

The pinned upstream C implementation independently supplies 52,896 before/at
offsets for every stored transition. It identifies 26,131 offset changes and
317 unchanged-offset entries. Changes range from -86,400 to +86,400 seconds;
the minimum spacing between actual changes in one historical zone is 344,400
seconds. These are measured properties of this release, not general timezone
assumptions or a reason to omit future-rule checks.

A reduced exact-nanosecond wrapper around the production offset provider passes
79,344 checks on both hosts, at one nanosecond before, exactly at, and one
nanosecond after every stored transition. It applies BigInt floor division before
Number conversion and preserves public instant-range rejection. Static-only and
zero-dynamic gates pass. Raw C output, change classification and native results
are retained under `build/iana-timezone-review/transition-*`.

Adjacent-transition lookup must skip unchanged offsets, compare instants strictly
for previous/next queries, and combine historical candidates with nearby recurring
rule instants. Future candidates require actual before/after offset checks too:
coincident rules or equal standard/daylight offsets need not cause a transition.
Keep the original historical arrays and boundary evidence intact when choosing
the search representation.
