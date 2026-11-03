import type { DataDescriptor as InspectionDataDescriptor, PropertyDescriptor as InspectionDescriptor } from "../src/runtime.js";
function dataDescriptor(d: InspectionDescriptor | undefined): InspectionDataDescriptor | undefined {
    if (d !== undefined && d.kind !== "data") throw new Error("expected data descriptor");
    return d;
}
import { GuestSymbol, symbolDescriptiveString } from "../src/symbols.js";
import { equal, type Value } from "../src/runtime.js";
import { GuestArray } from "../src/array-object.js";
import { formatPropertyKey } from "../src/symbols.js";
import type { PropertyKey } from "../src/runtime.js";
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
function list(actual: PropertyKey[], expected: PropertyKey[], label: string): void {
    check(actual.length === expected.length, label + " length");
    for (let i = 0; i < expected.length; i++) check(actual[i] === expected[i], label + " position " + i);
}
function add(o: GuestObject, key: PropertyKey): void { o.bootstrapDefine(key, { value: UNDEFINED, writable: true, enumerable: true, configurable: true }); }

const valid = ["0", "1", "9", "10", "100", "2147483647", "2147483648", "4294967293", "4294967294"];
const values = [0, 1, 9, 10, 100, 2147483647, 2147483648, 4294967293, 4294967294];
for (let i = 0; i < valid.length; i++) check(arrayIndex(valid[i]) === values[i], "index " + valid[i]);
const invalid = ["", "00", "01", "0000000000", "-0", "-1", "+0", "+1", " 1", "1 ", "\t1", "1\n", "1.0", "0.0", ".1", "1.5", "1e0", "1E1", "0x10", "0b10", "0o10", "1_0", "NaN", "Infinity", "4294967295", "4294967296", "9999999999", "10000000000", "9007199254740991", "１２", "١", "1\0", "\ud800"];
for (const key of invalid) check(arrayIndex(key) === undefined, "ordinary string " + formatPropertyKey(key));
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
check(locked !== undefined && locked.kind === "data" && after !== undefined && after.kind === "data" && sameValue(locked.value, after.value) && locked.writable === after.writable && locked.enumerable === after.enumerable && locked.configurable === after.configurable, "rejection preserves descriptor");
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
check(sameValue(child.get("shared", keyContext, loc), { kind: "number", value: 4 }), "deletion exposes inherited value");
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
    check(stringIndex(key, 2) === undefined && text.getOwnProperty(key) === undefined, "W6 ordinary key " + formatPropertyKey(key));
    add(text, key);
    check(text.getOwnProperty(key) !== undefined, "W6 ordinary definition " + formatPropertyKey(key));
}
const negativeZeroKey = toPropertyKey({ kind: "number", value: -0 }, keyContext, loc);
check(negativeZeroKey.type === "normal" && negativeZeroKey.value === "0", "W6 numeric -0 key");
if (negativeZeroKey.type !== "normal") throw new Error("W6 unexpected key failure");
check(sameValue(text.get(negativeZeroKey.value, keyContext, loc), { kind: "string", value: "a" }) && text.get("-0", keyContext, loc).kind === "undefined", "W6 distinct string -0");
const orderedText = keyContext.realm.createStringObject("ab");
for (const key of ["z", "10", "2", "01", "-0", "4294967295"]) add(orderedText, key);
list(orderedText.ownPropertyKeys(), ["0", "1", "2", "10", "length", "z", "01", "-0", "4294967295"], "W10 initial order");
result(orderedText.internalDelete("z"), true, "W10 delete z");
add(orderedText, "z");
list(orderedText.ownPropertyKeys(), ["0", "1", "2", "10", "length", "01", "-0", "4294967295", "z"], "W10 reinsert order");
check(stringIndex("4294967295", 4294967296) === 4294967295 && arrayIndex("4294967295") === undefined, "W19 String has no array-index ceiling");

