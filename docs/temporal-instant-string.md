# Instant string formatting

`Temporal.Instant.prototype.toString` supports automatic or 0–9 fractional digits,
minute through nanosecond units, all nine rounding modes, and UTC or direct
fixed-minute offset strings. Default output ends in `Z`; an explicit zone includes
its normalized offset. Local date fields can extend one day beyond Instant's
epoch bounds; the existing UTC conversion remains range checked.

Options are observed in specification order: fractional digits, rounding mode,
unit, then time zone. Known but disallowed units are rejected after reading the
time-zone property; an unknown unit is rejected before that read. Time-zone values
must already be strings. Named zones, ISO date-time zone identifiers and remaining
zone grammar return `runtime.temporal-time-zone`, including inputs whose eventual
validity is not implemented. They are not silently treated as UTC or classified as
guest errors. No host Date, Intl or RegExp backend is used.

The precision helper isolates a pinned scriptc limitation: narrowing a reassigned
number/string union does not admit arithmetic, even after `typeof`. The same
narrowing on a helper parameter compiles. The initial failure, parameter control,
failed local guard and final reduced before/after pair are retained under
`build/temporal-instant-string-draft/build/precision-*`.

Review sources: [Temporal Instant.toString](https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tostring),
[fractional digits](https://tc39.es/proposal-temporal/#sec-gettemporalfractionalseconddigitsoption),
and [engine262 InstantPrototype at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/Temporal/InstantPrototype.mts).

Focused cases cover exact output, negative rounding, local range endpoints,
coercion and abrupt ordering, unsupported zone provenance, metadata and defining
Realm errors. Validation logs use `build/temporal-instant-string-*`; full combined
integration acceptance remains required.
