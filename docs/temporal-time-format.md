# Exact Temporal rounding and UTC formatting

Integer rounding supports all nine modes using exact quotient/remainder arithmetic.
Signed duration rounding and Instant rounding are distinct operations: Instant
rounding uses the as-if-positive rule, so trunc at a negative epoch value rounds
toward the beginning of time. Fixed vectors cover both signs, both tie parities,
odd increments, exact multiples and values beyond Number precision.

UTC formatting consumes a bounded nanosecond value and emits ISO date/time text
with auto, minute or fixed fractional precision. It preserves year zero, expanded
years and negative submillisecond values. Formatting does not round: callers round
first with the required semantics. Invalid precision/range returns null. Named
zones, guest option coercion and method registration are separate concerns.

The first native build crashed on a narrowing assertion. A three-line probe reduces
this to an indexed BigInt argument passed to a function that branches on its sign.
Changing the test's input iteration to for-of resolves it; production helpers are
unchanged. Original build/coverage failures and minimal before/after probes remain
under build/temporal-time-format-draft/build. Reviewed native coverage is fully
static with zero dynamic statements.

References: [Temporal rounding algorithms](https://tc39.es/proposal-temporal/#sec-roundnumbertoincrement),
[Instant formatting](https://tc39.es/proposal-temporal/#sec-temporal-temporalinstanttostring),
and [engine262 rounding at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/abstract-ops/temporal/temporal.mts).
