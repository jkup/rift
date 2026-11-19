import { carryZonedCalendarDifference } from "../src/temporal/temporal-zoned-calendar-carry.js";
import { dateDuration } from "../src/temporal/temporal-calendar-round.js";
import { parseTemporalInstant } from "../src/temporal/temporal-instant-parse.js";
import { parseTemporalTimeZoneIdentifier } from "../src/temporal/temporal-time-zone-parse.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
const zone = parseTemporalTimeZoneIdentifier("+05:30");
const first = parseTemporalInstant("2020-01-31T12:00Z"),
    month = parseTemporalInstant("2020-02-29T12:00Z"),
    year = parseTemporalInstant("2021-01-31T12:00Z");
if (zone === null || first === null || month === null || year === null) {
    throw new Error("input");
}
const raw = { date: dateDuration(0, 0, 0, 29), time: 0n };
let result = carryZonedCalendarDifference(first, zone, raw, month, "months", "day", 1);
check(
    result !== null && result.date.months === 1 && result.date.days === 0,
    "exact leap month carry",
);
result = carryZonedCalendarDifference(first, zone, raw, month - 1n, "months", "day", 1);
check(
    result !== null && result.date.days === 29 && result.date.months === 0,
    "one nanosecond before boundary",
);
result = carryZonedCalendarDifference(
    first,
    zone,
    { date: dateDuration(0, 11, 0, 31), time: 0n },
    year,
    "years",
    "day",
    1,
);
check(
    result !== null &&
        result.date.years === 1 &&
        result.date.months === 0 &&
        result.date.days === 0,
    "month then year carry",
);
result = carryZonedCalendarDifference(
    month,
    zone,
    { date: dateDuration(0, 0, 0, -31), time: 0n },
    first - 2n * 86400000000000n,
    "months",
    "day",
    -1,
);
check(
    result !== null && result.date.months === -1 && result.date.days === 0,
    "negative constrained month carry",
);
result = carryZonedCalendarDifference(
    first,
    zone,
    { date: dateDuration(0, 0, 0, 7), time: 0n },
    first + 7n * 86400000000000n,
    "weeks",
    "day",
    1,
);
check(result !== null && result.date.weeks === 1 && result.date.days === 0, "week carry");
const utc = parseTemporalTimeZoneIdentifier("UTC");
if (utc === null) {
    throw new Error("UTC");
}
check(
    carryZonedCalendarDifference(
        8640000000000000000000n,
        utc,
        { date: dateDuration(0, 0, 0), time: 0n },
        8640000000000000000000n,
        "months",
        "day",
        1,
    ) === null,
    "candidate must fit Instant range before comparison",
);
console.log("temporal zoned calendar carry passed");
