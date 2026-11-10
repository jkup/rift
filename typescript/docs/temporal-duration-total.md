# Duration totals

Duration.prototype.total accepts unit strings or options. It validates the receiver first, reads relativeTo before unit, requires a unit and rejects auto. Without a relative date, calendar units in either the duration or requested result are rejected. Fixed units use exact nanoseconds; plain relative totals use the shared constrained calendar addition and exact calendar-window ratio.

All ten units and singular/plural names are supported with plain ISO relativeTo. Zoned inputs remain explicitly unsupported. Total validates the complete relative target date, whereas compare only validates calendar-unit endpoints before adding days. Tests preserve that distinction and cover options/coercions, metadata, receiver branding and defining-Realm errors.

References: https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.total and engine262 intrinsics/Temporal/DurationPrototype.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1.
