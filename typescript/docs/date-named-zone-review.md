# Date named-zone integration review

TS-526 is complete as a bounded design review. Date retains its explicit UTC default. This review assesses
reuse of the accepted IANA provider; it changes no Date behavior, Realm setting
or CLI option and does not add system-timezone discovery.

Fourteen provider controls pass in independent Node Date processes configured
with `TZ` and in both Rift hosts through Temporal's compatible local-time
resolution. Explicit expected instants cover New York and Lord Howe gaps/folds,
Samoa's skipped day, Kathmandu's 15-minute change, Paris's historical second
offset, London's epoch offset, and both Date boundaries with adjacent overflow.
The original source, expected instants, process records and probe hashes are in
`build/date-named-zone-review/`. This establishes provider suitability, not
local Date implementation or general equivalence with Node's timezone data.

The [Date UTC conversion contract](https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-utc-t)
selects the earlier instant in overlaps and uses the pre-transition offset for
gaps. Local inputs near the instant bounds can lie outside the clipped Date
range. The existing compatible resolver handles the reviewed cases. Clipping
must follow local-to-instant conversion.

The source review identifies these integration requirements:

- Reuse the provider's offset and compatible-resolution operations. Keep the
  configured zone separate from each Date's millisecond value. Defining-Realm
  methods must use the correct Realm configuration, including cross-Realm calls.
- `dateTimeFields` currently rejects values beyond the instant limits. Local
  fields at a valid boundary can exceed those limits, so they need an explicitly
  bounded field-conversion path. Do not loosen TimeClip or Temporal instant guards.
- Component construction currently clips before returning. Separate nominal
  local milliseconds from final clipping; Date.UTC remains independent of the
  configured zone and retains its existing year conversion.
- ISO parsing currently collapses absent offsets into zero. Preserve the
  distinction between date-only, explicit-offset and offset-free date-time forms
  before choosing conversion. The display-string parser currently accepts only
  the engine's UTC suffix and also needs review.
- Local getters, setters and display formatting currently share UTC paths.
  Separate local field extraction and final conversion while retaining original
  value capture, argument coercion order, invalid-date behavior and slot writes.
  UTC methods, ISO output and instant conversion remain separate operations.

Six additional offset controls agree with exact expected provider seconds on
both Rift hosts. Independent Node Date preserves seconds in local clock fields
but truncates getTimezoneOffset to minutes in the Paris, New York and Kathmandu
historical cases. Its display strings omit offset seconds and parsing those
strings changes the instant by +21, -2 and +16 seconds respectively. Retain
these reference differences; do not round the provider's historical offsets.
Future getTimezoneOffset must preserve the fractional minute result.

Nine setter/parsing reference contracts cover mutation during coercion, invalid
dates, overlap selection, UTC independence and absent-offset parsing. The first
run retained three mismatches. One was a review expectation error: setYear(120)
means year 120, since only 0–99 receive the 1900 adjustment. Two are Node
setFullYear differences: argument coercion mutates the Date, and Node then uses
that mutated value. The specification captures the original value first. Two
reduced UTC controls confirm that both Rift hosts already preserve that ordering;
keep the existing behavior during timezone integration. The initial failed
report, corrected expectation and distinct reference outputs are retained.

Sources: [setFullYear ordering](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.prototype.setfullyear),
[offset calculation](https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-date.prototype.gettimezoneoffset),
and [display offset formatting](https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-timezone-string).

Integration decisions:

- Add pure local-field and compatible local-to-instant helpers first. Keep the
  existing UTC helpers and instant range guards intact. Check the local range
  margin independently before converting Number values to bigint.
- Configure a zone explicitly at the host/Realm boundary, validate it before
  guest execution, and store the parsed provider record per Realm. Default to
  UTC. No process-global mutable zone, environment-dependent native Date calls,
  system discovery, or guest-visible configuration property is needed. Test
  distinct Realm settings and borrowed methods in the later integration task.
- Preserve the original UTC display strings. Other whole-minute offsets can use
  the canonical zone identifier as their parenthesized display name. For
  historical sub-minute offsets, use a precise offset label such as
  `(UTC+00:09:21)` after the required `GMT+0009` part. The parser can recognize
  that engine-produced label, validate its consistency with the minute part and
  recover the exact instant. This avoids relying on ambiguous zone abbreviations
  or changing the required numeric display prefix. Validate this grammar and
  round trips in a separate formatting/parser assignment.
- Add a CLI configuration option only after constructors, local parsing,
  getters, setters and formatting all use the same Realm setting. Until then,
  helpers remain internal and existing Date behavior remains UTC.

The final evidence record is `build/date-named-zone-review/final-reviewed.json`:
14 provider controls, six offset controls, two reduced setter controls on both
hosts, and nine future integration reference contracts. It verifies the native
probe's original source snapshot and the later standalone-test-only amendment.
Configuration isolation and the proposed formatting grammar are implementation
acceptance requirements, not features claimed by this review.
