import { readFileSync } from "node:fs";
import { ianaIdentifiers, MAX_IANA_IDENTIFIER_LENGTH } from "../src/iana-timezone-identifiers.js";
import { findIanaTimeZoneIdentifier } from "../src/time-zone-identifier.js";
import { ianaOffsetSeconds } from "../src/time-zone-offset.js";
import { stringCompare } from "../src/strings.js";

const lines = readFileSync("test/fixtures/iana-timezone-identifiers.txt", "utf8").trim().split("\n");
if (lines.length !== 598 || ianaIdentifiers.length !== 598 || MAX_IANA_IDENTIFIER_LENGTH !== 32)
    throw new Error("identifier denominator");
const seen = new Set<string>(), primaries = new Set<string>();
for (const line of lines) {
    const fields = line.split(" ");
    if (fields.length !== 3 || seen.has(fields[0])) throw new Error("identifier fixture shape");
    seen.add(fields[0]); primaries.add(fields[1]);
    const expected = findIanaTimeZoneIdentifier(fields[0]);
    if (expected === null || expected.identifier !== fields[0] || expected.primary !== fields[1] || expected.data.identifier !== fields[2])
        throw new Error("identifier record: " + fields[0]);
    for (const input of [fields[0], fields[0].toLowerCase(), fields[0].toUpperCase()])
        if (findIanaTimeZoneIdentifier(input) !== expected) throw new Error("identifier casing");
    const primary = findIanaTimeZoneIdentifier(expected.primary);
    if (primary === null || primary.identifier !== primary.primary || primary.data !== expected.data)
        throw new Error("primary identity/data");
}
if (primaries.size !== 450) throw new Error("primary denominator");
for (let index = 0; index < ianaIdentifiers.length; index++) {
    const record = ianaIdentifiers[index];
    if (!seen.has(record.identifier) || record.key !== record.identifier.toLowerCase()) throw new Error("registry inventory");
    if (index > 0 && stringCompare(ianaIdentifiers[index - 1].key, record.key) >= 0) throw new Error("registry ordering");
}
for (let unit = 128; unit < 65536; unit++)
    if (findIanaTimeZoneIdentifier("Asia/" + String.fromCharCode(unit) + "athmandu") !== null) throw new Error("non-ASCII identifier");
for (const input of ["", "Etc/Unknown", " Europe/London", "Europe/London ", "../UTC", "UTC\0", "utc/", "Asia/Kathmandu", "US/Eaſtern", "UＴC", "A".repeat(33)])
    if (findIanaTimeZoneIdentifier(input) !== null) throw new Error("invalid identifier");
const factory = findIanaTimeZoneIdentifier("factory");
if (factory === null || factory.primary !== "Factory" || factory.data.identifier !== "Factory") throw new Error("Factory identity");
for (const instant of [-8640000000000, 0, 8640000000000])
    if (ianaOffsetSeconds(factory.data, instant) !== 0) throw new Error("Factory encoded offset");
console.log("iana timezone identifiers passed");