// A1-A5/A7: carrier records, textual collisions, and detached mixed-key storage.
const s = new GuestSymbol("x");
const t = new GuestSymbol("x");
const v: Value = { kind: "symbol", value: s };
const v2: Value = { kind: "symbol", value: s };
const distinct: Value = { kind: "symbol", value: t };
check(equal(v, v2) && sameValue(v, v2), "A1 carrier-independent identity");
check(!equal(v, distinct) && !sameValue(v, distinct), "A1 same description is distinct");
check(!equal(v, { kind: "string", value: "Symbol(x)" }), "A1 descriptive string differs");
for (const description of [undefined, "", "x", "a\0\ud800"]) {
    const left = new GuestSymbol(description);
    const right = new GuestSymbol(description);
    check(left !== right && left.description === description, "A2 fresh immutable description");
    check(symbolDescriptiveString(left) === "Symbol(" + (description === undefined ? "" : description) + ")", "A20 UTF-16 diagnostic");
}
const collisions = new GuestObject();
for (const key of ["Symbol(x)", "@@x", s, t]) add(collisions, key);
result(collisions.defineOwnProperty(s, { value: v }, keyContext, loc), true, "A3 update exact identity");
check(collisions.get(s, keyContext, loc) === v && collisions.get(t, keyContext, loc) === UNDEFINED, "A3 distinct values");
list(collisions.ownPropertyKeys(), ["Symbol(x)", "@@x", s, t], "A3 four distinct properties");
const mixed = new GuestObject();
for (const key of [s, "z", "10", t, "2", "01", "4294967295"]) add(mixed, key);
result(mixed.defineOwnProperty(s, { value: v }, keyContext, loc), true, "A4 update");
list(mixed.ownPropertyKeys(), ["2", "10", "z", "01", "4294967295", s, t], "A4 category ordering");
result(mixed.defineOwnProperty(t, { configurable: false }, keyContext, loc), true, "A5 freeze t");
result(mixed.internalDelete(s), true, "A5 delete s");
add(mixed, s);
result(mixed.internalDelete("z"), true, "A5 delete z");
add(mixed, "z");
result(mixed.internalDelete(t), false, "A5 failed delete t");
list(mixed.ownPropertyKeys(), ["2", "10", "01", "4294967295", "z", t, s], "A5 reinsertion");
const detachedKeys = mixed.ownPropertyKeys();
detachedKeys[0] = t;
const detachedMap = mixed.properties;
list(Array.from(detachedMap.keys()), ["10", t, "2", "01", "4294967295", s, "z"], "A7 storage insertion order");
const detachedDescriptor = detachedMap.get(s);
if (detachedDescriptor === undefined) throw new Error("A7 descriptor");
if (detachedDescriptor.kind !== "data") throw new Error("expected data descriptor");
detachedDescriptor.value = distinct;
detachedMap.delete(t);
const ownDescriptor = mixed.getOwnProperty(s);
if (ownDescriptor === undefined || ownDescriptor.kind !== "data") throw new Error("A7 own descriptor");
ownDescriptor.writable = false;
check(mixed.get(s, keyContext, loc) === UNDEFINED && dataDescriptor(mixed.getOwnProperty(s))?.writable === true && mixed.getOwnProperty(t) !== undefined, "A7 snapshots detached");
list(mixed.ownPropertyKeys(), ["2", "10", "01", "4294967295", "z", t, s], "A7 key array detached");
check(collisions.get(s, keyContext, loc) === v, "A7 same key independent objects");

// A10-A12: index classification never observes the description.
const numericSymbol = new GuestSymbol("0");
const lengthSymbol = new GuestSymbol("length");
for (const key of [numericSymbol, s, new GuestSymbol("-0"), new GuestSymbol("4294967295")]) {
    check(arrayIndex(key) === undefined && stringIndex(key, 2) === undefined, "A12 symbols are not indices");
}
const symbolArray = new GuestArray();
add(symbolArray, "3");
symbolArray.bootstrapDefine(numericSymbol, { value: v, configurable: false });
add(symbolArray, lengthSymbol);
check(sameValue(symbolArray.get("length", keyContext, loc), { kind: "number", value: 4 }), "A10 symbols do not extend");
result(symbolArray.defineOwnProperty("length", { value: { kind: "number", value: 0 } }, keyContext, loc), true, "A10 shrink");
list(symbolArray.ownPropertyKeys(), ["length", numericSymbol, lengthSymbol], "A10 symbols survive shrink");
const symbolText = keyContext.realm.createStringObject("ab");
for (const key of [numericSymbol, s, "2", "z"]) add(symbolText, key);
list(symbolText.ownPropertyKeys(), ["0", "1", "2", "length", "z", numericSymbol, s], "A11 String mixed order");
list(Array.from(symbolText.properties.keys()), symbolText.ownPropertyKeys(), "A11 String snapshot own-key order");
check(sameValue(symbolText.get("0", keyContext, loc), { kind: "string", value: "a" }), "A11 virtual index preserved");
result(symbolText.internalDelete(numericSymbol), true, "A12 ordinary symbol delete");
result(symbolText.internalDelete("0"), false, "A12 virtual delete still rejected");
symbolText.preventExtensions();
result(symbolText.defineOwnProperty(numericSymbol, { value: v }, keyContext, loc), false, "A12 nonextensible symbol");
result(symbolText.defineOwnProperty("0", { value: { kind: "string", value: "a" } }, keyContext, loc), true, "A12 compatible virtual definition");

console.log("object keys passed");
