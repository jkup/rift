# Named-zone consumer migration review

TS-485 inventories 24 Temporal consumer/contract files against the frozen IANA
foundation snapshot. The machine-readable inventory retains source hashes and
matching lines in `build/iana-timezone-review/consumer-inventory.json`. Named-zone
guest admission must follow this migration; accepting identifiers alone would
expose constant-offset behavior.

## Findings

- `temporal-time-zone-parse.ts` represents every zone with a permanent offset.
  Add a discriminated fixed/named representation and common operations for
  offset-at-instant, local fields, possible instants, resolution, day boundaries,
  transitions and identity. Named records must not carry a fabricated zero offset.
- `builtins/temporal-zoned-conversion.ts` and `temporal-plain-to-zoned.ts` validate
  disambiguation but discard it. Preserve its value through field resolution,
  string conversion and `with`, without changing observable getter/coercion order.
- `temporal-zoned-interpret.ts` ignores the record's start-of-day distinction and
  subtracts one offset. It also lacks a string-versus-object offset matching mode.
  Route wall times through local resolution, date-only input through day start,
  and supplied offsets through candidate matching before disambiguation.
- `temporal-zoned-date-time-object.ts`, `builtins/temporal-now.ts` and Instant
  formatting read a permanent offset. Query the actual instant; formatting must
  account for rounding across a transition. System-zone policy remains separate.
- `builtins/temporal-zoned-date-time-fields.ts` hardcodes 24 hours and formats
  offsets as whole minutes. `temporal-zoned-date-time-parts.ts` subtracts the
  current offset for midnight/withPlainTime. Use independently resolved day
  boundaries and preserve historical offset seconds in the offset getter.
- `builtins/temporal-zoned-transition.ts` always returns null. Connect the strict
  adjacent-transition provider after preserving direction conversion and errors.
- `temporal-zoned-arithmetic.ts` performs date addition correctly as a separate
  stage, but converts its destination using the origin's offset. Resolve the
  destination local time before adding elapsed time units.
- `temporal-zoned-difference.ts`, `temporal-zoned-calendar-carry.ts`,
  `temporal-zoned-calendar-round.ts`, `temporal-zoned-time-round.ts` and
  `temporal-zoned-duration-total.ts` construct calendar boundaries with one
  offset. Migrate the whole chain, including negative differences and rounded
  windows. A helper substitution alone does not prove those calendar algorithms.
- Zoned round, string and conversion builtins retain fixed-offset assumptions.
  Review day-length rounding, offset defaults for `with`, and precision after
  rounding. `formatUTCOffsetMinutes` cannot serve both exact offset getters and
  rounded historical string offsets.
- Equality and calendar-unit differences compare display identifiers directly.
  Compare named primary identities while keeping named UTC distinct from the
  fixed `+00:00` zone. Preserve the normalized input identifier for display.

## Specification checkpoints

[Offset interpretation](https://tc39.es/proposal-temporal/#sec-temporal-interpretisodatetimeoffset)
separates wall, exact and option paths, candidate offset matching, minute matching
for applicable strings, and disambiguation.
[Day start](https://tc39.es/proposal-temporal/#sec-temporal-getstartofday) and
[hoursInDay](https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.hoursinday)
use actual day boundaries.
[Zoned addition](https://tc39.es/proposal-temporal/#sec-temporal-addzoneddatetime)
and [differences](https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetime)
require calendar-aware intermediates.
[Zone equality](https://tc39.es/proposal-temporal/#sec-temporal-timezoneequals)
uses zone identity rather than an instant's coincident offset. Read the full
algorithms during implementation, including range guards and option ordering.

## Reference controls and migration order

`consumer-reference.json` records 32 independent Node scenarios: New York gaps
and folds, Lord Howe's half-hour change, Samoa's skipped date, Sao Paulo/Havana
midnight changes, historical Yangon/Monrovia second offsets, all sixteen
fold offset/disambiguation combinations, minute/exact parsing and alias identity.
Records include day-versus-24-hour arithmetic, fields, strings, transitions,
rounding and differences. Two RangeErrors are expected: reject disambiguation
with an ignored fold offset, and an object offset that only matches to minutes.
The eight scenario starting offsets agree with pinned upstream IANA C; that
cross-check is not a claim that all Node 2026e data equals Rift's pinned 2026f.

First establish one tagged zone/provider contract and migrate instant-based
consumers. Then migrate interpretation/options and calendar operations, carrying
expected-result tests through both hosts. Add named-zone guest parsing only after
every permanent-offset shortcut is gone or confined to the fixed-zone branch.
Before admission, include negative calendar differences, both fold occurrences,
rounding across transitions, subminute offset strings, aliases, endpoint failures
and observable option/property ordering. Keep system timezones and Intl separate.

## Consumer migration in progress (TS-486)

The isolated draft replaces permanent offsets with tagged fixed/named zone
operations. Interpretation retains disambiguation and exact/minute offset
matching; fields, formatting, calendar arithmetic and rounding query the zone
at the relevant instant or local boundary. Named-zone guest parsing remains
closed until migration acceptance.

Calendar windows preserve the full start-duration zero test from
[TC39 PR3319](https://github.com/tc39/proposal-temporal/pull/3319), merged as
7083e8c46165c37cb871a21d60ca19e219e77ede after consensus on 2026-05-19.
The proposal page and Node retain the older smallest-unit-only condition.
Reference differences are checked using independent date addition to compute
both boundaries and exact BigInt distance/span comparisons. The three existing
fixed-offset regression tests remain unchanged.

The full Node suite passes 948/948 with no skips. All 1,107 focused consumer
checks, plus historical offset and identity controls, pass both hosts; native
coverage is 20,281 static statements and zero dynamic. Ten of the 970 calendar
rows have verified PR3319 corrections, with the original Node results retained.
A broader matrix passes 82,800 cases on both hosts (718 static statements, zero
dynamic): 82,675 match Node exactly and 125 have independently checked PR3319
corrections. It covers UTC, New York, Lord Howe, Apia and Paris, signed differences,
rounding modes/increments and Instant endpoints. There are no unexplained
reference differences.

Evidence under `build/iana-timezone-review/` includes
`consumer-calendar-reference.json`, `consumer-calendar-consensus-corrections.json`,
`consumer-difference-round-probe-results.json` and
`consumer-difference-round-fixture-reference.json`. Initial failures and the
rejected smallest-unit-only implementation remain in the isolated draft's build
directory. Final native regressions must match its frozen source hashes; tooling
and combined integration acceptance remain pending.

Two provider return-type assertions isolate scriptc's indexed BigInt widening.
The provider validates candidate bounds; the assertions do not coerce values.
See [the reduced compiler controls](validation/ts-486-indexed-bigint/README.md).
