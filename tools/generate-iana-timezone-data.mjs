import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseTimeZoneFooter } from "./parse-timezone-footer.mjs";

const input = path.resolve(process.argv[2] ?? "build/iana-timezone-review");
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const archives = [
    ["tzdata2026f.tar.gz", "01b4a91cec5167ed48c11e8ab78f2048cead78ce94b0cafcad0ae8c5a3044d3d"],
    ["tzcode2026f.tar.gz", "5a18da01393679ef2559214dc687563f7f3d05691f6f58b7fbc0166f3e796cd6"],
];
for (const [name, expected] of archives) {
    assert.equal(hash(fs.readFileSync(path.join(input, name))), expected, name);
}
const source = fs.readFileSync(path.join(input, "source/tzdata.zi"));
assert.equal(hash(source), "b8e91f3bb6b0d2af2db2affb8669c07d2cd366c74cebcef0805d0a44ea414b0e");
const license = fs.readFileSync(path.join(input, "source/LICENSE"));
assert.equal(hash(license), "0613408568889f5739e5ae252b722a2659c02002839ad970a63dc5e9174b27cf");
const identifiers = [],
    links = [];
for (const line of source.toString("utf8").split("\n")) {
    const fields = line.split(/\s+/);
    if (fields[0] === "Z") {
        identifiers.push(fields[1]);
    }
    if (fields[0] === "L") {
        links.push([fields[2], fields[1]]);
    }
}
identifiers.sort();
links.sort((a, b) => (a[0] < b[0] ? -1 : 1));
const names = [...identifiers, ...links.map((row) => row[0])];
assert.equal(new Set(names.map((name) => name.toLowerCase())).size, names.length);
for (const name of names) {
    assert(/^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*$/.test(name), name);
}
assert.equal(identifiers.length, 440);
assert.equal(links.length, 158);
const readZone = (name) => fs.readFileSync(path.join(input, "zoneinfo", name));

function header(bytes, start) {
    assert(start + 44 <= bytes.length);
    assert.equal(bytes.toString("ascii", start, start + 4), "TZif");
    const version = bytes.toString("ascii", start + 4, start + 5);
    assert(["2", "3"].includes(version));
    for (let index = start + 5; index < start + 20; index++) {
        assert.equal(bytes[index], 0);
    }
    const [ut, standard, leaps, times, types, chars] = Array.from({ length: 6 }, (_, i) =>
        bytes.readUInt32BE(start + 20 + i * 4),
    );
    assert(types > 0 && types <= 256 && chars > 0);
    assert([0, types].includes(ut) && [0, types].includes(standard));
    assert.equal(leaps, 0, "POSIX data must omit leap tables");
    return { version, ut, standard, leaps, times, types, chars };
}
const blockSize = (h, width) => h.times * (width + 1) + h.types * 6 + h.chars + h.standard + h.ut;
function parseZone(identifier, bytes) {
    const first = header(bytes, 0),
        start = 44 + blockSize(first, 4),
        h = header(bytes, start);
    assert.equal(h.version, first.version);
    assert(start + 44 + blockSize(h, 8) < bytes.length);
    let position = start + 44;
    const transitions = [];
    for (let index = 0; index < h.times; index++) {
        const exact = bytes.readBigInt64BE(position),
            seconds = Number(exact);
        position += 8;
        assert(Number.isSafeInteger(seconds) && BigInt(seconds) === exact);
        if (index) {
            assert(seconds > transitions[index - 1]);
        }
        transitions.push(seconds);
    }
    const indices = [...bytes.subarray(position, position + h.times)];
    position += h.times;
    assert(indices.every((index) => index < h.types));
    const types = [];
    for (let index = 0; index < h.types; index++) {
        const offset = bytes.readInt32BE(position),
            daylight = bytes[position + 4],
            designation = bytes[position + 5];
        position += 6;
        assert(Math.abs(offset) < 86400 && daylight <= 1 && designation < h.chars);
        types.push({ offset, designation });
    }
    const designations = bytes.subarray(position, position + h.chars);
    position += h.chars;
    for (const type of types) {
        assert(designations.indexOf(0, type.designation) >= 0);
    }
    for (let index = 0; index < h.standard + h.ut; index++) {
        assert(bytes[position + index] <= 1);
    }
    position += h.standard + h.ut;
    const footer = bytes.toString("ascii", position);
    assert(/^\n[^\n\0]+\n$/.test(footer), identifier);
    return {
        identifier,
        initialOffset: types[0].offset,
        transitions,
        offsets: indices.map((index) => types[index].offset),
        footer: footer.slice(1, -1),
        sha256: hash(bytes),
    };
}
const zones = identifiers.map((identifier) => parseZone(identifier, readZone(identifier)));
assert.equal(
    hash(JSON.stringify(zones.map((zone) => [zone.identifier, zone.sha256]))),
    "4075970d620e7c3ef231ffc581eddd2aa2d34bac1d305aa1d2dda02c15fe4dda",
);
for (const [identifier, target] of links) {
    assert(names.includes(target), target);
    assert.deepEqual(readZone(identifier), readZone(target), identifier);
}
assert.equal(
    zones.reduce((count, zone) => count + zone.transitions.length, 0),
    26448,
);
let generated = "// Generated from IANA 2026f; see docs/data/iana-timezone-provenance.json.\n";
generated += 'import { TimeZoneRule, TimeZoneRecurrence } from "./time-zone-recurrence.js";\n\n';
const footers = [...new Set(zones.map((zone) => zone.footer))];
assert.equal(footers.length, 94);
const ruleText = (rule) =>
    rule === null
        ? "null"
        : "new TimeZoneRule(" +
          [rule.kind, rule.month, rule.week, rule.day, rule.seconds].join(", ") +
          ")";
