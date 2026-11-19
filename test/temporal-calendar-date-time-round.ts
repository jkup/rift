import { parseTemporalPlainDateTime } from "../src/temporal-plain-date-time-parse.js";
import { differenceISODateTime } from "../src/iso-date-time-difference.js";
import { roundCalendarDateTimeDifference } from "../src/temporal-calendar-date-time-round.js";
import { isoDateTimeToEpochNanoseconds } from "../src/iso-calendar.js";
import type { TemporalRoundingMode } from "../src/temporal-rounding.js";
import type { DurationUnit } from "../src/temporal-duration-balance.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function parse(text: string) {
    const result = parseTemporalPlainDateTime(text);
    if (result === null) {
        throw new Error("parse " + text);
    }
    return result;
}
function round(
    start: string,
    end: string,
    unit: "year" | "month" | "week",
    increment: number,
    mode: TemporalRoundingMode,
    largest: DurationUnit = "months",
) {
    const origin = parse(start),
        destination = parse(end),
        difference = differenceISODateTime(origin, destination, largest);
    if (difference === null) {
        throw new Error("difference");
    }
    return roundCalendarDateTimeDifference(origin, destination, difference, unit, increment, mode);
}
const modes: TemporalRoundingMode[] = [
    "ceil",
    "floor",
    "expand",
    "trunc",
    "halfCeil",
    "halfFloor",
    "halfExpand",
    "halfTrunc",
    "halfEven",
];
const positive = [1, 0, 1, 0, 1, 0, 1, 0, 0],
    negative = [0, -1, -1, 0, 0, -1, -1, 0, 0];
for (let i = 0; i < modes.length; i++) {
    const forward = round("2024-01-01T12:00", "2024-01-17T00:00", "month", 1, modes[i]);
    const backward = round("2024-02-01T12:00", "2024-01-17T00:00", "month", 1, modes[i]);
    check(
        forward !== null && forward.date.months === positive[i],
        "positive fractional day tie " + modes[i],
    );
    check(
        backward !== null && backward.date.months === negative[i],
        "negative fractional day tie " + modes[i],
    );
}
let result = round("2024-01-01T12:00", "2024-01-17T00:00:00.000000001", "month", 1, "halfEven");
check(result !== null && result.date.months === 1, "one nanosecond above tie");
result = round("2024-01-01T12:00", "2024-01-16T23:59:59.999999999", "month", 1, "halfEven");
check(result !== null && result.date.months === 0, "one nanosecond below tie");
result = round("2024-01-01T12:00", "2024-02-16T00:00", "month", 1, "halfEven");
check(
    result !== null &&
        result.date.months === 2 &&
        result.epochNanoseconds === isoDateTimeToEpochNanoseconds(parse("2024-03-01T12:00")),
    "half-even parity and preserved clock",
);
result = round("2024-01-31T12:00", "2024-02-29T12:00", "month", 1, "trunc");
check(result !== null && result.date.months === 1 && result.expanded, "exact clamped boundary");
result = round("2024-01-01T12:00", "2024-02-02T12:00", "month", 1, "trunc", "days");
check(
    result !== null &&
        result.date.months === 1 &&
        result.expanded &&
        result.epochNanoseconds === isoDateTimeToEpochNanoseconds(parse("2024-02-01T12:00")),
    "shifted day-record window",
);
result = round("2024-01-01T12:00", "2024-01-05T00:00", "week", 1, "halfExpand", "weeks");
check(result !== null && result.date.weeks === 1, "half week includes clock");
result = round("2024-01-01T12:00", "2024-07-02T12:00", "year", 1, "halfExpand", "years");
check(result !== null && result.date.years === 1, "half leap year");
result = round("2023-01-01T12:00", "2023-07-03T00:00", "year", 1, "halfEven", "years");
check(result !== null && result.date.years === 0, "half common year");
result = round("2024-01-01T12:00", "2025-02-16T12:00", "month", 1, "halfExpand", "years");
check(
    result !== null && result.date.years === 1 && result.date.months === 2,
    "retained larger calendar unit",
);
check(
    round("+275760-09-01T12:00", "+275760-09-02T12:00", "month", 1, "trunc") === null,
    "outer window must be representable",
);
result = round("-271821-05-19", "-271821-04-19T00:00:00.000000001", "month", 1, "ceil");
check(result !== null && result.date.months === 0, "internal lower window endpoint allowed");
result = round("-271821-05-19", "-271821-04-19T00:00:00.000000001", "month", 1, "floor");
check(
    result !== null &&
        result.date.months === -1 &&
        result.epochNanoseconds === isoDateTimeToEpochNanoseconds(parse("-271821-04-19")),
    "rounded duration may reach nonconstructible DateTime midnight",
);
for (const increment of [0, -1, 1.5, 1000000001]) {
    check(
        round("2024-01-01", "2024-02-01", "month", increment, "trunc") === null,
        "increment bound",
    );
}
console.log("temporal calendar date time round passed");
