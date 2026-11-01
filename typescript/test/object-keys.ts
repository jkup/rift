const loc = { line: 1, column: 1 };
import { arrayIndex } from "../src/property-keys.js";
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
function add(o: GuestObject, key: string): void { o.define(key, UNDEFINED, true, true, true); }

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
o.define("hidden", UNDEFINED, false, false, true);
o.define("3", UNDEFINED, false, false, false);
const initial = ["0", "2", "3", "10", "2147483648", "4294967294", "z", "4294967295", "01", "a", "hidden"];
list(o.ownPropertyKeys(), initial, "numeric before chronological including nonenumerable");
result(o.defineOwnProperty("z", { value: { kind: "number", value: 7 }, enumerable: false }, loc), true, "overwrite");
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
parent.define("locked", UNDEFINED, true, true, false);
parent.define("shared", { kind: "number", value: 4 }, true, true, true);
add(parent, "1");
const child = new GuestObject();
result(child.setPrototypeOf(parent), true, "prototype");
result(child.internalDelete("locked"), true, "inherited nonconfigurable is absent own");
result(child.internalDelete("shared"), true, "inherited configurable untouched");
list(child.ownPropertyKeys(), [], "no inherited keys");
list(parent.ownPropertyKeys(), ["1", "locked", "shared"], "parent unchanged");
child.define("shared", { kind: "number", value: 9 }, true, true, true);
result(child.internalDelete("shared"), true, "delete shadow");
check(sameValue(child.get("shared"), { kind: "number", value: 4 }), "deletion exposes inherited value");
check(parent.getOwnProperty("shared") !== undefined && child.getPrototypeOf() === parent, "prototype unchanged");
add(child, "removable");
result(child.preventExtensions(), true, "prevent extensions");
result(child.internalDelete("removable"), true, "nonextensible deletion");
result(child.defineOwnProperty("removable", {}, loc), false, "nonextensible reinsertion rejected");
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
console.log("object keys passed");
