# Named timezone admission review

TS-487 admits pinned IANA identifiers through the shared timezone parser in an
isolated successor to the READY consumer migration. The engine change is one
parser fallback; every public Temporal consumer already uses the general zone
provider. Existing numeric-offset parsing is unchanged.

The Node guest suite passes 949/949 with no skips. All 1,170 public behavior
controls pass both hosts, including constructors/from, gap/fold options, plain
date/time conversions, skipped dates, Instant formatting and Now factories.
Native coverage is 20,252 static statements and zero dynamic statements.
The 35 runner tests, ownership checks and Node observation codec also pass.
All eight native regression groups, 15 tooling builds, 296 tooling tests and
both-host codecs/envelopes pass. The isolated owned snapshot is READY; combined
integration remains pending the foundation freeze.

A separate public-API matrix passes 1,794 checks on both hosts: all 598 identifiers
in original, lower and upper case, their registered spelling, epoch-zero offsets
and primary alias equality. Node agrees for 597 identifiers. Factory is the
explicit exception already resolved in the [identifier review](iana-timezone-identifier-review.md):
IANA declares it a valid Zone with an unspecified designation and encoded zero
offset. It retains its own identity; Etc/Unknown remains invalid. The
[ECMA-402 enumeration](https://tc39.es/ecma402/#sec-availablenamedtimezoneidentifiers)
includes IANA Zone and Link names. Node's Factory rejection remains recorded.

Known-zone examples formerly testing unsupported inputs now have positive
coverage; their rejection slots use unknown identifiers. Original C++ fixtures
are untouched. Evidence is in the isolated draft's build directory and in
`build/iana-timezone-review/named-admission-reference.json`,
`public-identifier-reference.json` and `named-identifier-public-probe-results.json`.
Canonical foundation inputs and the READY predecessor remain frozen.
