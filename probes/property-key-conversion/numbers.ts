// Fixed expectations, not computed through the backend under test.
const cases: { label: string; input: number; expected: string }[] = [
    { label: "positive-zero", input: 0, expected: "0" },
    { label: "negative-zero", input: -0, expected: "0" },
    { label: "nan", input: NaN, expected: "NaN" },
    { label: "positive-infinity", input: Infinity, expected: "Infinity" },
    { label: "negative-infinity", input: -Infinity, expected: "-Infinity" },
    { label: "one", input: 1, expected: "1" },
    { label: "negative-integer", input: -42, expected: "-42" },
    { label: "fraction", input: 1.5, expected: "1.5" },
    { label: "safe-max", input: 9007199254740991, expected: "9007199254740991" },
    { label: "safe-next", input: 9007199254740992, expected: "9007199254740992" },
    { label: "rounded-integer", input: 1000000000000000128, expected: "1000000000000000100" },
    { label: "array-index-max", input: 4294967294, expected: "4294967294" },
    { label: "array-nonindex", input: 4294967295, expected: "4294967295" },
    { label: "max-finite", input: Number.MAX_VALUE, expected: "1.7976931348623157e+308" },
    { label: "negative-max", input: -Number.MAX_VALUE, expected: "-1.7976931348623157e+308" },
    { label: "min-subnormal", input: Number.MIN_VALUE, expected: "5e-324" },
    { label: "negative-subnormal", input: -Number.MIN_VALUE, expected: "-5e-324" },
    { label: "next-subnormal", input: 1e-323, expected: "1e-323" },
    {
        label: "largest-subnormal",
        input: 2.225073858507201e-308,
        expected: "2.225073858507201e-308",
    },
    { label: "min-normal", input: 2.2250738585072014e-308, expected: "2.2250738585072014e-308" },
    {
        label: "below-small-boundary",
        input: 9.999999999999997e-7,
        expected: "9.999999999999997e-7",
    },
    { label: "small-boundary", input: 1e-6, expected: "0.000001" },
    {
        label: "above-small-boundary",
        input: 0.0000010000000000000002,
        expected: "0.0000010000000000000002",
    },
    { label: "small-exponent", input: 1e-7, expected: "1e-7" },
    { label: "negative-small-boundary", input: -1e-6, expected: "-0.000001" },
    { label: "large-decimal", input: 1e20, expected: "100000000000000000000" },
    {
        label: "below-large-boundary",
        input: 999999999999999900000,
        expected: "999999999999999900000",
    },
    { label: "large-boundary", input: 1e21, expected: "1e+21" },
    {
        label: "above-large-boundary",
        input: 1.0000000000000001e21,
        expected: "1.0000000000000001e+21",
    },
    { label: "negative-large-boundary", input: -1e21, expected: "-1e+21" },
    { label: "tenth", input: 0.1, expected: "0.1" },
    { label: "sum", input: 0.1 + 0.2, expected: "0.30000000000000004" },
    { label: "one-next", input: 1.0000000000000002, expected: "1.0000000000000002" },
    { label: "one-previous", input: 0.9999999999999999, expected: "0.9999999999999999" },
    { label: "seventeen-digits", input: 1.2345678901234567, expected: "1.2345678901234567" },
    { label: "pi", input: Math.PI, expected: "3.141592653589793" },
];

// Typed numeric payload only. Never pass a guest wrapper to host String.
function numberToString(value: number): string {
    return String(value);
}

let failures = 0;
for (const row of cases) {
    const actual = numberToString(row.input);
    const pass = actual === row.expected;
    if (!pass) {
        failures++;
    }
    console.log(row.label + "|" + row.expected + "|" + actual + "|" + (pass ? "PASS" : "FAIL"));
}
console.log("cases=" + cases.length + "; failures=" + failures);
process.exitCode = failures === 0 ? 0 : 1;
