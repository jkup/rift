import { Realm } from "../src/realm.js";
// scriptc 0.4.7 needs this runtime class reachable when analyzing Realm's types.
// See docs/validation/ts-016a/coverage-notes.md for the reduced failure.
import "../src/array-object.js";
import { stringToNumber, toNumber, toUint32 } from "../src/conversion.js";
import type { NumberCompletion } from "../src/conversion.js";
import { GuestObject, UNDEFINED } from "../src/runtime.js";
import type { Value, Completion } from "../src/runtime.js";

const loc = { line: 7, column: 11 };
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function numeric(actual: number, expected: number, label: string): void {
    check(Object.is(actual, expected), label + ": got " + actual + ", expected " + expected);
}
function completion(actual: NumberCompletion, expected: number, label: string): void {
    check(actual.type === "normal", label + " completion");
    if (actual.type === "normal") numeric(actual.value, expected, label);
}
function primitive(value: Value, expected: number, uint: number, label: string): void {
    completion(toNumber(value, loc), expected, label);
    completion(toUint32(value, loc), uint, label + " uint32");
}
primitive(UNDEFINED, NaN, 0, "undefined");
primitive({ kind: "null" }, 0, 0, "null");
primitive({ kind: "boolean", value: false }, 0, 0, "false");
primitive({ kind: "boolean", value: true }, 1, 1, "true");
for (const n of [0, -0, NaN, Infinity, -Infinity]) primitive({ kind: "number", value: n }, n, 0, "special number");

function string(value: string, expected: number): void {
    numeric(stringToNumber(value), expected, "string " + JSON.stringify(value));
    completion(toNumber({ kind: "string", value }, loc), expected, "string wrapper " + JSON.stringify(value));
}
const tokens = ["", "-0", "+0", "-0.0e+9", "Infinity", "+Infinity", "-Infinity", "01", ".5", "5.", "1e+3", "0x1f", "0X1F", "0O17", "0o17", "0B101", "0b101", "+.5", "-.5", "5.e2", "0008", "1E-2"];
const expected = [0, -0, 0, -0, Infinity, Infinity, -Infinity, 1, .5, 5, 1000, 31, 31, 15, 15, 5, 5, .5, -.5, 500, 8, .01];
for (let i = 0; i < tokens.length; i++) string(tokens[i], expected[i]);
const invalid = ["+0x1", "-0x1", "+0o1", "-0o1", "+0b1", "-0b1", "1_0", "1n", "1x", "1 2", "0x", "0o", "0b", ".", "+", "-", "1e", "1e+", "1e-", "infinity", "INFINITY", "NaN", "0b2", "0o8", "0xg", "0x1.0", "0x1p2", "1.2.3", "--1", "+-1", "\ud800", "\udfff", "\u0000", "1\u0000", "１２", "١", "1\n2"];
for (const token of invalid) string(token, NaN);
const whitespace = [0x9, 0xb, 0xc, 0x20, 0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x202f, 0x205f, 0x3000, 0xfeff, 0xa, 0xd, 0x2028, 0x2029];
let allWhitespace = "";
for (const code of whitespace) {
    const w = String.fromCharCode(code);
    allWhitespace += w;
    string(w, 0);
    string(w + "1", 1);
    string("1" + w, 1);
    string(w + "-0" + w, -0);
    string("1" + w + "2", NaN);
}
string(allWhitespace, 0);
string(allWhitespace + "1" + allWhitespace, 1);
for (const code of [0x85, 0x180e, 0x200b, 0x200c, 0x2060, 0xd800, 0xdfff]) {
    const w = String.fromCharCode(code);
    string(w, NaN);
    string(w + "1", NaN);
    string("1" + w, NaN);
}

