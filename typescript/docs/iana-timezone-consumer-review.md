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

The isolated migration has 1,107 consumer checks plus historical offset parsing
and identity controls. An initial both-host pass matched Node, but the full Node
suite then reported 945/948: three existing calendar-rounding regressions caught
an incorrect change to the lower window boundary. This version is not accepted.

Preserve the full start-duration zero test from
[TC39 PR3319](https://github.com/tc39/proposal-temporal/pull/3319), merged as
7083e8c46165c37cb871a21d60ca19e219e77ede after consensus on 2026-05-19.
The proposal page and Node retain the older smallest-unit-only condition.
Named-zone reference differences must be explained using independently computed
calendar boundaries, as in the existing fixed-offset review. Do not weaken the
three existing tests to match the older oracle.

The native compiler needs explicit return-type boundaries on the two
local-time provider calls. Reduced successful and failing controls are in
[the indexed BigInt report](validation/ts-486-indexed-bigint/README.md).
Full migration acceptance and named-zone guest admission remain pending.

The full-duration zero rule is restored in the isolated draft. All three
original regression tests pass again under Node. Ten of the 970 new calendar
rows have independently verified consensus corrections: native Temporal date
addition computes each bounding instant, and exact BigInt distance/span
comparison selects the expected endpoint. The original Node observations remain
in `consumer-calendar-reference.json`; the corrections and boundary evidence are
in `consumer-calendar-consensus-corrections.json` under `build/iana-timezone-review/`.
All 1,107 consumer checks now pass under Node without removing any rows.
Full-suite and native reruns are pending.

The corrected full Node suite passes 948/948 with no skips. The focused native
consumer check passes with 20,281 static statements and zero dynamic statements.
A broader direct-operation matrix passes 82,800 cases on both hosts (718 native
static statements, zero dynamic): 82,675 match Node exactly and 125 have checked
PR3319 corrections, with no unexplained differences. It covers UTC, New York,
Lord Howe, Apia and Paris, signed differences, rounding modes/increments and
Instant endpoints. This extends the focused checks without replacing them.
Evidence is `consumer-difference-round-probe-results.json` and
`consumer-difference-round-fixture-reference.json` in `build/iana-timezone-review/`.
The final frozen-source regression run and tooling gates remain pending.
