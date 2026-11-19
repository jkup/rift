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
            fixture: `test/fixtures/${driver}/${variant}.txt`,
            stdout: prefix + `INPUT ${name} ${value} PASS\n`,
        });
    }
    scriptHostCases.push({
        driver: "property-accessors",
        variant,
        fixture: `test/fixtures/property-accessors/${variant}.txt`,
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
        fixture: `test/fixtures/script-restricted-properties/${variant}.txt`,
        stdout: `R29 PASS\nR30 dispatch projection PASS ${input}\nR31 PASS\nR32 PASS\nR35 guarded invocation PASS\n`,
    });
}

// Expected output is fixed; each driver also retains its semantic assertions.
scriptHostCases.push(
    {
        driver: "script-execution",
        variant: "seed",
        fixture: "test/fixtures/script-execution/seed.txt",
        stdout: "PASS runtime function seed\nPASS semantic matrix basic globals locals references completions budgets\nPASS thirteen restricted traces every resource prefix seeded and fresh\nPASS literal root function block global prefix counts\nPASS N01-N04 original-node naming and source\nPASS captured owner two active sessions escaping B sentinel restored A exact frames\nPASS cross Realm original records allocation restricted provenance\nPASS exact guest completion location one-use direct replay denial\nPASS FDI every eighteen-tick setup prefix with shared source-unit budget\nPASS strict this and configurable restricted endpoint mutation neighbors\nPASS reachable accessor coercion body host faults and depth257 cleanup\nPASS mixed cross Realm call permit tuple neighbors grammar and retained effects\nPASS nested step call restoration closure persistence nonextensible existing global\nPASS shared expressions arrays builtin callbacks conversions cached property references\n",
    },
    {
        driver: "script-execution",
        variant: "other",
        fixture: "test/fixtures/script-execution/other.txt",
        stdout: "PASS runtime function other\nPASS semantic matrix basic globals locals references completions budgets\nPASS thirteen restricted traces every resource prefix seeded and fresh\nPASS literal root function block global prefix counts\nPASS N01-N04 original-node naming and source\nPASS captured owner two active sessions escaping B sentinel restored A exact frames\nPASS cross Realm original records allocation restricted provenance\nPASS exact guest completion location one-use direct replay denial\nPASS FDI every eighteen-tick setup prefix with shared source-unit budget\nPASS strict this and configurable restricted endpoint mutation neighbors\nPASS reachable accessor coercion body host faults and depth257 cleanup\nPASS mixed cross Realm call permit tuple neighbors grammar and retained effects\nPASS nested step call restoration closure persistence nonextensible existing global\nPASS shared expressions arrays builtin callbacks conversions cached property references\n",
    },
    {
        driver: "harness-catch",
        variant: "seed",
        fixture: "test/fixtures/harness-catch/seed.txt",
        stdout: "PASS runtime source\nPASS C01\nPASS C02\nPASS C03\nPASS C05\nPASS C11\nPASS C12\nPASS C13\nPASS D01\nPASS D02\nPASS D03\nPASS D04\nPASS D08\nPASS D09\nPASS C06 C07 D05 D06 D07 D10 grammar neighbors\nPASS P14 fresh/seven-seeded all prefixes\nPASS P14R fresh/seven-seeded all prefixes\nPASS P05 fresh/seven-seeded all prefixes\nPASS P15F fresh/seven-seeded all prefixes\nPASS C14 same Realm\nPASS C14 cross Realm\nPASS C04 C08 C09 C10 consumption history and origin distinction\nPASS declaration inspection detached catch metadata\nPASS explicit empty and C01 C04 C13 cross-unit cross-Realm controls\nPASS exact legacy var and distinct try-catch AST diagnostics\n",
    },
    {
        driver: "harness-catch",
        variant: "other",
        fixture: "test/fixtures/harness-catch/other.txt",
        stdout: "PASS runtime source\nPASS C01\nPASS C02\nPASS C03\nPASS C05\nPASS C11\nPASS C12\nPASS C13\nPASS D01\nPASS D02\nPASS D03\nPASS D04\nPASS D08\nPASS D09\nPASS C06 C07 D05 D06 D07 D10 grammar neighbors\nPASS P14 fresh/seven-seeded all prefixes\nPASS P14R fresh/seven-seeded all prefixes\nPASS P05 fresh/seven-seeded all prefixes\nPASS P15F fresh/seven-seeded all prefixes\nPASS C14 same Realm\nPASS C14 cross Realm\nPASS C04 C08 C09 C10 consumption history and origin distinction\nPASS declaration inspection detached catch metadata\nPASS explicit empty and C01 C04 C13 cross-unit cross-Realm controls\nPASS exact legacy var and distinct try-catch AST diagnostics\n",
    },
    {
        driver: "harness-switch",
        variant: "seven",
        fixture: "test/fixtures/harness-switch/input-seven.js",
        stdout: "PASS runtime source\nPASS S01-S30 literal semantics\nPASS N01-N10 whole-source boundaries and neighbors\nPASS 208 fresh/seven-seeded prefixes\nPASS X01 exact throw origins at three stages\nPASS X02 consumed throw history same/cross Realm\nPASS X03 nested B host fault restores active A and permits\nPASS X04 exact legacy guards and audit closure\nPASS X05 ownership inspection and retained closure\nPASS S07 host symbol/object identity without coercion\n",
    },
    {
        driver: "harness-switch",
        variant: "eleven",
        fixture: "test/fixtures/harness-switch/input-eleven.js",
        stdout: "PASS runtime source\nPASS S01-S30 literal semantics\nPASS N01-N10 whole-source boundaries and neighbors\nPASS 208 fresh/seven-seeded prefixes\nPASS X01 exact throw origins at three stages\nPASS X02 consumed throw history same/cross Realm\nPASS X03 nested B host fault restores active A and permits\nPASS X04 exact legacy guards and audit closure\nPASS X05 ownership inspection and retained closure\nPASS S07 host symbol/object identity without coercion\n",
    },
    {
        driver: "harness-for-update",
        variant: "seven",
        fixture: "test/fixtures/harness-for-update/input-seven.js",
        stdout: "PASS runtime source\nPASS F01\nPASS F02\nPASS F03\nPASS F04\nPASS F05\nPASS F06\nPASS F07\nPASS F08\nPASS F09\nPASS F10\nPASS F11\nPASS F12\nPASS F12\nPASS F13\nPASS F14\nPASS F15\nPASS F16\nPASS F17\nPASS F18\nPASS F19\nPASS F20\nPASS H2-N08-positive\nPASS N01-N14 frozen negatives\nPASS 190 fresh/seven-seeded prefixes\nPASS U01-U16 numeric/reference/coercion controls\nPASS X01 four origins at ten stages, caught and uncaught\nPASS X02 caught A then reused B throw same/cross Realm\nPASS X03 nested B host fault restores active A and permits\nPASS X04 recursion getter false steps 169\nPASS X04 recursion getter true steps 329\nPASS X04 recursion number false steps 202\nPASS X04 recursion number true steps 394\nPASS X04 same-session cross-Realm getter/numeric reentry\nPASS X05 legacy guards, source associations, closure retention, resource and grammar boundaries\n",
    },
    {
        driver: "harness-for-update",
        variant: "eleven",
        fixture: "test/fixtures/harness-for-update/input-eleven.js",
        stdout: "PASS runtime source\nPASS F01\nPASS F02\nPASS F03\nPASS F04\nPASS F05\nPASS F06\nPASS F07\nPASS F08\nPASS F09\nPASS F10\nPASS F11\nPASS F12\nPASS F12\nPASS F13\nPASS F14\nPASS F15\nPASS F16\nPASS F17\nPASS F18\nPASS F19\nPASS F20\nPASS H2-N08-positive\nPASS N01-N14 frozen negatives\nPASS 190 fresh/seven-seeded prefixes\nPASS U01-U16 numeric/reference/coercion controls\nPASS X01 four origins at ten stages, caught and uncaught\nPASS X02 caught A then reused B throw same/cross Realm\nPASS X03 nested B host fault restores active A and permits\nPASS X04 recursion getter false steps 169\nPASS X04 recursion getter true steps 329\nPASS X04 recursion number false steps 202\nPASS X04 recursion number true steps 394\nPASS X04 same-session cross-Realm getter/numeric reentry\nPASS X05 legacy guards, source associations, closure retention, resource and grammar boundaries\n",
    },
    {
        driver: "harness-nonstrict",
        variant: "seven",
        fixture: "test/fixtures/harness-nonstrict/input-seven.js",
        stdout: "PASS runtime source\nPASS M01\nPASS M02\nPASS M03-M04\nPASS M05\nPASS M06\nPASS M07-M09\nPASS M10\nPASS M11\nPASS M12\nPASS M13\nPASS M14\nPASS M15\nPASS R01-R07 R16 R17\nPASS R09\nPASS R10\nPASS R13\nPASS R08 R12\nPASS R11 R14 R15 R16 setter\nPASS D01-D06\nPASS negative neighbors\nPASS N01-N16 strict entry and directives\nPASS 190 fresh/seven-seeded prefixes\nPASS X01 X03 nested sessions and host faults\nPASS X02 X07 exact abrupt and consumed history\nPASS X04 X06 cross-mode reference reentry\nPASS X08 exact call budgets and cleanup\nPASS X05 guards and private completed body environment\nPASS late global effects failed FDI and rejection precedence\nPASS X06 exact abrupt provenance through key get set\nPASS local identifier deletion\nPASS numeric abrupt and fresh var descriptors\nPASS frozen reference literals and strict twins\n",
    },
    {
        driver: "harness-nonstrict",
        variant: "eleven",
        fixture: "test/fixtures/harness-nonstrict/input-eleven.js",
        stdout: "PASS runtime source\nPASS M01\nPASS M02\nPASS M03-M04\nPASS M05\nPASS M06\nPASS M07-M09\nPASS M10\nPASS M11\nPASS M12\nPASS M13\nPASS M14\nPASS M15\nPASS R01-R07 R16 R17\nPASS R09\nPASS R10\nPASS R13\nPASS R08 R12\nPASS R11 R14 R15 R16 setter\nPASS D01-D06\nPASS negative neighbors\nPASS N01-N16 strict entry and directives\nPASS 190 fresh/seven-seeded prefixes\nPASS X01 X03 nested sessions and host faults\nPASS X02 X07 exact abrupt and consumed history\nPASS X04 X06 cross-mode reference reentry\nPASS X08 exact call budgets and cleanup\nPASS X05 guards and private completed body environment\nPASS late global effects failed FDI and rejection precedence\nPASS X06 exact abrupt provenance through key get set\nPASS local identifier deletion\nPASS numeric abrupt and fresh var descriptors\nPASS frozen reference literals and strict twins\n",
    },
    {
        driver: "harness-construct",
        variant: "seven",
        fixture: "test/fixtures/harness-construct/input-seven.js",
        stdout: "PASS runtime source\nPASS C01\nPASS C04\nPASS C06\nPASS C15\nPASS C17\nPASS C01\nPASS C04\nPASS C06\nPASS C15\nPASS C17\nPASS C02 C03 C05 C16 C18 strict twins\nPASS C07-C11\nPASS C12-C14\nPASS I01-I10 I12\nPASS I11 grammar\nPASS I11 D01-D05\nPASS N01-N16 original negative migrations\nPASS 172 fresh/seven-seeded prefixes\nPASS A01-A04 A07-A10 guest/host/catch identity\nPASS A05 A06 A11 resources and guest getter provenance\nPASS X01 X02 X11 source and consumed history\nPASS X03 nested normal/guest/host cleanup\nPASS X04 X05 reentry and captured idle context\nPASS X06 X07 X08 permits slots and profiles\nPASS X09 default64 recursion and resource catch bypass\nPASS X12 ordinary call from prototype getter\nPASS X10 limits and legacy boundaries\nPASS publication descriptors defining Realm and strict entry\nPASS grammar chains\nPASS retained function source\nPASS NoIn instanceof\nPASS grammar chains\nPASS retained function source\nPASS NoIn instanceof\nPASS constructor grammar and original source associations\nPASS new keyword versus string literal grammar\nPASS callee arguments prototype allocation body order\n",
    },
    {
        driver: "harness-construct",
        variant: "eleven",
        fixture: "test/fixtures/harness-construct/input-eleven.js",
        stdout: "PASS runtime source\nPASS C01\nPASS C04\nPASS C06\nPASS C15\nPASS C17\nPASS C01\nPASS C04\nPASS C06\nPASS C15\nPASS C17\nPASS C02 C03 C05 C16 C18 strict twins\nPASS C07-C11\nPASS C12-C14\nPASS I01-I10 I12\nPASS I11 grammar\nPASS I11 D01-D05\nPASS N01-N16 original negative migrations\nPASS 172 fresh/seven-seeded prefixes\nPASS A01-A04 A07-A10 guest/host/catch identity\nPASS A05 A06 A11 resources and guest getter provenance\nPASS X01 X02 X11 source and consumed history\nPASS X03 nested normal/guest/host cleanup\nPASS X04 X05 reentry and captured idle context\nPASS X06 X07 X08 permits slots and profiles\nPASS X09 default64 recursion and resource catch bypass\nPASS X12 ordinary call from prototype getter\nPASS X10 limits and legacy boundaries\nPASS publication descriptors defining Realm and strict entry\nPASS grammar chains\nPASS retained function source\nPASS NoIn instanceof\nPASS grammar chains\nPASS retained function source\nPASS NoIn instanceof\nPASS constructor grammar and original source associations\nPASS new keyword versus string literal grammar\nPASS callee arguments prototype allocation body order\n",
    },
    {
        driver: "harness-errors-a",
        variant: "seven",
        fixture: "test/fixtures/harness-errors-a/input-seven.js",
        stdout: "PASS A01\nPASS A02\nPASS A03\nPASS A04\nPASS A05\nPASS A06\nPASS A07\nPASS A08\nPASS A09\n",
    },
    {
        driver: "harness-errors-a",
        variant: "eleven",
        fixture: "test/fixtures/harness-errors-a/input-eleven.js",
        stdout: "PASS A01\nPASS A02\nPASS A03\nPASS A04\nPASS A05\nPASS A06\nPASS A07\nPASS A08\nPASS A09\n",
    },
    {
        driver: "harness-errors-b",
        variant: "input-a",
        fixture: "test/fixtures/harness-errors-b/input-a.js",
        stdout: "PASS E01 E02 E03\nPASS E04 E05\nPASS E08 E09 E11\nPASS E12 E13 E14\nPASS E15\nPASS E16 E23\nPASS E17 E18 E19\nPASS E20 E21\nPASS E22\nPASS E24 E25\nPASS E26 E27 E28\nPASS E31 E34 E35 E36\nPASS E06 E07 E10 E29 E30 E32 E33 frozen B traces\nPASS B prefixes 504\nPASS G01 G02 G03 G04 G05 G06 G07 G09\nPASS G08 cross-tag legitimate nested call\nPASS G10 nested normal language host\nPASS runtime input-a 7 seven\nPASS Symbol hooks and formatting conversion\n",
    },
    {
        driver: "harness-errors-b",
        variant: "input-b",
        fixture: "test/fixtures/harness-errors-b/input-b.js",
        stdout: "PASS E01 E02 E03\nPASS E04 E05\nPASS E08 E09 E11\nPASS E12 E13 E14\nPASS E15\nPASS E16 E23\nPASS E17 E18 E19\nPASS E20 E21\nPASS E22\nPASS E24 E25\nPASS E26 E27 E28\nPASS E31 E34 E35 E36\nPASS E06 E07 E10 E29 E30 E32 E33 frozen B traces\nPASS B prefixes 504\nPASS G01 G02 G03 G04 G05 G06 G07 G09\nPASS G08 cross-tag legitimate nested call\nPASS G10 nested normal language host\nPASS runtime input-b 11 eleven\nPASS Symbol hooks and formatting conversion\n",
    },
    {
        driver: "harness-map-default",
        variant: "input-a",
        fixture: "test/fixtures/harness-map-default/input-a.js",
        stdout: "PASS frozen prefixes=324 calls=224 input-a\nPASS semantic selection=108\nPASS abrupt prefixes=480\nPASS parsed getters=200\nPASS separate-session reentry=48\nPASS lengths mutations profiles inventories; X06 intrinsic Array\nPASS exhaustive primitive controls=56 length coercion\nPASS Object-link and foreign Script constructor controls=28\nPASS all-trace abrupt prefixes=2780\nPASS length-getter and empty-array abrupt selection\n",
    },
    {
        driver: "harness-map-default",
        variant: "input-b",
        fixture: "test/fixtures/harness-map-default/input-b.js",
        stdout: "PASS frozen prefixes=324 calls=224 input-b\nPASS semantic selection=108\nPASS abrupt prefixes=480\nPASS parsed getters=200\nPASS separate-session reentry=48\nPASS lengths mutations profiles inventories; X06 intrinsic Array\nPASS exhaustive primitive controls=56 length coercion\nPASS Object-link and foreign Script constructor controls=28\nPASS all-trace abrupt prefixes=2780\nPASS length-getter and empty-array abrupt selection\n",
    },
    {
        driver: "harness-formatting",
        variant: "input-a",
        fixture: "test/fixtures/harness-formatting/input-a.js",
        stdout: "PASS host schedules prefixes=400 calls=192 abrupt=464\nPASS parsed prefixes=188 calls=64 abrupt=384\nPASS F01-F12 semantics metadata UTF16 legacy cross-Realm\nPASS actual C Object-link species controls=15\nPASS separate-session reentries=14 finally BOTH original reuse raw denials\nPASS C guard negatives; immutable prototype order remains source-reviewed\nPASS runtime input-a 7 seven\n",
    },
    {
        driver: "harness-formatting",
        variant: "input-b",
        fixture: "test/fixtures/harness-formatting/input-b.js",
        stdout: "PASS host schedules prefixes=400 calls=192 abrupt=464\nPASS parsed prefixes=188 calls=64 abrupt=384\nPASS F01-F12 semantics metadata UTF16 legacy cross-Realm\nPASS actual C Object-link species controls=15\nPASS separate-session reentries=14 finally BOTH original reuse raw denials\nPASS C guard negatives; immutable prototype order remains source-reviewed\nPASS runtime input-b 11 eleven\n",
    },
);

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
            fixture: `test/fixtures/${driver}/${variant}.txt`,
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
const bundleIds = [
    "B01",
    "B02",
    "B03",
    "B04",
    "B05",
    "B06",
    "B07",
    "B08",
    "B09",
    "B10",
    "B11",
    "B12",
    "B13",
    "B14",
    "B15",
    "B16",
    "N01",
    "N02",
];
for (const [variant, value] of [
    ["input-a", 7],
    ["input-b", 11],
]) {
    scriptHostCases.push({
        driver: "harness-bundle",
        variant,
        fixture: `test/fixtures/harness-bundle/${variant}.js`,
        stdout:
            bundleIds.map((id) => `PASS ${id}\n`).join("") +
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

export function bootstrapFixtures(root) {
    const rows = readFileSync(root + "/test/fixtures/script-realm-bootstrap/rows.txt", "utf8");
    const stdout = Array.from(
        { length: 18 },
        (_, index) => `B${String(index + 1).padStart(2, "0")} PASS\n`,
    ).join("");
    return [
        { name: "seed", text: rows, stdout },
        { name: "other", text: rows.replaceAll("|seed|7", "|other|11"), stdout },
    ];
}