// Fixed binary64 expectations, not Number(input) as an oracle. At 2^53 the
// spacing is 2; halfway integers choose the neighbor with an even significand.
string("9007199254740993", 9007199254740992);
string("9007199254740995", 9007199254740996);
string("-9007199254740993", -9007199254740992);
string("0x20000000000001", 9007199254740992);
string("0x20000000000003", 9007199254740996);
// Exact midpoint 1 + 2^-53 and values on either side.
string("1.00000000000000011102230246251565404236316680908203125", 1);
string("1.00000000000000011102230246251565404236316680908203124", 1);
string("1.00000000000000011102230246251565404236316680908203126", 1.0000000000000002);
string("1.00000000000000033306690738754696212708950042724609375", 1.0000000000000004);
string("1e309", Infinity);
string("-1e309", -Infinity);
string("1e-999", 0);
string("-1e-999", -0);
string("5e-324", 5e-324);
string("2e-324", 0);
string("3e-324", 5e-324);
string("1.7976931348623157e308", Number.MAX_VALUE);
// Long radix strings encode 2^100, 2^100+1 (round down), and 2^100-1
// (round up). Binary64 spacing there dwarfs 1. All three radices exercised.
string("0x1" + "0".repeat(25), 2 ** 100);
string("0x1" + "0".repeat(24) + "1", 2 ** 100);
string("0x" + "f".repeat(25), 2 ** 100);
string("0b1" + "0".repeat(100), 2 ** 100);
string("0b1" + "0".repeat(99) + "1", 2 ** 100);
string("0b" + "1".repeat(100), 2 ** 100);
string("0o2" + "0".repeat(33), 2 ** 100);
string("0o2" + "0".repeat(32) + "1", 2 ** 100);
string("0o1" + "7".repeat(33), 2 ** 100);
// At 2^100, one ULP is 2^48. Keep a halfway bit and a far-away
// sticky bit to detect rounding that discards trailing radix digits too soon.
string("0x1" + "0".repeat(13) + "8" + "0".repeat(11), 2 ** 100);
string("0x1" + "0".repeat(13) + "8" + "0".repeat(10) + "1", 2 ** 100 + 2 ** 48);
string("0b1" + "0".repeat(52) + "1" + "0".repeat(47), 2 ** 100);
string("0b1" + "0".repeat(52) + "1" + "0".repeat(46) + "1", 2 ** 100 + 2 ** 48);
string("0x1" + "0".repeat(256), Infinity);
string("0b1" + "0".repeat(1024), Infinity);
string("0o1" + "0".repeat(342), Infinity);

const inputs = [-1.9, 4294967297, 4294967295, 2 ** 53, -0.9, 0.9, -4294967296, -4294967297, 2 ** 53 - 1, 2 ** 60 + 256, -(2 ** 60 + 256), Number.MAX_VALUE, -Number.MAX_VALUE];
const uints = [4294967295, 1, 4294967295, 0, 0, 0, 0, 4294967295, 4294967295, 256, 4294967040, 0, 0];
for (let i = 0; i < inputs.length; i++) primitive({ kind: "number", value: inputs[i] }, inputs[i], uints[i], "modulo " + i);
primitive({ kind: "string", value: "-1.9" }, -1.9, 4294967295, "string modulo");
primitive({ kind: "string", value: "x" }, NaN, 0, "invalid string modulo");
primitive({ kind: "string", value: "0x100000001" }, 4294967297, 1, "radix modulo");

const object = new GuestObject();
const fixtureRealm = new Realm((_line) => {});
const hook = new GuestObject(null, false, { kind: "builtin", realm: fixtureRealm, invoke: (_receiver, _args, _context, _loc): Completion => { throw new Error("must not call conversion hook"); } });
object.bootstrapDefine("valueOf", { value: { kind: "object", object: hook }, writable: true, enumerable: true, configurable: true });
object.bootstrapDefine("toString", { value: { kind: "object", object: hook }, writable: true, enumerable: true, configurable: true });
for (const result of [toNumber({ kind: "object", object }, loc), toUint32({ kind: "object", object }, loc)]) {
    check(result.type === "throw", "unsupported object throws");
    if (result.type === "throw") {
        check(result.diagnostic.phase === "runtime" && result.diagnostic.name === "TypeError", "object diagnostic");
        check(result.diagnostic.message === "object-to-primitive conversion unsupported", "explicit unsupported boundary");
        check(result.diagnostic.loc.line === 7 && result.diagnostic.loc.column === 11, "object location preserved");
    }
}
check(object.ownPropertyKeys().length === 2, "object remains unchanged");
console.log("primitive conversion passed");