generated += "export const ianaRecurrences: TimeZoneRecurrence[] = [\n";
for (const footer of footers) {
    const rule = parseTimeZoneFooter(footer);
    generated +=
        "    new TimeZoneRecurrence(" +
        [rule.standard, rule.daylight, ruleText(rule.start), ruleText(rule.end)].join(", ") +
        "),\n";
}
generated +=
    "];\n\nexport class IanaZoneData {\n    readonly identifier: string;\n    readonly initialOffset: number;\n    readonly transitions: number[];\n    readonly offsets: number[];\n    readonly possibleOffsets: number[];\n    readonly footer: string;\n    readonly recurrence: TimeZoneRecurrence;\n\n    constructor(identifier: string, initialOffset: number, transitions: number[], offsets: number[], footer: string, recurrence: TimeZoneRecurrence) {\n        this.identifier = identifier; this.initialOffset = initialOffset;\n        this.transitions = transitions; this.offsets = offsets; this.footer = footer;\n        this.recurrence = recurrence;\n        this.possibleOffsets = [];\n        for (const offset of [initialOffset, ...offsets, recurrence.standard, recurrence.daylight])\n            if (!this.possibleOffsets.includes(offset)) this.possibleOffsets.push(offset);\n        this.possibleOffsets.sort((left, right) => right - left);\n    }\n}\n\nexport const ianaZones: IanaZoneData[] = [\n";
for (const zone of zones) {
    generated +=
        "    new IanaZoneData(" +
        [
            JSON.stringify(zone.identifier),
            zone.initialOffset,
            JSON.stringify(zone.transitions),
            JSON.stringify(zone.offsets),
            JSON.stringify(zone.footer),
            "ianaRecurrences[" + footers.indexOf(zone.footer) + "]",
        ].join(", ") +
        "),\n";
}
generated += "];\n\nexport const ianaLinks: string[][] = " + JSON.stringify(links) + ";\n";
const provenance = {
    release: "2026f",
    archives: archives.map(([name, sha256]) => ({
        url: "https://data.iana.org/time-zones/releases/" + name,
        sha256,
    })),
    commands: [
        "make -B zic tzdata.zi VERSION=2026f PACKRATDATA=backzone PACKRATLIST=zone.tab",
        "./zic -b fat -d ../zoneinfo tzdata.zi",
    ],
    sourceSha256: hash(source),
    tablesSha256: hash(JSON.stringify(zones.map((zone) => [zone.identifier, zone.sha256]))),
    outputSha256: hash(generated),
    zones: zones.length,
    links: links.length,
    transitions: 26448,
    recurrenceRules: footers.length,
    scope: "Internal offset records, recurrence rules and raw links; not a public identifier registry. Primary-identifier policy and local-time resolution are separate.",
};
for (const [name, bytes] of [
    ["src/time-zone/iana-timezone-data.ts", generated],
    ["docs/data/iana-timezone-license.txt", license],
    ["docs/data/iana-timezone-provenance.json", JSON.stringify(provenance, null, 2) + "\n"],
]) {
    const destination = path.join(project, name);
    if (process.argv.includes("--check")) {
        assert.deepEqual(fs.readFileSync(destination), Buffer.from(bytes), name);
    } else {
        fs.writeFileSync(destination, bytes);
    }
}
console.log(
    "IANA 2026f: 440 zones, 158 raw links, 26448 transitions; " +
        (process.argv.includes("--check") ? "generated bytes verified" : "generated"),
);
