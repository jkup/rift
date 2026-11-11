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
Use the initial type before the first transition. Reject malformed or missing
data. The treatment of historically unspecified local time needs a separate
policy review (see findings below). POSIX/Temporal time excludes leap seconds.

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

## Pinned data and first native evidence

Downloaded the exact 2026f archives and built upstream zic in the existing Ubuntu
WSL environment. Data SHA-256: `01b4a91cec5167ed48c11e8ab78f2048cead78ce94b0cafcad0ae8c5a3044d3d`;
code SHA-256: `5a18da01393679ef2559214dc687563f7f3d05691f6f58b7fbc0166f3e796cd6`.
Archive paths were checked before extraction; overlapping code/data files match.

The measured build uses `VERSION=2026f`, `PACKRATDATA=backzone`,
`PACKRATLIST=zone.tab`, POSIX time and `zic -b fat`, without range truncation.
The initial default make produced a dirty version label after finding no release
tag in the surrounding checkout; the explicit-version rebuild and original
archives are retained. The ECMA-402 discussion explicitly permits these packrat
settings with additional identifier post-processing.

The output has440 Zone records and158 Links,26448 transitions and94 distinct
nonempty footer rules. Zone files total463232 bytes; all use TZif version2 or3.
The reader validates headers/counts, ordered transitions, type indices and bounded
second offsets, and proves each Link file equals its target. Observed offsets
range from -57368 to54822 seconds. This inventory includes Factory and is not yet
a public identifier allowlist.

A468651-byte typed-table prototype passes52896 before/at-transition checks on
both Node and scriptc-native. Coverage reports26/26 static statements with no
dynamic tier. The test exercises the complete table representation and binary
search, but its expected boundaries derive from the same decoded TZif records;
it is a compiler/representation check, not independent timezone conformance.
It deliberately does not implement footer recurrence or guest admission.

Nineteen zone records contain a historical `-00` designation, including Factory
and inhabited/Antarctic zones. Rejecting every such record would be incorrect.
An initial Node comparison rejects Factory but accepts historical Cambridge Bay
and Casey with the encoded zero offset. Preserve this distinction and settle
the standards/data policy before choosing admission rules; Node alone is not
the authority for the complete identifier set.

Evidence: build/iana-timezone-review/provenance.json, original archives, build
logs, tzif-inventory.json and transition-probe-results.json. The next review
steps are identifier post-processing, future-rule semantics and independent
reference checks, followed by a reduced native recurrence probe. Canonical
Reflect/legacy source hashes remain unchanged.

## Recurrence and identifier evidence

A test-only C wrapper links the pinned upstream localtime.c and reads explicit
POSIX footer strings, without consulting the system timezone. It produces6846
reference offsets across all94 released footer rules and three synthetic rules
for Julian/day-of-year leap handling and continuous DST at a year boundary.
Samples include transition seconds and adjacent seconds, northern/southern and
negative-DST seasons, signed or extended rule times, years -271000 through275000,
and leap/century boundaries. This is a sampled range, not every Gregorian year.

The TypeScript recurrence prototype agrees with all6846 independent offsets on
both hosts;120/120 statements compile statically. Twelve malformed footer
controls are rejected by the build-time parser. Future-rule data can therefore
be parsed at generation time into typed records; the runtime need only perform
bounded calendar calculations. A complete400-year-cycle comparison remains a
useful stronger gate before production acceptance.

The candidate identity mapping covers598 identifiers and450 primary identities.
It preserves zone.tab identities, applies backzone mappings and the specified
Jan_Mayen country exception, and normalizes UTC primary identity separately from
the retained input identifier. Node agrees with all597 identifiers it accepts;
Factory remains a deliberate unresolved admission question. For example,
Pacific/Truk equals Pacific/Chuuk but not Pacific/Port_Moresby, although the
compiled raw Link points to Port_Moresby. Alias data must follow the chosen
primary record so identity and offset behavior cannot diverge.

The Node reference uses ICU78.3/tzdata2026e, while the candidate data is2026f.
Its identity comparisons are useful evidence, but it must not override the
pinned release’s changed offsets. Raw process transcripts, generated cases, both
native reports and artifact hashes are retained under the review directory.
No canonical runtime files changed.

## Reviewed implementation sequence

The full400-year Gregorian cycle plus the earlier extreme-year controls now
passes200490 upstream-reference offsets on both hosts,126/126 static statements.
The initial standalone typecheck lacked explicit Node types for fs; its diagnostic
and the follow-on missing-helper invocation are retained. Adding --types node
fixed the harness setup; recurrence semantics and reference values did not change.

The internal backend is ready for bounded implementation slices: first versioned
typed data and transition lookup (TS-478), then recurrence, then identifier/local
time resolution, then migration of every fixed-offset consumer. Keep guest names
disabled until all required layers and combined native tests pass. The provider
retains encoded historical offsets, including zero in records marked -00; it does
not claim historical certainty or substitute a guessed offset.

Factory remains an internal data/control record during these slices. Public
admission policy must be decided explicitly in the identifier task, preserving
its distinction from historical -00 records in real locations. This deferred
policy does not block table/recurrence implementation, and must not disappear
from the later guest-admission checklist.

## Exact endpoint correction before recurrence implementation

TS-479 review found a limitation in the recurrence prototype: calculating the
neighboring year's transition through `isoDateToEpochDay` throws at the exact
Temporal range endpoints. The previous extreme-year samples did not reach those
endpoints. The original failure is now reproduced and retained on both hosts.

Recurrence repeats every 146,097 days: the Gregorian 400-year cycle preserves
month/day rules, leap years and weekdays. A corrected probe maps the instant's
day into the 2000–2399 cycle while preserving its second within the day, then
calculates the adjacent years normally. This keeps calendar calculations away
from range guards without relaxing the supported instant range. The mapping
applies only to recurring rules, never to historical transition-table lookup.

The corrected probe passes all 200,490 prior upstream-reference cases and 582
new cases at and adjacent to both exact endpoints, covering all 94 released
footers and three synthetic rules on both hosts with zero dynamic operations.
The upstream C reference receives the original extreme seconds, not the mapped
seconds. Evidence is retained in `build/iana-timezone-review/recurrence-*-endpoint-*`
and `recurrence-bounded-cycle-probe-results.json`. Production recurrence must
retain this endpoint coverage; the earlier prototype is not suitable unchanged.
