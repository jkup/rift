import "../src/realm.js";
import { stringToBigInt, bigintToString } from "../src/bigint-conversion.js";
import { normal, resourceFailure, type ValueCompletion } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
const loc: Location = { line: 3, column: 7 };
const unlimited = { tick: (_loc: Location): ValueCompletion => normal() };
function parses(text: string, expected: bigint | null): void {
    const result = stringToBigInt(text, unlimited, loc);
    check(result.type === "normal" && result.value === expected, "integer grammar: " + text);
}
const inputs = [
    "",
    "0",
    "-0",
    "+0",
    "01",
    "0008",
    "+0012",
    "-0012",
    "0xFf",
    "0O17",
    "0b101",
    "9007199254740993",
    "18446744073709551616",
    "-18446744073709551617",
];
const values = [
    0n,
    0n,
    0n,
    0n,
    1n,
    8n,
    12n,
    -12n,
    255n,
    15n,
    5n,
    9007199254740993n,
    18446744073709551616n,
    -18446744073709551617n,
];
for (let i = 0; i < inputs.length; i++) {
    parses(inputs[i], values[i]);
}
for (const input of [
    "+",
    "-",
    "+ 1",
    "1 2",
    "1\n2",
    "+0x1",
    "-0x1",
    "+0b1",
    "-0o1",
    "0x",
    "0b",
    "0o",
    "0b2",
    "0o8",
    "0xg",
    "1n",
    "1_0",
    "0x1_0",
    "1.0",
    ".1",
    "1.",
    "1e3",
    "Infinity",
    "NaN",
    "１２",
    "١",
    "\0",
    "\ud800",
    "0x1p2",
]) {
    parses(input, null);
}
for (const code of [
    9, 11, 12, 32, 160, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007,
    0x2008, 0x2009, 0x200a, 0x202f, 0x205f, 0x3000, 0xfeff, 10, 13, 0x2028, 0x2029,
]) {
    const w = String.fromCharCode(code);
    parses(w, 0n);
    parses(w + "-12" + w, -12n);
    parses("1" + w + "2", null);
}
for (const code of [0x85, 0x180e, 0x200b, 0x2060, 0xd800]) {
    parses(String.fromCharCode(code) + "1", null);
}
const large = (1n << 512n) - 1n;
parses("0x" + "f".repeat(128), large);
parses("0b" + "1".repeat(512), large);
parses("0o" + "7".repeat(100), (1n << 300n) - 1n);
check(bigintToString(large, 16) === "f".repeat(128), "large hexadecimal formatting");
check(bigintToString(-large, 2) === "-" + "1".repeat(512), "large signed binary formatting");
check(
    bigintToString(18446744073709551617n, 10) === "18446744073709551617",
    "exact decimal formatting",
);
check(
    bigintToString(-18446744073709551617n, 10) === "-18446744073709551617",
    "signed decimal formatting",
);
for (let radix = 2; radix <= 36; radix++) {
    const base = BigInt(radix),
        value = base * base * base + 1n;
    check(bigintToString(value, radix) === "1001", "all formatting radices");
    check(bigintToString(-value, radix) === "-1001", "all signed formatting radices");
    check(bigintToString(0n, radix) === "0", "zero formatting");
}
check(Number(9007199254740993n) === 9007199254740992, "binary64 round down at midpoint");
check(Number(9007199254740995n) === 9007199254740996, "binary64 round up at midpoint");
check(Number(-9007199254740995n) === -9007199254740996, "negative binary64 rounding");
check(Number(1n << 1024n) === Infinity, "binary64 overflow");
check(BigInt(9007199254740992) === 9007199254740992n, "exact number conversion");
check(-7n / 3n === -2n && -7n % 3n === -1n, "truncating division and signed remainder");
check(-7n >> 1n === -4n && 8n << -1n === 4n && 8n >> -1n === 16n, "signed and negative shifts");
check((1n << 512n) * (1n << 512n) === 1n << 1024n, "large products");
for (const text of ["123456789", "         ", "1        "]) {
    let calls = 0;
    const stopped = resourceFailure("steps", 4, 3, "integer scanner test", loc);
    const result = stringToBigInt(
        text,
        { tick: (_loc: Location): ValueCompletion => (++calls > 3 ? stopped : normal()) },
        loc,
    );
    check(result === stopped && calls === 4, "scanner preserves exact resource completion");
}
console.log("bigint conversion passed");
