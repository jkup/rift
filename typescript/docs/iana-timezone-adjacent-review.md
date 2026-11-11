# Adjacent timezone transition implementation

TS-482 adds an internal strict previous/next transition query. It preserves the
historical arrays, skips unchanged offsets and combines historical search with
six bounded recurring-rule candidates. Exact BigInt comparisons distinguish a
transition instant from either neighboring nanosecond. Recurrence normalization
and transition-time calculation are shared with offset lookup.

The isolated implementation passes 104,113 historical checks and 96 reference
cases on both hosts, plus controls for all 317 unchanged entries, a distant
footer handoff, equal recurring offsets and invalid instants. Focused native
coverage is 283 static statements with zero dynamic operations. All six native
regression groups pass, and the full Node suite passes 945/945 without skips.

After sharing calendar calculations, production recurrence still passes all
200,490 cycle and 582 endpoint reference cases on both hosts. Evidence is in
`build/iana-adjacent-recurrence-results.json` and the focused/regression reports
under `build/iana-timezone-adjacent-draft/build/`.

Tooling validation is running. No named-zone guest admission or canonical runtime
changes have occurred; combined acceptance remains pending.
