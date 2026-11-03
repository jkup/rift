import { GuestSymbol } from "../src/symbols.js";
import { stringKeys } from "./key-assertions.js";
import { Realm } from "../src/realm.js";
import { Evaluator } from "../src/evaluator.js";
import { GuestObject, UNDEFINED, putValue, sameValue } from "../src/runtime.js";
import type { InternalBooleanCompletion, DataDescriptorUpdate, Value } from "../src/runtime.js";

const keyEvaluator = new Evaluator(new Realm((_line) => {}));
const keyContext = keyEvaluator.context;
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function result(actual: InternalBooleanCompletion, expected: boolean, label: string): void {
    check(actual.type === "normal" && actual.value === expected, label);
}
function num(value: number): Value { return { kind: "number", value }; }
function state(o: GuestObject, key: string, value: Value, w: boolean, e: boolean, c: boolean): void {
    const d = o.getOwnProperty(key);
    check(d !== undefined && d.kind === "data" && sameValue(d.value, value) && d.writable === w && d.enumerable === e && d.configurable === c, "state: " + key);
}
const loc = { line: 1, column: 1 };
const o = new GuestObject();
check(o.isExtensible(), "initial extensibility");
result(o.defineOwnProperty("empty", {}, keyContext, loc), true, "empty creation");
state(o, "empty", UNDEFINED, false, false, false);
result(o.defineOwnProperty("empty", {}, keyContext, loc), true, "empty existing");
result(o.defineOwnProperty("empty", { value: UNDEFINED, writable: false, enumerable: false, configurable: false }, keyContext, loc), true, "explicit defaults");
result(o.defineOwnProperty("empty", { writable: true }, keyContext, loc), false, "cannot thaw");
result(o.defineOwnProperty("empty", { configurable: true }, keyContext, loc), false, "cannot configure");
result(o.defineOwnProperty("empty", { enumerable: true }, keyContext, loc), false, "cannot enumerate");
result(o.defineOwnProperty("flex", { value: num(1), writable: true, enumerable: true, configurable: true }, keyContext, loc), true, "full creation");
result(o.defineOwnProperty("flex", {}, keyContext, loc), true, "omitted flags preserve true");
state(o, "flex", num(1), true, true, true);
result(o.defineOwnProperty("flex", { value: UNDEFINED }, keyContext, loc), true, "present guest undefined");
state(o, "flex", UNDEFINED, true, true, true);
result(o.defineOwnProperty("flex", { writable: false, enumerable: false }, keyContext, loc), true, "explicit false");
state(o, "flex", UNDEFINED, false, false, true);
result(o.defineOwnProperty("flex", { value: num(2), writable: true, enumerable: true }, keyContext, loc), true, "configurable can thaw and change value");
result(o.defineOwnProperty("flex", { configurable: false }, keyContext, loc), true, "lock configurable");
result(o.defineOwnProperty("flex", { value: num(3) }, keyContext, loc), true, "nonconfigurable still writable");
result(o.defineOwnProperty("flex", { value: num(4), writable: false, enumerable: false }, keyContext, loc), false, "atomic reject enumerable");
state(o, "flex", num(3), true, true, false);
result(o.defineOwnProperty("flex", { value: num(4), writable: false, configurable: true }, keyContext, loc), false, "atomic reject configurable");
state(o, "flex", num(3), true, true, false);
result(o.defineOwnProperty("flex", { value: num(4), writable: false }, keyContext, loc), true, "change value and freeze together");
result(o.defineOwnProperty("flex", { value: num(5), writable: true }, keyContext, loc), false, "atomic frozen reject");
state(o, "flex", num(4), false, true, false);

// Frozen values use SameValue, not === or wrapper record identity.
const identity = new GuestObject();
const values: Value[] = [num(NaN), num(0), num(-0), num(1), UNDEFINED, { kind: "null" }, { kind: "boolean", value: true }, { kind: "string", value: "x" }, { kind: "object", object: identity }];
const same: Value[] = [num(NaN), num(0), num(-0), num(1), { kind: "undefined" }, { kind: "null" }, { kind: "boolean", value: true }, { kind: "string", value: "x" }, { kind: "object", object: identity }];
const different: Value[] = [num(0), num(-0), num(0), num(2), { kind: "null" }, UNDEFINED, { kind: "boolean", value: false }, { kind: "string", value: "y" }, { kind: "object", object: new GuestObject() }];
for (let i = 0; i < values.length; i++) {
    const frozen = new GuestObject();
    result(frozen.defineOwnProperty("x", { value: values[i] }, keyContext, loc), true, "frozen create");
    result(frozen.defineOwnProperty("x", { value: same[i] }, keyContext, loc), true, "frozen same");
    result(frozen.defineOwnProperty("x", { value: different[i] }, keyContext, loc), false, "frozen different");
    state(frozen, "x", values[i], false, false, false);
    check(frozen.set("x", same[i], keyContext, loc).type === "throw", "assignment differs from definition");
}

