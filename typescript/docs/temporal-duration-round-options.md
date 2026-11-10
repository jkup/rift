# Duration rounding options

The shared settings reader accepts a smallest-unit string or options object. It reads largestUnit, relativeTo, roundingIncrement, roundingMode and smallestUnit in that order. The default largest unit is the larger of the duration's existing largest unit and the requested smallest unit; omitted smallestUnit defaults to nanoseconds. At least one unit option must be present, and largestUnit:auto counts as present.

Time increments must be proper divisors of their radix. Date increments above one require matching largest and smallest units. The default mode is halfExpand. Calculation and result creation remain separate.

Tests cover all unit-order pairs, all rounding modes, default derivation, ordered coercions, abrupt precedence and increment constraints. References: Temporal Duration.prototype.round and engine262 DurationPrototype.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
