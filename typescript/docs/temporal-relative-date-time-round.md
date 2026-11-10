# Relative date-time rounding

The relative-rounding path combines unrounded ISO differences with exact
calendar or day/time nudges. Expanding results carry into larger calendar units
at the origin's clock time. A crossed boundary replaces lower units and time,
as required by BubbleRelativeDuration; it does not recompute a difference from
the nudged endpoint.

PlainDate rounding shares the same carry helper using midnight records. These
internal records retain calendar-date bounds, including midnight on the minimum
date. Equal inputs and exact one-nanosecond rounding return without constructing
extra calendar windows. Unit-name mapping now lives with the pure duration-unit
helpers so standalone arithmetic does not import runtime option machinery.

References: [RoundRelativeDuration](https://tc39.es/proposal-temporal/#sec-temporal-roundrelativeduration)
and [BubbleRelativeDuration](https://tc39.es/proposal-temporal/#sec-temporal-bubblerelativeduration),
plus engine262 duration.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
Tests cover signed ties, clock-sensitive month carries, asymmetric month ends,
calendar replacement, internal bounds, exact nanoseconds and unchanged Date
rounding behavior. Public until/since methods remain separate.
