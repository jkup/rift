# Named-zone adjacent transitions

The internal transition query returns the first offset change strictly after an
instant or the last strictly before it. Guest named-zone APIs remain disabled.

Historical lookup binary-searches the preserved transition times with exact
BigInt nanosecond comparisons and skips entries whose offsets do not change.
Future lookup inspects six recurring rule candidates around the relevant year,
using calendar/cycle calculations shared with offset lookup. It checks each
candidate's actual before/after offsets, so equal offsets and coincident events
do not automatically count as changes. Candidates before the footer interval or
outside the instant range are excluded.

If a query precedes the footer interval, recurrence search starts from the
table's final entry. This preserves a future recurring transition even when it
is many years beyond the query. Historical and recurring candidates are compared
together to select the closest valid transition.

The focused test retains 104,113 independently derived historical boundary
checks and 96 Node reference cases, including future years and exact range
endpoints. It also checks all 317 unchanged-offset entries, a distant footer
handoff, equal recurring offsets and invalid instants. Typechecking and focused
Node execution pass. Focused native coverage is 283 static statements with zero
dynamic operations; all six regression groups and 945 Node guests pass. The full
production recurrence corpus still passes 200,490 cycle and 582 endpoint cases
on both hosts after sharing calendar math. Tooling and integration acceptance
remain pending.
