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
