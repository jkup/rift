import { roundZonedCalendarDifference } from "../src/temporal-zoned-calendar-round.js";
import { differenceTemporalZonedDateTime } from "../src/temporal-zoned-difference.js";
import { parseTemporalInstant } from "../src/temporal-instant-parse.js";
import { parseTemporalTimeZoneIdentifier } from "../src/temporal-time-zone-parse.js";
import type { TemporalRoundingMode } from "../src/temporal-rounding.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function round(firstText: string, lastText: string, zoneText: string, unit: "year" | "month" | "week" | "day", mode: TemporalRoundingMode, increment = 1) {
    const first = parseTemporalInstant(firstText), last = parseTemporalInstant(lastText), zone = parseTemporalTimeZoneIdentifier(zoneText);
    if (first === null || last === null || zone === null) throw new Error("input");
    const difference = differenceTemporalZonedDateTime(first, last, zone, "year");
    if (difference === null) throw new Error("difference");
    return roundZonedCalendarDifference(first, last, zone, difference, unit, increment, mode);
}
const modes: TemporalRoundingMode[] = ["ceil","floor","expand","trunc","halfCeil","halfFloor","halfExpand","halfTrunc","halfEven"];
for (const mode of modes) {
    const positive = round("2020-01-01T12:00Z", "2020-01-02T00:00Z", "+05:30", "day", mode);
    const negative = round("2020-01-02T00:00Z", "2020-01-01T12:00Z", "+05:30", "day", mode);
    const positiveUp = mode === "ceil" || mode === "expand" || mode === "halfCeil" || mode === "halfExpand";
    const negativeUp = mode === "floor" || mode === "expand" || mode === "halfFloor" || mode === "halfExpand";
    check(positive !== null && positive.duration.date.days === (positiveUp ? 1 : 0), "positive day " + mode);
    check(negative !== null && negative.duration.date.days === (negativeUp ? -1 : 0), "negative day " + mode);
}
let result = round("2020-01-31T12:00Z", "2020-03-01T12:00Z", "UTC", "week", "halfExpand");
check(result !== null && result.duration.date.months === 1 && result.duration.date.weeks === 0, "retained month uses calendar-added origin per TC39 PR3319");
result = round("2020-01-01T12:00Z", "2020-01-17T00:00:00.000000001Z", "UTC", "month", "halfEven");
check(result !== null && result.duration.date.months === 1, "one nanosecond above tie");
result = round("2020-01-01T12:00Z", "2020-01-17T00:00Z", "UTC", "month", "halfEven");
check(result !== null && result.duration.date.months === 0, "exact tie");
result = round("2020-01-01T00:00Z", "2020-01-17T00:00Z", "-23:59", "day", "ceil", 10);
check(result !== null && result.duration.date.days === 20, "day increment");
check(round("+275760-09-12T00:00Z", "+275760-09-13T00:00Z", "UTC", "day", "trunc") === null, "both window bounds required at maximum");
check(round("-271821-04-21T00:00Z", "-271821-04-20T00:00Z", "UTC", "day", "trunc") === null, "both window bounds required at minimum");
check(round("2020-01-01T00:00Z", "2020-01-02T00:00Z", "UTC", "day", "trunc", 0) === null, "invalid increment");
console.log("temporal zoned calendar round passed");
