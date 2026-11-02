import { Evaluator } from "../src/evaluator.js";
const keyContext = new Evaluator(new Realm((_line) => {})).context;
const loc = { line: 1, column: 1 };
import { arrayIndex, stringIndex } from "../src/property-keys.js";
import { toPropertyKey } from "../src/conversion.js";
import { GuestObject, UNDEFINED, sameValue } from "../src/runtime.js";
import type { InternalBooleanCompletion } from "../src/runtime.js";
import { Realm } from "../src/realm.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function result(actual: InternalBooleanCompletion, expected: boolean, label: string): void {
    check(actual.type === "normal" && actual.value === expected, label);
}
function list(actual: string[], expected: string[], label: string): void {
    check(actual.length === expected.length, label + " length");
    for (let i = 0; i < expected.length; i++) check(actual[i] === expected[i], label + " position " + i);
}
function add(o: GuestObject, key: string): void { o.bootstrapDefine(key, { value: UNDEFINED, writable: true, enumerable: true, configurable: true }); }

const valid = ["0", "1", "9", "10", "100", "2147483647", "2147483648", "4294967293", "4294967294"];
const values = [0, 1, 9, 10, 100, 2147483647, 2147483648, 4294967293, 4294967294];
for (let i = 0; i < valid.length; i++) check(arrayIndex(valid[i]) === values[i], "index " + valid[i]);
const invalid = ["", "00", "01", "0000000000", "-0", "-1", "+0", "+1", " 1", "1 ", "\t1", "1\n", "1.0", "0.0", ".1", "1.5", "1e0", "1E1", "0x10", "0b10", "0o10", "1_0", "NaN", "Infinity", "4294967295", "4294967296", "9999999999", "10000000000", "9007199254740991", "１２", "١", "1\0", "\ud800"];
for (const key of invalid) check(arrayIndex(key) === undefined, "ordinary string " + key);
const unusual = new GuestObject();
for (const key of invalid) add(unusual, key);
list(unusual.ownPropertyKeys(), invalid, "all noncanonical keys retain insertion order");

const o = new GuestObject();
list(o.ownPropertyKeys(), [], "empty");
for (const key of ["z", "10", "4294967295", "2", "01", "4294967294", "0", "a", "2147483648"]) add(o, key);
o.bootstrapDefine("hidden", { value: UNDEFINED, writable: false, enumerable: false, configurable: true });
o.bootstrapDefine("3", { value: UNDEFINED, writable: false, enumerable: false, configurable: false });
const initial = ["0", "2", "3", "10", "2147483648", "4294967294", "z", "4294967295", "01", "a", "hidden"];
list(o.ownPropertyKeys(), initial, "numeric before chronological including nonenumerable");
result(o.defineOwnProperty("z", { value: { kind: "number", value: 7 }, enumerable: false }, keyContext, loc), true, "overwrite");
add(o, "10");
list(o.ownPropertyKeys(), initial, "overwrites preserve positions");
const snapshot = o.ownPropertyKeys();
snapshot[0] = "corrupt";
snapshot.push("invented");
list(o.ownPropertyKeys(), initial, "caller mutation detached");
const beforeDelete = o.ownPropertyKeys();
result(o.internalDelete("z"), true, "delete string");
result(o.internalDelete("2"), true, "delete index");
check(o.getOwnProperty("z") === undefined && o.getOwnProperty("2") === undefined, "descriptors removed");
list(beforeDelete, initial, "old snapshot independent of deletion");
add(o, "z");
add(o, "2");
list(o.ownPropertyKeys(), ["0", "2", "3", "10", "2147483648", "4294967294", "4294967295", "01", "a", "hidden", "z"], "string reinsert moves; index reinsert sorts");
result(o.internalDelete("hidden"), true, "nonwritable nonenumerable configurable deletion");
const locked = o.getOwnProperty("3");
const beforeFailure = o.ownPropertyKeys();
result(o.internalDelete("3"), false, "nonconfigurable rejection");
const after = o.getOwnProperty("3");
check(locked !== undefined && after !== undefined && sameValue(locked.value, after.value) && locked.writable === after.writable && locked.enumerable === after.enumerable && locked.configurable === after.configurable, "rejection preserves descriptor");
list(o.ownPropertyKeys(), beforeFailure, "rejection preserves order");
result(o.internalDelete("missing"), true, "absent deletion");
result(o.internalDelete("hidden"), true, "repeated deletion");
list(o.ownPropertyKeys(), beforeFailure, "absent deletion preserves order");

