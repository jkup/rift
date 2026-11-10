# Date field getters

Date now exposes local and UTC getters for every calendar/time field. Both use the explicit UTC timezone policy; getTimezoneOffset returns positive zero for valid dates and NaN for invalid dates. Months and weekdays are zero-based. The legacy getYear method subtracts 1900 from the full year.

Methods read the stored Date value, bypass guest coercion hooks and retain slot branding after prototype changes. Tests cover every local/UTC field, leap/negative/full-range dates, invalid dates, metadata and defining-Realm errors.

Reference: https://tc39.es/ecma262/#sec-properties-of-the-date-prototype-object.
