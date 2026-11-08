import {readFileSync} from "node:fs";

const materialization = [
    "F01 PASS", "F02 PASS", "F03 PASS", "F04 PASS", "F05 PASS", "F06 PASS",
    "F07 REPRESENTABLE PASS", "F08 PASS", "F09 REPRESENTABLE PASS", "F10 P01 PASS",
    "F11 PASS", "F12 PASS", "N01 PASS", "N02 PASS", "N03 PASS", "N04 PASS",
    "N05 PASS", "S05 PASS",
].join("\n") + "\n";
const setup = [
    "S01 P01 FUNCTION PASS", "B01 P01 BLOCK PASS", "G01 P01 GLOBAL PASS", "S02 PASS",
    "S03 S07 PASS", "S04 PASS", "S06 PASS", "B02 B03 PASS", "G01 MARKER G02 G03 PASS",
    "P02 TICK BOUNDARY PASS", "P03 PASS",
].join("\n") + "\n";

export const scriptHostCases = [];
for (const [variant, name, value] of [["a", "seed", 7], ["b", "other", 11]]) {
    for (const [driver, prefix] of [["script-function-materialization", materialization], ["script-function-setup", setup]]) {
        scriptHostCases.push({ driver, variant, fixture: `fixtures/${driver}/${variant}.txt`,
            stdout: prefix + `INPUT ${name} ${value} PASS\n` });
    }
    scriptHostCases.push({ driver: "property-accessors", variant,
        fixture: `fixtures/property-accessors/${variant}.txt`, stdout: `R01-R28 R33-R34 PASS ${name}|${value}\n` });
}
for (const [variant, input] of [["a", "caller|7|left"], ["b", "arguments|11|right"]]) {
    scriptHostCases.push({ driver: "script-restricted-properties", variant,
        fixture: `fixtures/script-restricted-properties/${variant}.txt`,
        stdout: `R29 PASS\nR30 dispatch projection PASS ${input}\nR31 PASS\nR32 PASS\nR35 guarded invocation PASS\n` });
}

// These accepted transcripts are read-only coverage witnesses. Each driver
// retains its own semantic assertions; new runs never regenerate this oracle.
for (const [driver, report, inputs] of [
    ["harness-catch", "catch", [["seed", "fixtures/harness-catch/seed.txt"], ["other", "fixtures/harness-catch/other.txt"]]],
    ["harness-switch", "switch", [["seven", "fixtures/harness-switch/input-seven.js"], ["eleven", "fixtures/harness-switch/input-eleven.js"]]],
    ["harness-for-update", "for-update", [["seven", "fixtures/harness-for-update/input-seven.js"], ["eleven", "fixtures/harness-for-update/input-eleven.js"]]],
    ["harness-nonstrict", "nonstrict", [["seven", "fixtures/harness-nonstrict/input-seven.js"], ["eleven", "fixtures/harness-nonstrict/input-eleven.js"]]],
    ["harness-construct", "construct", [["seven", "fixtures/harness-construct/input-seven.js"], ["eleven", "fixtures/harness-construct/input-eleven.js"]]],
    ["harness-errors-a", "kernel", [["seven", "fixtures/harness-errors-a/input-seven.js"], ["eleven", "fixtures/harness-errors-a/input-eleven.js"]]],
    ["harness-errors-b", "error", [["input-a", "fixtures/harness-errors-b/input-a.js"], ["input-b", "fixtures/harness-errors-b/input-b.js"]]],
    ["harness-map-default", "map", [["input-a", "test/fixtures/harness-map-default/input-a.js"], ["input-b", "test/fixtures/harness-map-default/input-b.js"]]],
    ["harness-formatting", "formatting", [["input-a", "test/fixtures/harness-formatting/input-a.js"], ["input-b", "test/fixtures/harness-formatting/input-b.js"]]],
]) {
    const path = new URL(`../docs/validation/ts-034h6-c/${report}-results.json`, import.meta.url);
    const snapshots = JSON.parse(readFileSync(path, "utf8"));
    for (const [variant, fixture] of inputs) {
        const snapshot = snapshots.find(row => (row.id ?? row.input) === variant);
        if (!snapshot || snapshot.node.status !== 0 || snapshot.native.status !== 0 ||
            snapshot.node.stderr !== "" || snapshot.native.stderr !== "" ||
            typeof snapshot.node.stdout !== "string" || snapshot.node.stdout !== snapshot.native.stdout)
            throw new Error("invalid accepted host-test transcript: " + driver + "/" + variant);
        scriptHostCases.push({driver, variant, fixture, stdout: snapshot.node.stdout});
    }
}
