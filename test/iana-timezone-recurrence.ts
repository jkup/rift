import { readFileSync } from "node:fs";
import { ianaZones, ianaRecurrences } from "../src/iana-timezone-data.js";
import { findIanaZoneData } from "../src/time-zone-transitions.js";
import { ianaOffsetSeconds } from "../src/time-zone-offset.js";
import { recurrenceOffsetSeconds } from "../src/time-zone-recurrence.js";

const lines = readFileSync("test/fixtures/iana-timezone-recurrence.txt", "utf8").trim().split("\n");
if (lines.length !== 4962 || ianaZones.length !== 440 || ianaRecurrences.length !== 94) {
    throw new Error("timezone recurrence denominator");
}
for (let index = 0; index < lines.length; index++) {
    const fields = lines[index].split(" ");
    if (fields.length !== 3) {
        throw new Error("timezone fixture shape");
    }
    const zone = findIanaZoneData(fields[0]),
        instant = Number(fields[1]),
        expected = Number(fields[2]);
    if (zone === null || !Number.isSafeInteger(instant) || !Number.isInteger(expected)) {
        throw new Error("timezone fixture value");
    }
    const actual = ianaOffsetSeconds(zone, instant);
    if (actual !== expected) {
        throw new Error("timezone case " + index + ": " + actual + " expected " + expected);
    }
}
for (const zone of ianaZones) {
    for (const invalid of [NaN, Infinity, -Infinity, 0.5, -0.5, -8640000000001, 8640000000001]) {
        if (
            ianaOffsetSeconds(zone, invalid) !== null ||
            recurrenceOffsetSeconds(zone.recurrence, invalid) !== null
        ) {
            throw new Error("invalid timezone instant");
        }
    }
}
console.log("iana timezone recurrence passed");
