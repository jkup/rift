import { GuestObject, UNDEFINED, failure, type Value, type ValueCompletion, type InternalBooleanCompletion } from "../src/runtime.js";
import { GuestArray } from "../src/array-object.js";
import { Realm } from "../src/realm.js";
import { toIntegerOrInfinity, toLength, type NumberCompletion } from "../src/conversion.js";
import { lengthOfArrayLike } from "../src/array-like.js";
import type { Location } from "../src/syntax.js";

const loc: Location = { line: 7, column: 13 };
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function boolean(result: InternalBooleanCompletion, expected: boolean): void {
    check(result.type === "normal" && result.value === expected, "boolean completion");
}
function numeric(result: NumberCompletion, expected: number): void {
    if (result.type !== "normal") throw new Error("unexpected numeric throw");
    check(result.value === expected, "numeric result: " + expected);
    if (expected === 0) check(1 / result.value === Infinity, "positive zero");
}
function unsupported(result: NumberCompletion): void {
    if (result.type !== "throw") throw new Error("expected unsupported conversion");
    check(result.diagnostic.phase === "runtime" && result.diagnostic.name === "TypeError", "conversion diagnostic");
    check(result.diagnostic.message === "object-to-primitive conversion unsupported", "explicit boundary");
    check(result.diagnostic.loc === loc, "conversion location");
}
function n(value: number): Value { return { kind: "number", value }; }
function s(value: string): Value { return { kind: "string", value }; }
function o(object: GuestObject): Value { return { kind: "object", object }; }

const parent = new GuestObject();
parent.define("x", UNDEFINED, true, true, true);
const child = new GuestObject();
boolean(child.setPrototypeOf(parent), true);
boolean(child.internalHasProperty("x", loc), true);
boolean(child.internalHasProperty("missing", loc), false);
child.define("x", n(8), true, true, true);
boolean(child.internalHasProperty("x", loc), true);
boolean(child.internalDelete("x"), true);
boolean(child.internalHasProperty("x", loc), true);
boolean(parent.internalDelete("x"), true);
boolean(child.internalHasProperty("x", loc), false);
child.define("x", UNDEFINED, false, false, false);
boolean(child.internalHasProperty("x", loc), true);
boolean(child.internalDelete("x"), false);
boolean(child.internalHasProperty("x", loc), true);

const array = new GuestArray();
boolean(array.defineOwnProperty("2", { value: UNDEFINED, configurable: true }, loc), true);
boolean(array.internalHasProperty("0", loc), false);
boolean(array.internalHasProperty("2", loc), true);
boolean(array.internalHasProperty("length", loc), true);
parent.define("1", UNDEFINED, true, true, true);
boolean(array.setPrototypeOf(parent), true);
boolean(array.internalHasProperty("1", loc), true);
check(array.getOwnProperty("1") === undefined, "inherited index stays hole");
boolean(array.internalDelete("1"), true);
boolean(array.internalHasProperty("1", loc), true);
boolean(array.internalDelete("2"), true);
boolean(array.internalHasProperty("2", loc), false);
numeric(lengthOfArrayLike(array, loc), 3);

// Append at the tail so cycle checks do not make construction quadratic.
const head = new GuestObject();
let tail = head;
for (let i = 0; i < 20000; i++) {
    const next = new GuestObject();
    boolean(tail.setPrototypeOf(next), true);
    tail = next;
}
tail.define("deep", UNDEFINED, true, true, true);
boolean(head.internalHasProperty("deep", loc), true);
boolean(head.internalHasProperty("absent", loc), false);
boolean(tail.internalDelete("deep"), true);
boolean(head.internalHasProperty("deep", loc), false);
const first = new Realm((_line) => {});
const second = new Realm((_line) => {});
const a = first.global.bindings.get("console");
const b = second.global.bindings.get("console");
if (a === undefined || b === undefined || a.value.kind !== "object" || b.value.kind !== "object") throw new Error("realm setup");
a.value.object.define("onlyFirst", UNDEFINED, true, true, true);
boolean(a.value.object.internalHasProperty("onlyFirst", loc), true);
boolean(b.value.object.internalHasProperty("onlyFirst", loc), false);

