import { readFileSync } from "node:fs";

const materialization =
    [
        "F01 PASS",
        "F02 PASS",
        "F03 PASS",
        "F04 PASS",
        "F05 PASS",
        "F06 PASS",
        "F07 REPRESENTABLE PASS",
        "F08 PASS",
        "F09 REPRESENTABLE PASS",
        "F10 P01 PASS",
        "F11 PASS",
        "F12 PASS",
        "N01 PASS",
        "N02 PASS",
        "N03 PASS",
        "N04 PASS",
        "N05 PASS",
        "S05 PASS",
    ].join("\n") + "\n";
const setup =
    [
        "S01 P01 FUNCTION PASS",
        "B01 P01 BLOCK PASS",
        "G01 P01 GLOBAL PASS",
        "S02 PASS",
        "S03 S07 PASS",
        "S04 PASS",
        "S06 PASS",
        "B02 B03 PASS",
        "G01 MARKER G02 G03 PASS",
        "P02 TICK BOUNDARY PASS",
        "P03 PASS",
    ].join("\n") + "\n";

export const scriptHostCases = [];
for (const [variant, name, value] of [
    ["a", "seed", 7],
    ["b", "other", 11],
]) {
    for (const [driver, prefix] of [
        ["script-function-materialization", materialization],
        ["script-function-setup", setup],
    ]) {
        scriptHostCases.push({
            driver,
            variant,
            fixture: `fixtures/${driver}/${variant}.txt`,
            stdout: prefix + `INPUT ${name} ${value} PASS\n`,
        });
    }
    scriptHostCases.push({
        driver: "property-accessors",
        variant,
        fixture: `fixtures/property-accessors/${variant}.txt`,
        stdout: `R01-R28 R33-R34 PASS ${name}|${value}\n`,
    });
}
for (const [variant, input] of [
    ["a", "caller|7|left"],
    ["b", "arguments|11|right"],
]) {
    scriptHostCases.push({
        driver: "script-restricted-properties",
        variant,
        fixture: `fixtures/script-restricted-properties/${variant}.txt`,
        stdout: `R29 PASS\nR30 dispatch projection PASS ${input}\nR31 PASS\nR32 PASS\nR35 guarded invocation PASS\n`,
    });
}

// These accepted transcripts are read-only coverage witnesses. Each driver
// retains its own semantic assertions; new runs never regenerate this oracle.
for (const [driver, report, inputs] of [
    [
        "script-execution",
        "replays/execution",
        [
            ["seed", "fixtures/script-execution/seed.txt"],
            ["other", "fixtures/script-execution/other.txt"],
        ],
    ],
    [
        "harness-catch",
        "catch",
        [
            ["seed", "fixtures/harness-catch/seed.txt"],
            ["other", "fixtures/harness-catch/other.txt"],
        ],
    ],
    [
        "harness-switch",
        "switch",
        [
            ["seven", "fixtures/harness-switch/input-seven.js"],
            ["eleven", "fixtures/harness-switch/input-eleven.js"],
        ],
    ],
    [
        "harness-for-update",
        "for-update",
        [
            ["seven", "fixtures/harness-for-update/input-seven.js"],
            ["eleven", "fixtures/harness-for-update/input-eleven.js"],
        ],
    ],
    [
        "harness-nonstrict",
        "nonstrict",
        [
            ["seven", "fixtures/harness-nonstrict/input-seven.js"],
            ["eleven", "fixtures/harness-nonstrict/input-eleven.js"],
        ],
    ],
    [
        "harness-construct",
        "construct",
        [
            ["seven", "fixtures/harness-construct/input-seven.js"],
            ["eleven", "fixtures/harness-construct/input-eleven.js"],
        ],
    ],
    [
        "harness-errors-a",
        "kernel",
        [
            ["seven", "fixtures/harness-errors-a/input-seven.js"],
            ["eleven", "fixtures/harness-errors-a/input-eleven.js"],
        ],
    ],
    [
        "harness-errors-b",
        "error",
        [
            ["input-a", "fixtures/harness-errors-b/input-a.js"],
            ["input-b", "fixtures/harness-errors-b/input-b.js"],
        ],
    ],
    [
        "harness-map-default",
        "map",
        [
            ["input-a", "test/fixtures/harness-map-default/input-a.js"],
            ["input-b", "test/fixtures/harness-map-default/input-b.js"],
        ],
    ],
    [
        "harness-formatting",
        "formatting",
        [
            ["input-a", "test/fixtures/harness-formatting/input-a.js"],
            ["input-b", "test/fixtures/harness-formatting/input-b.js"],
        ],
    ],
]) {
    const path = new URL(`../docs/validation/ts-034h6-c/${report}-results.json`, import.meta.url);
    const snapshots = JSON.parse(readFileSync(path, "utf8"));
    for (const [variant, fixture] of inputs) {
        const snapshot = snapshots.find((row) => (row.id ?? row.input) === variant);
        if (
            !snapshot ||
            snapshot.node.status !== 0 ||
            snapshot.native.status !== 0 ||
            snapshot.node.stderr !== "" ||
            snapshot.native.stderr !== "" ||
            typeof snapshot.node.stdout !== "string" ||
            snapshot.node.stdout !== snapshot.native.stdout
        ) {
            throw new Error("invalid accepted host-test transcript: " + driver + "/" + variant);
        }
        let stdout = snapshot.node.stdout;
        if (driver === "harness-map-default") {
            const previous = "X06 unrepresentable";
            if (!stdout.includes(previous)) {
                throw new Error("missing map inventory witness");
            }
            stdout = stdout.replace(previous, "X06 intrinsic Array");
            stdout = stdout
                .replace("prefixes=308 calls=224", "prefixes=324 calls=224")
                .replace("all-trace abrupt prefixes=2340", "all-trace abrupt prefixes=2780");
        }
        scriptHostCases.push({ driver, variant, fixture, stdout });
    }
}

