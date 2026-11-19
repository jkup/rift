import { differenceTemporalZonedDateTime } from "../src/temporal-zoned-difference.js";
import { parseTemporalTimeZoneIdentifier } from "../src/temporal-time-zone-parse.js";
import { parseTemporalInstant } from "../src/temporal-instant-parse.js";
import type { DateDifferenceUnit } from "../src/iso-calendar-difference.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function expect(
    start: string,
    end: string,
    name: string,
    largest: DateDifferenceUnit,
    years: number,
    months: number,
    weeks: number,
    days: number,
    time: bigint,
): void {
    const first = parseTemporalInstant(start),
        last = parseTemporalInstant(end),
        zone = parseTemporalTimeZoneIdentifier(name);
    if (first === null || last === null || zone === null) {
        throw new Error("input");
    }
    const result = differenceTemporalZonedDateTime(first, last, zone, largest);
    check(
        result !== null &&
            result.date.years === years &&
            result.date.months === months &&
            result.date.weeks === weeks &&
            result.date.days === days &&
            result.time === time,
        start + " to " + end + " " + name + " " + largest,
    );
}
expect("2020-01-31T12:00Z", "2020-03-01T12:00Z", "UTC", "month", 0, 1, 0, 1, 0n);
expect("2020-03-01T12:00Z", "2020-01-31T12:00Z", "UTC", "month", 0, -1, 0, -1, 0n);
expect("2020-01-01T23:00Z", "2020-01-02T01:00Z", "UTC", "day", 0, 0, 0, 0, 7200000000000n);
expect("2020-01-02T01:00Z", "2020-01-01T23:00Z", "UTC", "day", 0, 0, 0, 0, -7200000000000n);
expect("2020-01-01T23:00Z", "2020-01-10T01:00Z", "+05:30", "week", 0, 0, 1, 1, 7200000000000n);
expect("2020-01-01T23:00Z", "2020-01-10T01:00Z", "-23:59", "day", 0, 0, 0, 8, 7200000000000n);
expect("2020-02-29T12:00Z", "2021-03-01T11:00Z", "UTC", "year", 0, 11, 0, 30, 82800000000000n);
expect("1969-12-31T23:59:59.999999999Z", "1970-01-01T00:00Z", "UTC", "day", 0, 0, 0, 0, 1n);
for (const name of ["UTC", "+05:30", "-23:59"]) {
    const zone = parseTemporalTimeZoneIdentifier(name);
    if (zone === null) {
        throw new Error("zone");
    }
    const min = -8640000000000000000000n,
        max = -min;
    for (const epoch of [min, 0n, max]) {
        const zero = differenceTemporalZonedDateTime(epoch, epoch, zone, "year");
        check(
            zero !== null && zero.date.years === 0 && zero.date.days === 0 && zero.time === 0n,
            "equal " + name,
        );
    }
    for (const pair of [
        [min, min + 86400000000000n],
        [max - 86400000000000n, max],
        [max, max - 86400000000000n],
    ]) {
        const first = pair[0],
            last = pair[1];
        if (first === undefined || last === undefined) {
            throw new Error("boundary pair");
        }
        const result = differenceTemporalZonedDateTime(first, last, zone, "day");
        check(
            result !== null &&
                BigInt(result.date.days) * 86400000000000n + result.time === last - first,
            "boundary " + name,
        );
    }
    check(differenceTemporalZonedDateTime(min - 1n, 0n, zone, "day") === null, "invalid first");
    check(differenceTemporalZonedDateTime(0n, max + 1n, zone, "day") === null, "invalid last");
}
console.log("temporal zoned difference record passed");
