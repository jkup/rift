# Legacy Date year setter

TS-404 implements Annex B setYear using MakeFullYear, including the historical 0–99 mapping. It recovers invalid dates from epoch zero, snapshots fields before observable argument conversion and preserves the original time within day. Tests cover fractions, leap-day overflow, coercion side effects and abrupt completion, clipping, frozen objects, branding and defining-Realm errors.

Reference: https://tc39.es/ecma262/multipage/additional-ecmascript-features-for-web-browsers.html#sec-date.prototype.setyear
