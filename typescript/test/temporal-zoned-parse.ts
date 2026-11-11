import { timeZoneOffsetNanoseconds } from "../src/temporal-time-zone-operations.js";
import { parseTemporalZonedDateTime } from "../src/temporal-zoned-parse.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const dateOnly = parseTemporalZonedDateTime("2024-02-29[!uTc][u-ca=ISO8601]");
check(dateOnly !== null && dateOnly.startOfDay && dateOnly.offsetBehaviour === "wall" && dateOnly.offsetNanoseconds === 0n && dateOnly.timeZone.identifier === "UTC" && dateOnly.dateTime.date.day === 29 && dateOnly.dateTime.hour === 0, "date-only start");
const utc = parseTemporalZonedDateTime("1970-01-01T00:00Z[+05:30]");
check(utc !== null && !utc.startOfDay && utc.offsetBehaviour === "exact" && utc.offsetNanoseconds === 0n && timeZoneOffsetNanoseconds(utc.timeZone, 0n) === 19800000000000n, "Z preserves exact behavior");
const wall = parseTemporalZonedDateTime("20240229t123456,123456789[-0130][x-foo=bar]");
check(wall !== null && !wall.startOfDay && wall.offsetBehaviour === "wall" && wall.timeZone.identifier === "-01:30" && wall.dateTime.hour === 12 && wall.dateTime.minute === 34 && wall.dateTime.second === 56 && wall.dateTime.millisecond === 123 && wall.dateTime.microsecond === 456 && wall.dateTime.nanosecond === 789, "wall precision");
const offset = parseTemporalZonedDateTime("2024-02-29 12:34:60-01:30:45.123456789[UTC]");
check(offset !== null && offset.offsetBehaviour === "option" && offset.offsetNanoseconds === -5445123456789n && offset.dateTime.second === 59 && offset.timeZone.identifier === "UTC", "exact numeric offset and leap second");
const negativeZero = parseTemporalZonedDateTime("1970-01-01T00-00[-00]");
check(negativeZero !== null && negativeZero.offsetBehaviour === "option" && negativeZero.offsetNanoseconds === 0n && negativeZero.timeZone.identifier === "+00:00", "negative zero");
for (const text of ["-271821-04-19T00:01[-23:59]", "+275760-09-13T23:59[+23:59]", "+999999-12-31[UTC]"]) {
    check(parseTemporalZonedDateTime(text) !== null, "defer epoch range " + text);
}
for (const text of [
    "", "UTC", "2024-02-29", "2024-02-29T12:30Z", "2024-02-29T12:30+00", "12:30[UTC]", "2024-02[UTC]", "02-29[UTC]",
    "2023-02-29[UTC]", "2024-13-01[UTC]", "-000000-01-01[UTC]", "2024-02-29Z[UTC]", "2024-02-29+00[UTC]", "2024-02-29T[UTC]",
    "2024-02-29T24:00[UTC]", "2024-02-29T12:60[UTC]", "2024-02-29T12:30:61[UTC]", "2024-02-29T12:30.1[UTC]", "2024-02-29T12:30:00.1234567890[UTC]",
    "2024-02-29T12:30+24[UTC]", "2024-02-29T12:30+00:60[UTC]", "2024-02-29T12:30+00:00:60[UTC]", "2024-02-29T12:30Z[+00:00:00]",
    "2024-02-29[Europe/London]", "2024-02-29[UTC][UTC]", "2024-02-29[u-ca=iso8601][UTC]", "2024-02-29[UTC][u-ca=gregory]", "2024-02-29[UTC][!x-foo=bar]",
    "2024-02-29[UTC][u-ca=iso8601][!u-ca=iso8601]", "2024-02-29[UTC]junk", " 2024-02-29[UTC]", "2024-02-29[UTC] ",
]) check(parseTemporalZonedDateTime(text) === null, "invalid " + text);
console.log("temporal zoned parse passed");
