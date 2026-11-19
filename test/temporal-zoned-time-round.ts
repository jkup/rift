import { roundZonedTimeDifference } from "../src/temporal-zoned-time-round.js";
import { differenceTemporalZonedDateTime } from "../src/temporal-zoned-difference.js";
import { parseTemporalTimeZoneIdentifier } from "../src/temporal-time-zone-parse.js";
import { NANOSECONDS_PER_DAY } from "../src/temporal-time.js";
import type { TemporalRoundingMode } from "../src/temporal-rounding.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
const hour = 3600000000000n;
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
for (const name of ["UTC", "+05:30", "-23:59"]) {
    const zone = parseTemporalTimeZoneIdentifier(name);
    if (zone === null) {
        throw new Error("zone");
    }
    for (const sign of [1n, -1n]) {
        for (const mode of modes) {
            const last = sign * (NANOSECONDS_PER_DAY - hour / 2n);
            const difference = differenceTemporalZonedDateTime(0n, last, zone, "day");
            if (difference === null) {
                throw new Error("difference");
            }
            const result = roundZonedTimeDifference(0n, zone, difference, hour, mode);
            const up =
                mode === "expand" ||
                mode === "halfExpand" ||
                mode === "halfEven" ||
                (sign > 0n
                    ? mode === "ceil" || mode === "halfCeil"
                    : mode === "floor" || mode === "halfFloor");
            check(
                result !== null &&
                    result.expanded === up &&
                    result.duration.date.days === (up ? Number(sign) : 0) &&
                    result.duration.time === (up ? 0n : sign * 23n * hour),
                name + " signed carry " + mode,
            );
        }
    }
    for (const sign of [1n, -1n]) {
        const last = sign * 8640000000000000000000n,
            first = last - sign * NANOSECONDS_PER_DAY;
        const difference = differenceTemporalZonedDateTime(first, last, zone, "day");
        if (difference === null) {
            throw new Error("boundary difference");
        }
        check(
            roundZonedTimeDifference(first, zone, difference, 1n, "trunc") === null,
            "adjacent day must remain in range",
        );
    }
}
console.log("temporal zoned time round passed");
