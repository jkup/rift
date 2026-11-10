# Duration balancing

Shared balancing splits signed BigInt time into duration fields from a selected
largest unit, retaining date components and adding day carry only for date units.
It checks the normalized time bound before converting individual fields to
Number and validates the combined record afterward. Largest-unit selection is
ordered from years through nanoseconds; a blank duration selects nanoseconds.

This follows [TemporalDurationFromInternal](https://tc39.es/proposal-temporal/#sec-temporal-temporaldurationfrominternal)
and DefaultTemporalLargestUnit, reviewed against engine262 at
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`. String rounding now uses this helper
without changing precision or carry behavior. Tests cover every largest unit,
both signs, exact reconstruction, calendar carry and representable Number fields.
Combined acceptance remains pending.

The initial native test hit SC1090 for a computed property key. The four-statement
reduction and initial report are retained under build. Replacing only the test
record construction with explicit fields preserves every assertion. Full Node
validation before that repair and focused Node/native validation afterward use
unchanged production sources.
