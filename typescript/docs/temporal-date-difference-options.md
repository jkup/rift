# Date difference options

Date and time differences share the ordered reads of largestUnit,
roundingIncrement, roundingMode and smallestUnit. Unknown unit spellings fail
during their read; recognized units in the wrong category are rejected after all
reads. Date differences allow year/month/week/day, default to days, and expand
the automatic largest unit to the selected smallest unit.

Date-unit increments use the general positive increment limit without time-unit
divisor restrictions. The helper returns the requested signed rounding mode;
the future since caller must apply the specification's sign/mode transformation.

References: [GetDifferenceSettings](https://tc39.es/proposal-temporal/#sec-temporal-getdifferencesettings)
and engine262 `18cdeb03c363eb31d775648a0d070bdc8a26ced1`.
Tests cover every date-unit pairing, coercion/error ordering, rounding modes and
increment bounds. Existing time-difference regressions protect the shared reads.