const declarationOutput = [
    ...Array.from({ length: 16 }, (_, i) => "G" + String(i + 1).padStart(2, "0")),
    "FAULTS",
    "CURRENT",
    "BOUNDARY",
    "LARGE",
]
    .map((label) => label + " PASS\n")
    .join("");
const recordOutput = [
    "P01",
    "P02",
    "P03",
    "P04",
    "P05",
    "U01",
    "NESTED",
    "R06",
    "BOUNDARY",
    "INPUT",
]
    .map((label) => label + " PASS\n")
    .join("");
const environmentOutput = [
    "L01",
    "L02",
    "L03",
    "L04",
    "T01",
    "T02",
    "T03",
    "C01",
    "C02",
    "C03",
    "C04",
]
    .map((label) => label + " PASS\n")
    .join("");
for (const [variant, value] of [
    ["seed", 7],
    ["other", 11],
]) {
    for (const [driver, stdout] of [
        ["script-global-declarations", declarationOutput],
        ["script-record", recordOutput],
        ["script-environment", environmentOutput + `INPUT ${variant} ${value} PASS\n`],
    ]) {
        scriptHostCases.push({
            driver,
            variant,
            fixture: `fixtures/${driver}/${variant}.txt`,
            stdout,
        });
    }
}
for (const [variant, value] of [
    ["alpha", 7],
    ["beta", 11],
]) {
    scriptHostCases.push({
        driver: "script-throw-inspection",
        variant,
        fixture: `test/fixtures/script-throw-inspection/${variant}.js`,
        stdout:
            `PASS X01-X06 U01-U02 input=${value} prefixes=10 calls=6 guest=3 faults=12\n` +
            `PASS P01-P09 positions=2 seeds=2 synthetic=64 guest=16 call=4 prefixes=16 input=${value}\n`,
    });
}
const bundleRows = JSON.parse(
    readFileSync(new URL("../docs/validation/ts-034h7/frozen-rows.json", import.meta.url), "utf8"),
);
if (bundleRows.length !== 18) {
    throw new Error("harness bundle fixture count");
}
for (const [variant, value] of [
    ["input-a", 7],
    ["input-b", 11],
]) {
    scriptHostCases.push({
        driver: "harness-bundle",
        variant,
        fixture: `test/fixtures/harness-bundle/${variant}.js`,
        stdout:
            bundleRows.map((row) => `PASS ${row.id}\n`).join("") +
            `PASS runtime ${value}\n` +
            "PASS fresh/seeded cross-Realm prefixes=24\nPASS repeated occurrence identity\n" +
            "PASS retained message identity\nPASS stage/failure priority controls=7\n",
    });
}
const globalFixture = "test/fixtures/global-environment.txt";
const globalOutput = Array.from(
    { length: 15 },
    (_, i) => `H${String(i + 1).padStart(2, "0")} PASS\n`,
).join("");
scriptHostCases.push({
    driver: "global-environment",
    variant: "literal",
    fixture: globalFixture,
    stdout: globalOutput,
});
const globalSource = readFileSync(new URL("../" + globalFixture, import.meta.url), "utf8");
scriptHostCases.push({
    driver: "global-environment",
    variant: "renamed",
    fixture: "build/guest-fixtures/global-environment-renamed.txt",
    stdout: globalOutput,
    source: globalSource
        .split("\n")
        .map((line) => (line ? line.replace(/\|([^|]+)\|/, "|runtime_$1|") : line))
        .join("\n"),
});