const input: DataDescriptorUpdate = { value: num(8), writable: false, enumerable: false, configurable: false };
result(o.defineOwnProperty("copied", input, keyContext, loc), true, "input copied");
input.value = num(9); input.writable = true; input.enumerable = true; input.configurable = true;
const exposed = o.getOwnProperty("copied");
if (exposed === undefined || exposed.kind !== "data") throw new Error("missing descriptor");
exposed.value = num(10); exposed.writable = true; exposed.enumerable = true; exposed.configurable = true;
const snapshot = o.properties;
snapshot.set("copied", { kind: "data", value: num(11), writable: true, enumerable: true, configurable: true });
snapshot.clear();
state(o, "copied", num(8), false, false, false);
check(o.set("copied", num(12), keyContext, loc).type === "throw", "mutation cannot bypass flags");
check(o.set("assigned", num(1), keyContext, loc).type === "normal", "assignment creates");
state(o, "assigned", num(1), true, true, true);
result(o.preventExtensions(), true, "prevent extensions");
result(o.preventExtensions(), true, "repeated prevent extensions");
check(!o.isExtensible(), "not extensible");
result(o.defineOwnProperty("new", {}, keyContext, loc), false, "nonextensible empty new");
result(o.defineOwnProperty("new", { value: num(2), writable: true }, keyContext, loc), false, "nonextensible full new");
check(o.getOwnProperty("new") === undefined, "no rejected insertion");
result(o.defineOwnProperty("empty", {}, keyContext, loc), true, "nonextensible existing empty");
result(o.defineOwnProperty("assigned", { value: num(2) }, keyContext, loc), true, "nonextensible existing definition");
check(putValue({ kind: "property", base: { kind: "object", object: o }, key: { kind: "string", value: "new" }, loc }, num(3), keyContext, loc).type === "throw", "putValue nonextensible rejection");
const write = putValue({ kind: "property", base: { kind: "object", object: o }, key: { kind: "string", value: "assigned" }, loc }, num(4), keyContext, loc);
check(write.type === "normal" && sameValue(write.value, num(4)), "putValue existing writable RHS");
state(o, "assigned", num(4), true, true, true);
state(o, "copied", num(8), false, false, false);
check(o.getOwnProperty("new") === undefined && !o.isExtensible(), "rejection preserves object");
let bootstrapRejected = false;
try { o.bootstrapDefine("new", { value: num(1), writable: true, enumerable: true, configurable: true }); }
catch { bootstrapRejected = true; }
check(bootstrapRejected && o.getOwnProperty("new") === undefined, "bootstrap cannot bypass invariants");
// P2: bootstrap shares SameValue and frozen descriptor validation.
const bootstrapFrozen = new GuestObject();
bootstrapFrozen.bootstrapDefine("x", { value: num(-0) });
bootstrapFrozen.bootstrapDefine("x", { value: num(-0) });
let frozenFault = false;
try { bootstrapFrozen.bootstrapDefine("x", { value: num(0) }); }
catch (error) { frozenFault = error instanceof Error; }
check(frozenFault, "bootstrap frozen signed zero rejects");
state(bootstrapFrozen, "x", num(-0), false, false, false);
// W5-W9/W11/W14: String units are virtual readonly data properties.
const units = keyContext.realm.createStringObject("A\ud83d\ude00\ud800\0");
state(units, "length", num(5), false, false, false);
const expectedUnits = ["A", "\ud83d", "\ude00", "\ud800", "\0"];
for (let i = 0; i < expectedUnits.length; i++) {
    state(units, String(i), { kind: "string", value: expectedUnits[i] }, false, true, false);
}
check(stringKeys(units.ownPropertyKeys()).join(",") === "0,1,2,3,4,length", "W5 UTF-16 keys");
const text = keyContext.realm.createStringObject("ab");
const aUnit: Value = { kind: "string", value: "a" };
const compatible: DataDescriptorUpdate[] = [
    {}, { value: aUnit }, { writable: false }, { enumerable: true }, { configurable: false },
    { value: aUnit, writable: false, enumerable: true, configurable: false },
];
for (const update of compatible) {
    result(text.defineOwnProperty("0", update, keyContext, loc), true, "W7 compatible index");
    state(text, "0", aUnit, false, true, false);
}
const incompatible: DataDescriptorUpdate[] = [
    { value: { kind: "string", value: "z" } }, { writable: true }, { enumerable: false }, { configurable: true },
    { value: aUnit, writable: false, enumerable: false },
];
for (const update of incompatible) {
    result(text.defineOwnProperty("0", update, keyContext, loc), false, "W8 incompatible index");
    state(text, "0", aUnit, false, true, false);
}
result(text.internalSet("0", aUnit, { kind: "object", object: text }, keyContext, loc), false, "W8 same-value Set");
const strictUnit = text.set("0", aUnit, keyContext, loc);
check(strictUnit.type === "throw" && strictUnit.diagnostic.name === "TypeError"
    && strictUnit.diagnostic.message === "property is not writable: 0" && strictUnit.diagnostic.loc === loc, "W8 strict Set");
