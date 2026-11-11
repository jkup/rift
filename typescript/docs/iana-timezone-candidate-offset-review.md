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

The implementation remains isolated. Regression, recurrence and full-suite
validation are pending; guest named-zone admission remains disabled. Independent
reference and focused reports live in `build/iana-timezone-review/` and
`build/iana-timezone-candidate-offset-draft/build/`.
