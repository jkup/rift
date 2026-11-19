import { readFileSync } from "node:fs";
import { ianaZones } from "../src/time-zone/iana-timezone-data.js";
import { findIanaZoneData } from "../src/time-zone/time-zone-transitions.js";
import {
    possibleIanaInstants,
    resolveIanaLocalTime,
    startOfIanaDay,
} from "../src/time-zone/time-zone-local.js";
const lines = readFileSync("test/fixtures/iana-timezone-local.txt", "utf8").trim().split("\n");
if (lines.length !== 63) {
    throw new Error("local control denominator");
}
for (let index = 0; index < lines.length; index++) {
    const fields = lines[index].split(" "),
        zone = findIanaZoneData(fields[0]),
        local = BigInt(fields[1]),
        mode = fields[2];
    if (zone === null) {
        throw new Error("control zone");
    }
    const expected = fields[3] === "-" ? null : BigInt(fields[3]);
    if (
        mode !== "compatible" &&
        mode !== "earlier" &&
        mode !== "later" &&
        mode !== "reject" &&
        mode !== "start"
    ) {
        throw new Error("control mode");
    }
    const actual =
        mode === "start" ? startOfIanaDay(zone, local) : resolveIanaLocalTime(zone, local, mode);
    if (actual !== expected) {
        throw new Error("local control " + index);
    }
}
let maximumOffsets = 0;
for (const zone of ianaZones) {
    const values = zone.possibleOffsets;
    maximumOffsets = Math.max(maximumOffsets, values.length);
    for (let index = 0; index < values.length; index++) {
        if (!Number.isInteger(values[index]) || Math.abs(values[index]) >= 86400) {
            throw new Error("offset bound");
        }
        if (index > 0 && values[index - 1] <= values[index]) {
            throw new Error("offset order or duplicate");
        }
        if (
            values[index] !== zone.initialOffset &&
            values[index] !== zone.recurrence.standard &&
            values[index] !== zone.recurrence.daylight &&
            !zone.offsets.includes(values[index])
        ) {
            throw new Error("unexpected offset");
        }
    }
    for (const offset of [
        zone.initialOffset,
        ...zone.offsets,
        zone.recurrence.standard,
        zone.recurrence.daylight,
    ]) {
        if (!values.includes(offset)) {
            throw new Error("missing offset");
        }
    }
}
if (maximumOffsets !== 8) {
    throw new Error("release offset denominator");
}
const newYork = findIanaZoneData("America/New_York"),
    utc = findIanaZoneData("Etc/UTC");
if (newYork === null || utc === null) {
    throw new Error("named zone controls");
}
const fold = possibleIanaInstants(newYork, 1730597400123456789n),
    gap = possibleIanaInstants(newYork, 1710037800123456789n);
if (
    fold === null ||
    fold.length !== 2 ||
    fold[0] !== 1730611800123456789n ||
    fold[1] !== 1730615400123456789n
) {
    throw new Error("ordered fold candidates");
}
if (gap === null || gap.length !== 0) {
    throw new Error("gap candidate distinction");
}
for (const instant of [-8640000000000000000000n, 8640000000000000000000n]) {
    const candidates = possibleIanaInstants(utc, instant);
    if (candidates === null || candidates.length !== 1 || candidates[0] !== instant) {
        throw new Error("exact endpoint");
    }
}
for (const instant of [
    -8640000000000000000001n,
    8640000000000000000001n,
    -8640000086400000000001n,
    8640000086400000000001n,
]) {
    if (possibleIanaInstants(utc, instant) !== null) {
        throw new Error("range candidate distinction");
    }
}
console.log("iana timezone local passed");
