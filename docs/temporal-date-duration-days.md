# ISO calendar duration days

The shared helper implements DateDurationDays for already validated duration/date records. It constrains years/months/weeks at the relative date with days cleared, checks that calendar endpoint, then adds the original days as an exact integer. Time fields are ignored. Applying the whole duration as date arithmetic would incorrectly reject large day counts and count whole time days.

This is groundwork for duration comparison and relative duration APIs; no new public method is enabled here. Tests cover signed leap/month constraints, mixed units, full date boundaries and final day counts beyond date endpoints.

References: https://tc39.es/proposal-temporal/#sec-temporal-datedurationdays and engine262 abstract-ops/temporal/duration.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
