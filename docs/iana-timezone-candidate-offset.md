# Bounded timezone candidate offsets

TS-483 shares the historical and recurring offset providers with a bounded
local-time variant. The existing public APIs retain their exact Temporal instant
range guards. Internal local-time lookup accepts at most two additional days on
either side, allowing candidate matching to distinguish gaps from range errors.
Invalid, fractional and unbounded inputs still return null.

The focused test passes on both hosts with 228 static statements and zero
dynamic operations. All 6,160 endpoint cases across 440 zones match the pinned
upstream IANA C implementation. Tests retain public guard checks, reject values
outside the internal margin and compare historical boundaries through both APIs.

All six native regression groups pass. Using the shared production offset
provider, the local-time prototype passes 63 semantic controls and 182,917
historical cases on both hosts. Production recurrence passes 200,490 cycle
cases and 582 endpoint cases on both hosts.

The full Node suite passes 946/946 without skips. All 15 tooling builds,
296 tooling tests, eight codec checks per host and 16 envelope checks pass.
The implementation is integrated; combined milestone acceptance remains pending.
Guest named-zone admission remains disabled. Independent
reference and focused reports live in `build/iana-timezone-review/` and
`build/iana-timezone-candidate-offset-draft/build/`.
