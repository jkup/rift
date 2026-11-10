# Unrounded zoned difference records

The internal fixed-offset difference operation separates calendar units from exact elapsed time. It compares local times to decide whether to borrow a day, projects the intermediate date at the original clock time, validates that intermediate instant, then computes ISO calendar units and the remaining nanoseconds. Equal instants and same-local-date inputs have explicit fast paths.

Constant offsets require at most one local-day correction. Named zones can require additional candidates and must implement the full correction loop before extending this backend. Rounding windows, day-span checks and public until/since remain separate follow-ups, as recorded in the zoned difference review.

Tests cover signs, month ends, week/day splitting, fractional precision, offsets and endpoints. Reference: [DifferenceZonedDateTime](https://tc39.es/proposal-temporal/#sec-temporal-differencezoneddatetime). Full Node and focused native checks plus existing difference/arithmetic regressions gate integration.

The first test draft assumed a leap-day anniversary balanced to one year; ISO date difference correctly returns eleven months and thirty days before the remaining 23 hours. That expectation was corrected. Native compilation then exposed the previously reduced BigInt array-index widening limitation: explicit test-pair undefined guards fix the call sites without changing production code. Initial test/build reports remain in build. A 7,200-case unrounded differential oracle agrees with Node across calendar units, signs, fixed offsets and endpoints.