const rows: { input: Value; integer: number; length: number }[] = [
    { input: UNDEFINED, integer: 0, length: 0 },
    { input: { kind: "null" }, integer: 0, length: 0 },
    { input: { kind: "boolean", value: false }, integer: 0, length: 0 },
    { input: { kind: "boolean", value: true }, integer: 1, length: 1 },
    { input: n(NaN), integer: 0, length: 0 },
    { input: n(0), integer: 0, length: 0 },
    { input: n(-0), integer: 0, length: 0 },
    { input: n(Infinity), integer: Infinity, length: 9007199254740991 },
    { input: n(-Infinity), integer: -Infinity, length: 0 },
    { input: n(-1.9), integer: -1, length: 0 },
    { input: n(1.9), integer: 1, length: 1 },
    { input: n(-0.9), integer: 0, length: 0 },
    { input: n(0.9), integer: 0, length: 0 },
    { input: n(5e-324), integer: 0, length: 0 },
    { input: n(-5e-324), integer: 0, length: 0 },
    { input: n(4294967297), integer: 4294967297, length: 4294967297 },
    { input: n(9007199254740990), integer: 9007199254740990, length: 9007199254740990 },
    { input: n(9007199254740991), integer: 9007199254740991, length: 9007199254740991 },
    { input: n(9007199254740992), integer: 9007199254740992, length: 9007199254740991 },
    { input: n(1e100), integer: 1e100, length: 9007199254740991 },
    { input: n(-1e100), integer: -1e100, length: 0 },
    { input: s(" 3.9 "), integer: 3, length: 3 },
    { input: s("-0"), integer: 0, length: 0 },
    { input: s("-0.9"), integer: 0, length: 0 },
    { input: s(""), integer: 0, length: 0 },
    { input: s("junk"), integer: 0, length: 0 },
    { input: s("0x100000001"), integer: 4294967297, length: 4294967297 },
    { input: s("Infinity"), integer: Infinity, length: 9007199254740991 },
    { input: s("-Infinity"), integer: -Infinity, length: 0 },
];
const ordinary = new GuestObject();
numeric(lengthOfArrayLike(ordinary, loc), 0);
for (const row of rows) {
    numeric(toIntegerOrInfinity(row.input, loc), row.integer);
    numeric(toLength(row.input, loc), row.length);
    ordinary.define("length", row.input, true, true, true);
    numeric(lengthOfArrayLike(ordinary, loc), row.length);
}
const inherited = new GuestObject();
boolean(inherited.setPrototypeOf(ordinary), true);
ordinary.define("length", s("8.9"), true, true, true);
numeric(lengthOfArrayLike(inherited, loc), 8);
inherited.define("length", UNDEFINED, true, true, true);
numeric(lengthOfArrayLike(inherited, loc), 0);
boolean(inherited.internalDelete("length"), true);
numeric(lengthOfArrayLike(inherited, loc), 8);
unsupported(toIntegerOrInfinity(o(parent), loc));
unsupported(toLength(o(parent), loc));
ordinary.define("length", o(parent), true, true, true);
unsupported(lengthOfArrayLike(ordinary, loc));
numeric(lengthOfArrayLike(new GuestArray(), loc), 0);

class ObservedGet extends GuestObject {
    calls = 0;
    result: ValueCompletion = { type: "normal", value: s("12.9") };
    override internalGet(key: string, receiver: Value, actualLoc: Location): ValueCompletion {
        this.calls++;
        check(key === "length", "exact Get key");
        check(receiver.kind === "object" && receiver.object === this, "exact Get receiver");
        check(actualLoc === loc, "exact Get location");
        return this.result;
    }
}
const observed = new ObservedGet();
observed.define("length", n(999), true, true, true);
numeric(lengthOfArrayLike(observed, loc), 12);
check(observed.calls === 1, "one normal Get");
boolean(observed.internalHasProperty("length", loc), true);
boolean(observed.internalHasProperty("absent", loc), false);
check(observed.calls === 1, "presence performs no Get");
// An object throw payload would produce a different TypeError if converted.
const thrown = failure("SentinelError", "Get failed", loc);
thrown.value = o(parent);
observed.result = thrown;
const abrupt = lengthOfArrayLike(observed, loc);
check(abrupt === thrown, "exact throw completion; no conversion after throw");
if (abrupt.type !== "throw") throw new Error("expected Get throw");
check(abrupt.value === thrown.value && abrupt.diagnostic === thrown.diagnostic && abrupt.diagnostic.loc === loc, "throw payload/diagnostic/location identity");
check(observed.calls === 2, "one abrupt Get");
observed.result = { type: "normal", value: o(parent) };
unsupported(lengthOfArrayLike(observed, loc));
check(observed.calls === 3, "one Get before unsupported conversion");
console.log("array-like prerequisites passed");
