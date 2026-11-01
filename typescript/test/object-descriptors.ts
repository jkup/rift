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
    check(d !== undefined && sameValue(d.value, value) && d.writable === w && d.enumerable === e && d.configurable === c, "state: " + key);
}
const loc = { line: 1, column: 1 };
const o = new GuestObject();
check(o.isExtensible(), "initial extensibility");
result(o.defineOwnProperty("empty", {}, loc), true, "empty creation");
state(o, "empty", UNDEFINED, false, false, false);
result(o.defineOwnProperty("empty", {}, loc), true, "empty existing");
result(o.defineOwnProperty("empty", { value: UNDEFINED, writable: false, enumerable: false, configurable: false }, loc), true, "explicit defaults");
result(o.defineOwnProperty("empty", { writable: true }, loc), false, "cannot thaw");
result(o.defineOwnProperty("empty", { configurable: true }, loc), false, "cannot configure");
result(o.defineOwnProperty("empty", { enumerable: true }, loc), false, "cannot enumerate");
result(o.defineOwnProperty("flex", { value: num(1), writable: true, enumerable: true, configurable: true }, loc), true, "full creation");
result(o.defineOwnProperty("flex", {}, loc), true, "omitted flags preserve true");
state(o, "flex", num(1), true, true, true);
result(o.defineOwnProperty("flex", { value: UNDEFINED }, loc), true, "present guest undefined");
state(o, "flex", UNDEFINED, true, true, true);
result(o.defineOwnProperty("flex", { writable: false, enumerable: false }, loc), true, "explicit false");
state(o, "flex", UNDEFINED, false, false, true);
result(o.defineOwnProperty("flex", { value: num(2), writable: true, enumerable: true }, loc), true, "configurable can thaw and change value");
result(o.defineOwnProperty("flex", { configurable: false }, loc), true, "lock configurable");
result(o.defineOwnProperty("flex", { value: num(3) }, loc), true, "nonconfigurable still writable");
result(o.defineOwnProperty("flex", { value: num(4), writable: false, enumerable: false }, loc), false, "atomic reject enumerable");
state(o, "flex", num(3), true, true, false);
result(o.defineOwnProperty("flex", { value: num(4), writable: false, configurable: true }, loc), false, "atomic reject configurable");
state(o, "flex", num(3), true, true, false);
result(o.defineOwnProperty("flex", { value: num(4), writable: false }, loc), true, "change value and freeze together");
result(o.defineOwnProperty("flex", { value: num(5), writable: true }, loc), false, "atomic frozen reject");
state(o, "flex", num(4), false, true, false);

// Frozen values use SameValue, not === or wrapper record identity.
const identity = new GuestObject();
const values: Value[] = [num(NaN), num(0), num(-0), num(1), UNDEFINED, { kind: "null" }, { kind: "boolean", value: true }, { kind: "string", value: "x" }, { kind: "object", object: identity }];
const same: Value[] = [num(NaN), num(0), num(-0), num(1), { kind: "undefined" }, { kind: "null" }, { kind: "boolean", value: true }, { kind: "string", value: "x" }, { kind: "object", object: identity }];
const different: Value[] = [num(0), num(-0), num(0), num(2), { kind: "null" }, UNDEFINED, { kind: "boolean", value: false }, { kind: "string", value: "y" }, { kind: "object", object: new GuestObject() }];
for (let i = 0; i < values.length; i++) {
    const frozen = new GuestObject();
    result(frozen.defineOwnProperty("x", { value: values[i] }, loc), true, "frozen create");
    result(frozen.defineOwnProperty("x", { value: same[i] }, loc), true, "frozen same");
    result(frozen.defineOwnProperty("x", { value: different[i] }, loc), false, "frozen different");
    state(frozen, "x", values[i], false, false, false);
    check(frozen.set("x", same[i], loc).type === "throw", "assignment differs from definition");
}

const input: DataDescriptorUpdate = { value: num(8), writable: false, enumerable: false, configurable: false };
result(o.defineOwnProperty("copied", input, loc), true, "input copied");
input.value = num(9); input.writable = true; input.enumerable = true; input.configurable = true;
const exposed = o.getOwnProperty("copied");
if (exposed === undefined) throw new Error("missing descriptor");
exposed.value = num(10); exposed.writable = true; exposed.enumerable = true; exposed.configurable = true;
const snapshot = o.properties;
snapshot.set("copied", { value: num(11), writable: true, enumerable: true, configurable: true });
snapshot.clear();
state(o, "copied", num(8), false, false, false);
check(o.set("copied", num(12), loc).type === "throw", "mutation cannot bypass flags");
check(o.set("assigned", num(1), loc).type === "normal", "assignment creates");
state(o, "assigned", num(1), true, true, true);
result(o.preventExtensions(), true, "prevent extensions");
result(o.preventExtensions(), true, "repeated prevent extensions");
check(!o.isExtensible(), "not extensible");
result(o.defineOwnProperty("new", {}, loc), false, "nonextensible empty new");
result(o.defineOwnProperty("new", { value: num(2), writable: true }, loc), false, "nonextensible full new");
check(o.getOwnProperty("new") === undefined, "no rejected insertion");
result(o.defineOwnProperty("empty", {}, loc), true, "nonextensible existing empty");
result(o.defineOwnProperty("assigned", { value: num(2) }, loc), true, "nonextensible existing definition");
check(putValue({ kind: "property", base: { kind: "object", object: o }, key: { kind: "string", value: "new" }, loc }, num(3), keyContext, loc).type === "throw", "putValue nonextensible rejection");
const write = putValue({ kind: "property", base: { kind: "object", object: o }, key: { kind: "string", value: "assigned" }, loc }, num(4), keyContext, loc);
check(write.type === "normal" && sameValue(write.value, num(4)), "putValue existing writable RHS");
state(o, "assigned", num(4), true, true, true);
state(o, "copied", num(8), false, false, false);
check(o.getOwnProperty("new") === undefined && !o.isExtensible(), "rejection preserves object");
let bootstrapRejected = false;
try { o.define("new", num(1), true, true, true); }
catch { bootstrapRejected = true; }
check(bootstrapRejected && o.getOwnProperty("new") === undefined, "bootstrap cannot bypass invariants");
console.log("object descriptors passed");
