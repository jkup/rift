import { readFileSync } from "node:fs";
import { ianaZones } from "../src/time-zone/iana-timezone-data.js";
import {
    ianaOffsetSeconds,
    ianaOffsetSecondsForLocalTime,
} from "../src/time-zone/time-zone-offset.js";
import {
    transitionTableOffset,
    transitionTableOffsetForLocalTime,
} from "../src/time-zone/time-zone-transitions.js";
import {
    recurrenceOffsetSeconds,
    recurrenceOffsetSecondsForLocalTime,
} from "../src/time-zone/time-zone-recurrence.js";
const lines = readFileSync("test/fixtures/iana-timezone-candidate-offset.txt", "utf8")
    .trim()
    .split("\n");
if (lines.length !== 6160) {
    throw new Error("candidate offset denominator");
}
for (let index = 0; index < lines.length; index++) {
    const fields = lines[index].split(" "),
        zone = ianaZones[Number(fields[0])];
    const seconds = Number(fields[1]),
        expected = Number(fields[2]);
    if (ianaOffsetSecondsForLocalTime(zone, seconds) !== expected) {
        throw new Error("candidate offset " + index);
    }
    if (Math.abs(seconds) <= 8640000000000) {
        if (ianaOffsetSeconds(zone, seconds) !== expected) {
            throw new Error("public offset " + index);
        }
    } else if (
        ianaOffsetSeconds(zone, seconds) !== null ||
        transitionTableOffset(zone, seconds) !== null ||
        recurrenceOffsetSeconds(zone.recurrence, seconds) !== null
    ) {
        throw new Error("public range widened " + index);
    }
}
for (const zone of ianaZones) {
    for (const seconds of [-8640000172801, 8640000172801, NaN, Infinity, -Infinity, 0.5]) {
        if (
            ianaOffsetSecondsForLocalTime(zone, seconds) !== null ||
            transitionTableOffsetForLocalTime(zone, seconds) !== null ||
            recurrenceOffsetSecondsForLocalTime(zone.recurrence, seconds) !== null
        ) {
            throw new Error("candidate range guard");
        }
    }
    for (const seconds of zone.transitions) {
        for (const value of [seconds - 1, seconds, seconds + 1]) {
            if (ianaOffsetSecondsForLocalTime(zone, value) !== ianaOffsetSeconds(zone, value)) {
                throw new Error("historical provider disagreement");
            }
        }
    }
}
console.log("iana timezone candidate offset passed");
