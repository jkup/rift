# Date named-zone integration review

TS-526 is in progress. Date retains its explicit UTC default. This review assesses
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

Before closing this review, check historical sub-minute offsets and display
round trips, setter mutation/order cases, invalid-date revival, and configuration
validation/Realm isolation. Define bounded implementation assignments only after
those decisions have explicit controls. Current UTC behavior and its original
tests must remain the default throughout.
