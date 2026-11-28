// Literal results of the probe operations, independent of either execution lane.
// Review changes against the probe source; do not regenerate from captured output.
const outputs = {
    control: [
        "propagated: throw(from depth 0)",
        "finally normal keeps throw: throw(t)",
        "finally return wins: return(f)",
        "host returned: try try > finally",
        "fault caught: true",
        "depth 5000: 5000",
    ],
    dispatch: [
        "max 2 7",
        "missing arg: NaN",
        '"a1b"',
        "counter: 12",
        "identity: true true",
        "by id: 4 -2 5",
    ],
    // compiler-host.js is a pinned UTF-8 fixture; chars counts UTF-16 code units.
    host: [
        "chars: 92 lines: 4",
        "first line: // sample guest source — ünïcödé and an emoji 😀",
        "has escaped lone surrogate text: true",
    ],
    interpreter: [
        "1",
        "2",
        "3",
        "6765",
        "499500",
        "caught: ReferenceError: missing is not defined",
    ],
    // The runner supplies 200000 iterations, each contributing 64 elements.
    // RSS diagnostics are deliberately on stderr and are not frozen here.
    memory: ["total: 12800000"],
    numbers: [
        "signed zero: false -Infinity true",
        "NaN: false true true",
        "infinities: Infinity -Infinity NaN",
        "remainder: 1.5 -1 true NaN",
        "int32: -2147483648 4294967295 5 1 -1",
        "shifts: -2147483648 1 -4 15",
        "max safe: 9007199254740992 5e-324 1.7976931348623157e+308",
        "toString: 0.30000000000000004 1e+21 1e-7 123.456 5e-324 9007199254740992 -1e-7 100 0.000001",
        "toString(-0): 0 0",
        "radix: ff 11111111 0.1 -73",
        "toFixed: 1.00 1e+21 0.0",
        "toPrecision: 123.5 0.000012",
        "Number(): 42 31 5 15 1000 0.5 5 0 0 NaN 0 Infinity NaN",
        "Object.is(Number('-0'), -0): true",
        "parseFloat: 3.14 -5 8 255",
        "Math: -0 3 -Infinity -0 -0",
        "pow: 1.4142135623730951 NaN 1 1",
    ],
    objects: [
        "own keys: 2,10,b,a",
        "inherited: 1",
        "missing: undefined",
        "after alias write: 100",
        "b: 2 true",
        "symbol vs string: 99 4 undefined",
        "reinserted order: 2,10,a,b",
    ],
    strings: [
        "pair length: 2 d83d de00",
        "pair codePointAt: 1f600",
        "lone high: 1 d83d",
        "lone low: 1 de00",
        "split pair: d83d | de00",
        "rejoined equals: true",
        "nul: 3 61 0 62",
        "fromCharCode lone: d800 41",
        "compare units: true true true",
        "indexOf lone low in pair: 1",
        "concat lone halves: 2 true",
        "spread pair: 1",
        "toUpperCase: STRASSE 2",
        'json lone: "\\ud83d"',
        "built: 5 48 d83d de00 dc00 21",
    ],
    suspension: [
        "yielded 3",
        "  resumed at depth 3 with 100",
        "yielded 2",
        "  resumed at depth 2 with 101",
        "yielded 1",
        "  resumed at depth 1 with 102",
        "1",
        "  generator finally",
        'return(): {"value":"early","done":true}',
        "frame yields: 1,3,6,10 final: 10",
    ],
    values: [
        "undefined undefined false",
        "null object false",
        "bool(true) boolean true",
        "num(0) number false",
        "num(0) number false",
        "num(NaN) number false",
        "num(42) number true",
        'str("") string false',
        'str("hi") string true',
        "obj(Point) object true",
        'after replace: str("replaced")',
        "shared identity: Renamed true",
    ],
};

export function expectedProbeOutput(name) {
    if (!Object.hasOwn(outputs, name)) {
        throw new Error(`Missing expected output for compiler probe: ${name}`);
    }
    return outputs[name].join("\n") + "\n";
}
