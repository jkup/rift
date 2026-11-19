import { ianaOffsetSeconds } from "../src/time-zone/time-zone-offset.js";
import { findIanaZoneData } from "../src/time-zone/time-zone-transitions.js";
import { TimeZoneRecurrence } from "../src/time-zone/time-zone-recurrence.js";
import { readFileSync } from "node:fs";
import { ianaZones, IanaZoneData } from "../src/time-zone/iana-timezone-data.js";
import { ianaTimeZoneTransition } from "../src/time-zone/time-zone-adjacent.js";
const historical = readFileSync("test/fixtures/iana-timezone-adjacent.txt", "utf8")
    .trim()
    .split("\n");
if (historical.length !== 26131) {
    throw new Error("historical denominator");
}
let checks = 0;
for (let index = 0; index < historical.length; index++) {
    const fields = historical[index].split(" "),
        zone = ianaZones[Number(fields[0])],
        instant = BigInt(fields[1]) * 1000000000n;
    const previous = fields[2] === "-" ? null : BigInt(fields[2]) * 1000000000n;
    if (ianaTimeZoneTransition(zone, instant, "previous") !== previous) {
        throw new Error("previous exact " + index);
    }
    if (ianaTimeZoneTransition(zone, instant + 1n, "previous") !== instant) {
        throw new Error("previous subsecond " + index);
    }
    if (ianaTimeZoneTransition(zone, instant - 1n, "next") !== instant) {
        throw new Error("next subsecond " + index);
    }
    checks += 3;
    if (fields[3] !== "?") {
        if (ianaTimeZoneTransition(zone, instant, "next") !== BigInt(fields[3]) * 1000000000n) {
            throw new Error("next exact " + index);
        }
        checks++;
    }
}
const reference = readFileSync("test/fixtures/iana-timezone-adjacent-reference.txt", "utf8")
    .trim()
    .split("\n");
if (reference.length !== 96) {
    throw new Error("reference denominator");
}
for (let index = 0; index < reference.length; index++) {
    const fields = reference[index].split(" "),
        expected = fields[3] === "-" ? null : BigInt(fields[3]);
    const actual = ianaTimeZoneTransition(
        ianaZones[Number(fields[0])],
        BigInt(fields[1]),
        fields[2] === "next" ? "next" : "previous",
    );
    if (actual !== expected) {
        throw new Error("reference " + index + ": " + actual + " expected " + expected);
    }
}
if (checks !== 104113) {
    throw new Error("historical check denominator");
}
let unchanged = 0;
for (const zone of ianaZones) {
    for (const seconds of zone.transitions) {
        if (ianaOffsetSeconds(zone, seconds - 1) !== ianaOffsetSeconds(zone, seconds)) {
            continue;
        }
        const instant = BigInt(seconds) * 1000000000n;
        if (
            ianaTimeZoneTransition(zone, instant - 1n, "next") === instant ||
            ianaTimeZoneTransition(zone, instant + 1n, "previous") === instant
        ) {
            throw new Error("unchanged offset entry");
        }
        unchanged++;
    }
}
if (unchanged !== 317) {
    throw new Error("unchanged denominator");
}
const london = findIanaZoneData("Europe/London");
if (london === null) {
    throw new Error("London fixture");
}
const distant = new IanaZoneData("fixture", 0, [2208988800], [0], london.footer, london.recurrence);
if (ianaTimeZoneTransition(distant, 946684800000000000n, "next") !== 2216250000000000000n) {
    throw new Error("distant footer handoff");
}
const constant = new IanaZoneData(
    "fixture",
    0,
    [],
    [],
    "",
    new TimeZoneRecurrence(0, 0, london.recurrence.start, london.recurrence.end),
);
for (const instant of [-8640000000000000000000n, 0n, 8640000000000000000000n]) {
    if (
        ianaTimeZoneTransition(constant, instant, "next") !== null ||
        ianaTimeZoneTransition(constant, instant, "previous") !== null
    ) {
        throw new Error("equal recurrence offsets");
    }
}
for (const instant of [-8640000000000000000001n, 8640000000000000000001n]) {
    if (
        ianaTimeZoneTransition(london, instant, "next") !== null ||
        ianaTimeZoneTransition(london, instant, "previous") !== null
    ) {
        throw new Error("transition range");
    }
}
console.log("iana timezone adjacent passed");
