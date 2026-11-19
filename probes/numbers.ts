// Probe: IEEE-754 corners and the host Number <-> string conversions an
// engine would like to reuse for ToString(Number) and StringToNumber.

const negZero = -0;
console.log("signed zero:", Object.is(negZero, 0), 1 / negZero, negZero === 0);
const nan: number = Number("x");
console.log("NaN:", nan === nan, Object.is(NaN, NaN), Number.isNaN(0 / 0));
console.log("infinities:", 1 / 0, -1 / 0, Infinity - Infinity);
console.log("remainder:", 5.5 % 2, -5 % 2, Object.is(-4 % 2, -0), 5 % 0);
console.log("int32:", (2 ** 31) | 0, -1 >>> 0, (2 ** 32 + 5) | 0, 1.9 | 0, -1.9 | 0);
console.log("shifts:", 1 << 31, 1 << 32, -16 >> 2, -16 >>> 28);
console.log("max safe:", Number.MAX_SAFE_INTEGER + 2, Number.MIN_VALUE, Number.MAX_VALUE);

const formatted = [0.1 + 0.2, 1e21, 1e-7, 123.456, 5e-324, 2 ** 53, -1e-7, 100, 0.000001];
console.log("toString:", formatted.map((x) => String(x)).join(" "));
console.log("toString(-0):", String(negZero), `${negZero}`);
console.log(
    "radix:",
    (255).toString(16),
    (255).toString(2),
    (0.5).toString(2),
    (-255).toString(36),
);
console.log("toFixed:", (1.005).toFixed(2), (1e21).toFixed(2), (0).toFixed(1));
console.log("toPrecision:", (123.456).toPrecision(4), (0.00001234).toPrecision(2));

const parsed = [
    "  42  ",
    "0x1F",
    "0b101",
    "0o17",
    "1e3",
    ".5",
    "5.",
    "",
    " ",
    "abc",
    "-0",
    "Infinity",
    "1_000",
];
console.log("Number():", parsed.map((s) => String(Number(s))).join(" "));
console.log("Object.is(Number('-0'), -0):", Object.is(Number("-0"), -0));
console.log(
    "parseFloat:",
    parseFloat("3.14abc"),
    parseFloat("-.5e1x"),
    parseInt("08"),
    parseInt("ff", 16),
);
console.log("Math:", Math.round(-0.5), Math.round(2.5), Math.max(), Math.min(0, -0), Math.sign(-0));
console.log("pow:", 2 ** 0.5, (-8) ** (1 / 3), 0 ** 0, NaN ** 0);
