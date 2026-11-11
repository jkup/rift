# Named timezone backend review

TS-477, 2026-11-11. **In progress; no named zones are enabled.**

C++ pins boa-dev/temporal `v0.1.2` and enables `compiled_data` in CMakeLists.txt.
The TypeScript timezone record instead stores one constant offsetNanoseconds.
Supporting named zones therefore requires more than identifier parsing: every
local projection and calendar operation must query an epoch-dependent provider.
The accepted UTC/fixed-offset behavior must remain intact during that migration.

The preferred direction to investigate is versioned IANA data transformed at
build time into immutable, typed tables, plus engine-owned transition/recurrence
logic. Avoid runtime dependence on the machine's timezone database or the pinned
host Date implementation, whose historical local-time mismatch is already
recorded in date-host-review.md. The compiler version remains pinned.

## Data contract to establish

The [IANA release index](https://www.iana.org/time-zones/releases) currently lists
2026f. Pin an exact source archive and its measured hash, generator revision and
build options; do not generate from a moving latest URL. Preserve the distribution
[license](https://data.iana.org/time-zones/tzdb/LICENSE). Most tz data/code is public
domain, with named source-file exceptions. The release source and generated output
must remain traceable and reproducible.

Use the upstream zic interpretation rather than inventing a partial tz source
parser. A build-time TZif reader can produce compact typed records. Follow
[RFC 9636](https://www.rfc-editor.org/rfc/rfc9636.html): validate counts, offsets,
transition ordering and indices, preserve second-resolution historical offsets,
and implement the footer recurrence instead of freezing the last table offset.
Use the initial type before the first transition. Reject missing/unspecified data
rather than silently inventing an offset. POSIX/Temporal time excludes leap seconds.

Identifier identity needs a separate review from shared transition data. Preserve
case-normalized input identifiers and primary identifiers separately; apply the
[ECMA-402 timezone rules](https://402.ecma-international.org/13.0/#sec-time-zone-names),
including UTC and zone.tab exceptions. A raw transitive Link resolution is not
sufficient. Data must stay stable for an engine instance.

Historical records are not a claim of perfect historical civil-time knowledge.
[IANA's scope](https://data.iana.org/time-zones/tzdb/theory.html#scope) explicitly
limits that claim. Record the chosen backzone/build policy and test it against the
same release, rather than treating a differently versioned Node database as truth.

## Runtime boundary to prove

Keep exact nanoseconds as bigint. Transition seconds within Temporal's range fit
safe integer numbers, but conversion must floor negative epochs correctly and
preserve subsecond precision. Build-time ingestion must safely handle TZif's wider
64-bit values and retain the offset needed at the supported range boundaries.

The provider needs offset-at-instant, adjacent-transition lookup and all possible
instants for a local date/time. Use binary search plus bounded nearby transitions;
future recurrence must compute the relevant year's transitions without scanning
hundreds of thousands of years. Validate full Gregorian recurrence, signed rule
times, non-hour changes, southern-hemisphere order and permanent-offset tails.

Follow [Temporal's timezone operations](https://tc39.es/proposal-temporal/#sec-temporal-time-zones)
for gaps/folds, disambiguation and start of day. Keep explicit offset options and
wall-clock disambiguation separate. Correct day length and calendar arithmetic
cannot assume 24 hours or subtract a single cached offset.

## Existing integration sites

The direct constant-offset consumers include local projection in
`temporal-zoned-date-time-object.ts`; interpretation, arithmetic and differences;
calendar/time rounding, carry and duration total; and the builtins for Instant
formatting, Now, zoned conversion, fields, parts, formatting and rounding.
Historical second offsets also require reviewing minute-only string formatting.
The current interpretation helper does not carry disambiguation, so replacing its
subtraction with a lookup alone would be incorrect.

Before enabling names, migrate these consumers through a reviewed provider API
while retaining fixed-offset expected results. Then test data lookup, recurrence,
local resolution, conversion and arithmetic as separate increments. Cover all
zone records at transition boundaries, aliases, range endpoints, gaps/folds,
non-hour transitions, date-line jumps, midnight changes, far-future recurrence,
Realm errors and execution budgets. Native static-only and parsed zero-dynamic
coverage remain mandatory.

Next evidence: obtain and inspect the pinned distribution; settle identifier and
build policy; measure generated table size and compile a representative typed
lookup/recurrence probe. This document does not yet establish native feasibility
or authorize guest admission from a small representative-zone test.
