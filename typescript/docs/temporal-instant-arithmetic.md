# Instant arithmetic

Instant add/subtract share duration conversion with Duration.from and PlainTime.
They reject nonzero date components after conversion, combine time fields as
exact BigInt nanoseconds and check the resulting epoch range before allocation.
Results use the defining Realm's intrinsic prototype, including subclass calls.

This follows [AddDurationToInstant](https://tc39.es/proposal-temporal/#sec-temporal-adddurationtoinstant)
and engine262's abstract-ops/temporal/instant.mts at
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. Subtraction negates the exact amount
without allocating an intermediate guest Duration. Tests cover range endpoints,
unsafe integers, signed arithmetic, conversion order and Realm ownership.
Combined acceptance remains pending.
