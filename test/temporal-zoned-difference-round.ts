import { roundZonedDateTimeDifference } from "../src/temporal-zoned-difference-round.js";
import { parseTemporalInstant } from "../src/temporal-instant-parse.js";
import { parseTemporalTimeZoneIdentifier } from "../src/temporal-time-zone-parse.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const zone = parseTemporalTimeZoneIdentifier("UTC"), first = parseTemporalInstant("2020-01-31T12:00Z"), last = parseTemporalInstant("2020-02-29T11:59:59.999999999Z");
if (zone === null || first === null || last === null) throw new Error("input");
let result = roundZonedDateTimeDifference(first, last, zone, "months", "seconds", 1, "halfExpand");
check(result !== null && result.date.months === 1 && result.date.days === 0 && result.time === 0n, "time then day then month carry");
result = roundZonedDateTimeDifference(first, last, zone, "hours", "seconds", 1, "halfExpand");
check(result !== null && result.date.months === 0 && result.time === 29n * 86400000000000n, "instant-only difference");
const march = parseTemporalInstant("2020-03-01T12:00Z");
if (march === null) throw new Error("March");
result = roundZonedDateTimeDifference(first, march, zone, "months", "weeks", 1, "halfExpand");
check(result !== null && result.date.months === 1 && result.date.weeks === 0, "retained month consensus correction");
const max = 8640000000000000000000n, day = 86400000000000n;
result = roundZonedDateTimeDifference(max - day, max, zone, "days", "nanoseconds", 1, "trunc");
check(result !== null && result.date.days === 1, "exact nanosecond fast path");
check(roundZonedDateTimeDifference(max - day, max, zone, "days", "nanoseconds", 2, "trunc") === null, "rounding checks adjacent day");
result = roundZonedDateTimeDifference(max, max, zone, "years", "years", 1, "ceil");
check(result === null, "relative rounding checks zero calendar windows; public until/since handles equality");
check(roundZonedDateTimeDifference(first, last, zone, "hours", "seconds", 0, "trunc") === null, "invalid increment");
console.log("temporal zoned difference round passed");
