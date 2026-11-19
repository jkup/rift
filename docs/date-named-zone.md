# Realm-configured local Date

The third Realm constructor argument selects a validated timezone identifier;
omitting it preserves UTC. Named zones, aliases and fixed minute offsets use the
existing Temporal provider. The setting belongs to the defining Realm and does
not read or modify the host process timezone.

Component construction, offset-free ISO date-time parsing, local getters and
setters, and display/locale fallback formatting share that setting. Date-only
ISO strings, explicit offsets, UTC methods, numeric construction and Date cloning
retain their existing meanings. Local conversions resolve overlaps to the earlier
instant and move gaps forward, then apply TimeClip. Local fields can extend past
the instant bounds without prematurely rejecting a valid boundary instant.

Setters preserve the original Date value across argument coercion. Invalid-date
revival follows the specified nominal local epoch. Historical offsets retain
seconds, including fractional getTimezoneOffset minutes. Display strings retain
the GMT minute prefix and include an exact UTC offset label when seconds are
needed for lossless parsing of the engine's own whole-second output.

The focused tests cover every local setter family, coercion, range boundaries,
cross-Realm calls, parsing and display round trips. The independent review's 29
source programs run in strict and non-strict modes on both Rift hosts. Retained
Node differences for historical offsets and two setter coercion cases are
explicit in the review; they are not used to weaken expected results.

All 964 Node regression cases, 35 runner tests and 296 tooling checks pass with
no skips. Focused native execution and all 58 controls per host pass. The focused
driver, diagnostic probe and 15 tooling drivers have fresh static-only builds
and parsed zero-dynamic coverage. Canonical combined validation passes.
CLI configuration is covered in [CLI timezone selection](../README.md#build-and-run).
System timezone discovery and Intl remain outside this feature. See
date-named-zone-review.md for the semantic review and references.
