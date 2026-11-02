# TS-032B expectation inventory (before implementation)

Base b029661. All 212 cases and 37 gates remain; no historical evidence edits.

* realms M1 and number-conversions metadata: Number keys valueOf -> toString,valueOf.
* number-conversions string hint: tag -> 2; canonical/toString/tag -> canonical/toString reads; 3 -> 2 ticks. Numeric/default unchanged.
* number-conversions deleted/noncallable/object-returning valueOf fallback: tag -> 2; remove tag lookup; 4 -> 3 ticks; calls remain 2/1/2.
* fixtures/number-conversions computed box key: tag -> 2 on same line.
* abstract-equality C14 and array-string-conversion C8 string hint: tag -> 2.
* primitive-reads V20 (2).toString(): tag -> 2.
* delete-operator E22/E23 Number(12) key: tag -> 12.

Retain borrowed Object.toString tags/ticks, Object.valueOf identity/boxing, other receiver-family negatives, primitive-only converter errors, both-object/null-root errors, numeric consumers, namespace ten properties/noncallability and historical evidence. Extend existing object-valueof driver; preserve existing fixture error locations.