result(text.internalDelete("0"), false, "W8 index delete");
result(text.internalDelete("length"), false, "W8 length delete");
result(text.defineOwnProperty("length", { value: num(2) }, keyContext, loc), true, "W9 same length");
for (const update of [{ value: num(3) }, { writable: true }, { enumerable: true }, { configurable: true }]) {
    result(text.defineOwnProperty("length", update, keyContext, loc), false, "W9 immutable length");
    state(text, "length", num(2), false, false, false);
}
result(text.defineOwnProperty("2", { value: { kind: "string", value: "x" }, writable: true, enumerable: true, configurable: true }, keyContext, loc), true, "W9 ordinary out-of-range index");
state(text, "2", { kind: "string", value: "x" }, true, true, true);
state(text, "length", num(2), false, false, false);
const frozenText = keyContext.realm.createStringObject("ab");
frozenText.preventExtensions();
for (const update of compatible) result(frozenText.defineOwnProperty("0", update, keyContext, loc), true, "W11 frozen compatible index");
result(frozenText.defineOwnProperty("length", { value: num(2) }, keyContext, loc), true, "W11 frozen length");
result(frozenText.defineOwnProperty("2", {}, keyContext, loc), false, "W11 new key");
result(frozenText.setPrototypeOf(null), false, "W11 new prototype");
result(frozenText.setPrototypeOf(keyContext.realm.stringPrototype), true, "W11 same prototype");
check(stringKeys(frozenText.ownPropertyKeys()).join(",") === "0,1,length", "W11 unchanged keys");
state(frozenText, "0", aUnit, false, true, false);
const detachedUnit = text.getOwnProperty("0");
const detachedLength = text.getOwnProperty("length");
if (detachedUnit === undefined || detachedUnit.kind !== "data" || detachedLength === undefined) throw new Error("W14 missing descriptors");
detachedUnit.value = num(99);
detachedUnit.writable = true;
if (detachedLength.kind !== "data") throw new Error("expected data descriptor");
detachedLength.value = num(99);
const stringSnapshot = text.properties;
check(stringKeys(Array.from(stringSnapshot.keys())).join(",") === "0,1,2,length", "W14 snapshot order");
const snapshotUnit = stringSnapshot.get("1");
if (snapshotUnit === undefined) throw new Error("W14 missing snapshot unit");
if (snapshotUnit.kind !== "data") throw new Error("expected data descriptor");
snapshotUnit.value = num(99);
stringSnapshot.clear();
const detachedKeys = text.ownPropertyKeys();
detachedKeys.push("fake");
state(text, "0", aUnit, false, true, false);
state(text, "1", { kind: "string", value: "b" }, false, true, false);
state(text, "length", num(2), false, false, false);
check(stringKeys(text.ownPropertyKeys()).join(",") === "0,1,2,length", "W14 detached keys/map");
text.bootstrapDefine("stringData", { value: num(99) });
text.setPrototypeOf(null);
check(text.stringData === "ab", "W14 scalar payload survives property/prototype changes");

const symbolKey = new GuestSymbol("locked");
const symbolValue: Value = { kind: "symbol", value: symbolKey };
const sameSymbol: Value = { kind: "symbol", value: symbolKey };
const otherSymbol: Value = { kind: "symbol", value: new GuestSymbol("locked") };
const symbolObject = new GuestObject();
symbolObject.bootstrapDefine(symbolKey, { value: symbolValue });
result(symbolObject.defineOwnProperty(symbolKey, { value: sameSymbol }, keyContext, loc), true, "A6 SameValue accepts same payload");
result(symbolObject.defineOwnProperty(symbolKey, { value: otherSymbol }, keyContext, loc), false, "A6 distinct payload rejected");
result(symbolObject.internalSet(symbolKey, sameSymbol, { kind: "object", object: symbolObject }, keyContext, loc), false, "A6 readonly Set rejects identical payload");
check(symbolObject.get(symbolKey, keyContext, loc) === symbolValue, "A6 rejection atomic");

console.log("object descriptors passed");
