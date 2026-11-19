import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const input = path.resolve(process.argv[2] ?? "build/iana-timezone-review");
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const pins = {
    "tzdata.zi": "b8e91f3bb6b0d2af2db2affb8669c07d2cd366c74cebcef0805d0a44ea414b0e",
    "zone.tab": "e2e8e31c4e10f44576c79345e76060591dbb3eef6ce14e006afc8a373caa9593",
    backzone: "8cce95d550862a443806fcf7ec1baf799d69a21a74af714291cba7ee4b7d2346",
    factory: "ae2ec1d36dabf79a69cb7dd4fb6fd9168d05fc8cfd31aee2dd19e4f18beb9885",
};
const sources = {};
for (const [name, expected] of Object.entries(pins)) {
    const bytes = fs.readFileSync(path.join(input, "source", name));
    assert.equal(hash(bytes), expected, name);
    sources[name] = bytes.toString("utf8");
}
const zones = new Set(),
    links = new Map();
for (const line of sources["tzdata.zi"].split("\n")) {
    const fields = line.split(/\s+/);
    if (fields[0] === "Z") {
        assert(!zones.has(fields[1]));
        zones.add(fields[1]);
    }
    if (fields[0] === "L") {
        assert(!links.has(fields[2]));
        links.set(fields[2], fields[1]);
    }
}
assert.equal(zones.size, 440);
assert.equal(links.size, 158);
const countryRows = sources["zone.tab"]
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/\s+/));
const zoneTab = new Set(countryRows.map((row) => row[2]));
assert.deepEqual(
    countryRows.filter((row) => row[0] === "SJ").map((row) => row[2]),
    ["Arctic/Longyearbyen"],
);
const backzone = new Map();
for (const line of sources.backzone.split("\n")) {
    const match = /^(?:#PACKRATLIST zone\.tab )?Link\s+(\S+)\s+(\S+)/.exec(line);
    if (match) {
        assert(!backzone.has(match[2]), match[2]);
        backzone.set(match[2], match[1]);
    }
}
assert.equal(backzone.get("Atlantic/Jan_Mayen"), "Europe/Oslo");
function primary(name, seen = new Set()) {
    assert(!seen.has(name), "primary cycle " + name);
    seen.add(name);
    if (["UTC", "Etc/UTC", "Etc/GMT", "GMT"].includes(name)) {
        return "UTC";
    }
    if (zones.has(name) || zoneTab.has(name)) {
        return name;
    }
    if (name === "Atlantic/Jan_Mayen") {
        return "Arctic/Longyearbyen";
    }
    const target = backzone.get(name) ?? links.get(name);
    assert(target, "unknown identifier " + name);
    return primary(target, seen);
}
function dataIdentifier(name, seen = new Set()) {
    assert(!seen.has(name), "data cycle " + name);
    seen.add(name);
    if (zones.has(name)) {
        return name;
    }
    assert(links.has(name), name);
    return dataIdentifier(links.get(name), seen);
}
const zoneNames = [...zones].sort();
const records = [...zones, ...links.keys()]
    .map((identifier) => {
        assert(/^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*$/.test(identifier), identifier);
        const primaryIdentifier = primary(identifier);
        return {
            key: identifier.toLowerCase(),
            identifier,
            primary: primaryIdentifier,
            dataIdentifier: dataIdentifier(primaryIdentifier),
        };
    })
    .sort((a, b) => (a.key < b.key ? -1 : 1));
assert.equal(new Set(records.map((row) => row.key)).size, 598);
assert.equal(new Set(records.map((row) => row.primary)).size, 450);
for (const row of records) {
    assert.equal(primary(row.primary), row.primary);
}
const dataSource = fs.readFileSync(path.join(project, "src/iana-timezone-data.ts"));
const dataProvenance = JSON.parse(
    fs.readFileSync(path.join(project, "docs/data/iana-timezone-provenance.json"), "utf8"),
);
assert.equal(dataProvenance.release, "2026f");
assert.equal(dataProvenance.sourceSha256, pins["tzdata.zi"]);
assert.equal(dataProvenance.outputSha256, hash(dataSource));
const maximum = Math.max(...records.map((row) => row.identifier.length));
let generated = `// Generated from IANA 2026f; see docs/data/iana-timezone-identifiers-provenance.json.
import { ianaZones, type IanaZoneData } from "./iana-timezone-data.js";

export class IanaIdentifier {
    readonly key: string;
    readonly identifier: string;
    readonly primary: string;
    readonly data: IanaZoneData;

    constructor(key: string, identifier: string, primary: string, data: IanaZoneData) {
        this.key = key; this.identifier = identifier;
        this.primary = primary; this.data = data;
    }
}

export const MAX_IANA_IDENTIFIER_LENGTH = ${maximum};
export const ianaIdentifiers: IanaIdentifier[] = [
`;
for (const row of records) {
    const index = zoneNames.indexOf(row.dataIdentifier);
    assert(index >= 0);
    generated +=
        "    new IanaIdentifier(" +
        [
            JSON.stringify(row.key),
            JSON.stringify(row.identifier),
            JSON.stringify(row.primary),
            "ianaZones[" + index + "]",
        ].join(", ") +
        "),\n";
}
generated += "];\n";
const provenance = {
    release: "2026f",
    sourceHashes: pins,
    dataSourceSha256: hash(dataSource),
    outputSha256: hash(generated),
    identifiers: records.length,
    primaryIdentifiers: 450,
    maximumLength: maximum,
    policy: "ASCII casing; UTC and zone.tab primary exceptions; backzone resolution with the pinned Jan_Mayen country exception; Factory included; primary identity selects data.",
    reference: "https://tc39.es/ecma402/#sec-availablenamedtimezoneidentifiers",
};
for (const [name, text] of [
    ["src/iana-timezone-identifiers.ts", generated],
    [
        "docs/data/iana-timezone-identifiers-provenance.json",
        JSON.stringify(provenance, null, 2) + "\n",
    ],
]) {
    const destination = path.join(project, name);
    if (process.argv.includes("--check")) {
        assert.equal(fs.readFileSync(destination, "utf8"), text, name);
    } else {
        fs.writeFileSync(destination, text);
    }
}
console.log(
    "IANA identifiers: 598 names, 450 primary identities; " +
        (process.argv.includes("--check") ? "verified" : "generated"),
);