const parent = new GuestObject();
parent.bootstrapDefine("locked", { value: UNDEFINED, writable: true, enumerable: true, configurable: false });
parent.bootstrapDefine("shared", { value: { kind: "number", value: 4 }, writable: true, enumerable: true, configurable: true });
add(parent, "1");
const child = new GuestObject();
result(child.setPrototypeOf(parent), true, "prototype");
result(child.internalDelete("locked"), true, "inherited nonconfigurable is absent own");
result(child.internalDelete("shared"), true, "inherited configurable untouched");
list(child.ownPropertyKeys(), [], "no inherited keys");
list(parent.ownPropertyKeys(), ["1", "locked", "shared"], "parent unchanged");
child.bootstrapDefine("shared", { value: { kind: "number", value: 9 }, writable: true, enumerable: true, configurable: true });
result(child.internalDelete("shared"), true, "delete shadow");
check(sameValue(child.get("shared"), { kind: "number", value: 4 }), "deletion exposes inherited value");
check(parent.getOwnProperty("shared") !== undefined && child.getPrototypeOf() === parent, "prototype unchanged");
add(child, "removable");
result(child.preventExtensions(), true, "prevent extensions");
result(child.internalDelete("removable"), true, "nonextensible deletion");
result(child.defineOwnProperty("removable", {}, keyContext, loc), false, "nonextensible reinsertion rejected");
result(child.internalDelete("missing"), true, "nonextensible absent");
check(!child.isExtensible(), "deletion does not enable extensions");
list(child.ownPropertyKeys(), [], "rejected reinsertion adds no key");

function namespace(realm: Realm): GuestObject {
    const binding = realm.global.bindings.get("Number");
    if (binding === undefined || binding.value.kind !== "object") throw new Error("Number namespace missing");
    return binding.value.object;
}
const first = namespace(new Realm((_line) => {}));
const second = namespace(new Realm((_line) => {}));
const secondKeys = second.ownPropertyKeys();
check(first !== second, "realm objects distinct");
result(first.internalDelete("isNaN"), true, "realm local delete");
add(first, "0");
check(first.getOwnProperty("isNaN") === undefined && second.getOwnProperty("isNaN") !== undefined, "realm deletion isolation");
check(second.getOwnProperty("0") === undefined, "realm insertion isolation");
list(second.ownPropertyKeys(), secondKeys, "realm order isolation");
result(first.internalDelete("NaN"), false, "realm constant protected");
// W6/W10/W19: canonical String indices and ordinary property ordering.
const text = keyContext.realm.createStringObject("ab");
check(stringIndex("0", 2) === 0 && stringIndex("1", 2) === 1, "W6 valid indices");
for (const key of ["2", "01", "+0", "1.0", "-0", "-1", "0.5", "NaN", "Infinity", "", " 0", "1e0"]) {
    check(stringIndex(key, 2) === undefined && text.getOwnProperty(key) === undefined, "W6 ordinary key " + key);
    add(text, key);
    check(text.getOwnProperty(key) !== undefined, "W6 ordinary definition " + key);
}
const negativeZeroKey = toPropertyKey({ kind: "number", value: -0 }, keyContext, loc);
check(negativeZeroKey.type === "normal" && negativeZeroKey.value === "0", "W6 numeric -0 key");
if (negativeZeroKey.type !== "normal") throw new Error("W6 unexpected key failure");
check(sameValue(text.get(negativeZeroKey.value), { kind: "string", value: "a" }) && text.get("-0").kind === "undefined", "W6 distinct string -0");
const orderedText = keyContext.realm.createStringObject("ab");
for (const key of ["z", "10", "2", "01", "-0", "4294967295"]) add(orderedText, key);
list(orderedText.ownPropertyKeys(), ["0", "1", "2", "10", "length", "z", "01", "-0", "4294967295"], "W10 initial order");
result(orderedText.internalDelete("z"), true, "W10 delete z");
add(orderedText, "z");
list(orderedText.ownPropertyKeys(), ["0", "1", "2", "10", "length", "01", "-0", "4294967295", "z"], "W10 reinsert order");
check(stringIndex("4294967295", 4294967296) === 4294967295 && arrayIndex("4294967295") === undefined, "W19 String has no array-index ceiling");
console.log("object keys passed");
