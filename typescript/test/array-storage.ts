import { GuestArray } from "../src/array-object.js";
import { GuestObject, UNDEFINED } from "../src/runtime.js";
import type { Completion, DataDescriptorUpdate, InternalBooleanCompletion, Value } from "../src/runtime.js";
import { Realm } from "../src/realm.js";
import { run } from "../src/interpreter.js";

const loc = { line: 17, column: 9 };
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function num(value: number): Value { return { kind: "number", value }; }
function str(value: string): Value { return { kind: "string", value }; }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function bool(r: InternalBooleanCompletion, expected: boolean): void {
    check(r.type === "normal" && r.value === expected, "boolean completion");
}
function error(r: InternalBooleanCompletion | Completion, name: string): void {
    check(r.type === "throw", "expected throw");
    if (r.type !== "throw") throw new Error("missing diagnostic");
    check(r.diagnostic.name === name && r.diagnostic.phase === "runtime", "runtime error name");
    check(r.diagnostic.loc === loc, "exact error location");
}
function length(a: GuestArray, expected: number, writable = true): void {
    const d = a.getOwnProperty("length");
    check(d !== undefined && d.value.kind === "number" && Object.is(d.value.value, expected), "length value");
    check(d !== undefined && d.writable === writable && !d.enumerable && !d.configurable, "length flags");
}
function element(a: GuestArray, key: string, configurable = true): void {
    bool(a.defineOwnProperty(key, { value: UNDEFINED, writable: true, enumerable: true, configurable }, loc), true);
}
function three(): GuestArray {
    const a = new GuestArray();
    element(a, "0"); element(a, "1"); element(a, "2");
    return a;
}
function partial(): GuestArray {
    const a = new GuestArray();
    element(a, "5"); element(a, "1"); element(a, "3", false);
    return a;
}
// Every caller descriptor is checked after every outcome, including delayed
// freezing and conversion rejection; the contained original Value stays intact.
function defineLength(a: GuestArray, d: DataDescriptorUpdate): InternalBooleanCompletion {
    const value = d.value;
    const writable = d.writable;
    const enumerable = d.enumerable;
    const configurable = d.configurable;
    const r = a.defineOwnProperty("length", d, loc);
    check(d.value === value && d.writable === writable && d.enumerable === enumerable && d.configurable === configurable, "caller descriptor immutable");
    return r;
}

const empty = new GuestArray();
length(empty, 0);
check(empty.getPrototypeOf() === null && empty.ownPropertyKeys().join(",") === "length", "empty own length/null prototype");
bool(empty.internalDelete("length"), false);
element(empty, "2"); length(empty, 3);
check(empty.getOwnProperty("0") === undefined && empty.getOwnProperty("1") === undefined, "holes absent");
check(empty.getOwnProperty("2")?.value === UNDEFINED, "present undefined");
element(empty, "note"); element(empty, "1");
check(empty.ownPropertyKeys().join(",") === "1,2,length,note", "own numeric order before real length");
const snapshot = empty.getOwnProperty("length");
if (snapshot === undefined) throw new Error("snapshot missing");
snapshot.value = num(99); snapshot.writable = false;
const keys = empty.ownPropertyKeys(); keys.push("fake");
length(empty, 3);
check(empty.ownPropertyKeys().join(",") === "1,2,length,note", "detached snapshots");
bool(empty.internalDelete("2"), true); length(empty, 3);

const parent = new GuestObject(); parent.define("4", num(7), true, true, true);
const receiver = new GuestArray();
bool(parent.internalSet("4", num(9), obj(receiver), loc), true); length(receiver, 5);
check(receiver.get("4").kind === "number" && parent.getOwnProperty("4")?.value.kind === "number", "receiver created");
const parentValue = parent.get("4");
check(parentValue.kind === "number" && parentValue.value === 7, "ordinary lookup parent unchanged");
const ordinary = new GuestObject();
bool(receiver.internalSet("8", num(11), obj(ordinary), loc), true); length(receiver, 5);
check(receiver.getOwnProperty("8") === undefined && ordinary.getOwnProperty("8") !== undefined, "array base ordinary receiver");
bool(receiver.internalSet("4", num(12), obj(ordinary), loc), true); length(receiver, 5);
const retained = receiver.get("4");
check(retained.kind === "number" && retained.value === 9, "array base existing index unchanged");
const inherited = new GuestArray(); bool(inherited.setPrototypeOf(parent), true);
bool(defineLength(inherited, { value: num(6) }), true);
check(inherited.getOwnProperty("4") === undefined && inherited.get("4") === parentValue, "inherited hole read");
bool(defineLength(inherited, { value: num(0) }), true);
check(inherited.get("4") === parentValue && parent.getOwnProperty("4") !== undefined, "shrink ignores inherited index");

const high = new GuestArray(); element(high, "4294967294"); length(high, 4294967295);
for (const key of ["4294967295", "01", "-0", "1e0"]) { element(high, key); length(high, 4294967295); }
bool(defineLength(high, { value: num(1) }), true); length(high, 1);
check(high.getOwnProperty("4294967294") === undefined, "sparse maximum shrink");
check(high.ownPropertyKeys().join(",") === "length,4294967295,01,-0,1e0", "nonindices survive shrink");

const zeroInputs: Value[] = [num(-0), { kind: "null" }, { kind: "boolean", value: false }, str("")];
for (const value of zeroInputs) {
    const a = three(); bool(defineLength(a, { value }), true); length(a, 0);
    check(a.ownPropertyKeys().join(",") === "length", "zero removes all indices");
    if (value.kind === "number") check(Object.is(value.value, -0), "original negative zero unchanged");
}
const validInputs: Value[] = [{ kind: "boolean", value: true }, str("2"), str("0x10")];
const validLengths = [1, 2, 16];
for (let i = 0; i < validInputs.length; i++) {
    const a = three(); bool(defineLength(a, { value: validInputs[i] }), true); length(a, validLengths[i]);
    check(a.getOwnProperty("0") !== undefined && (a.getOwnProperty("2") !== undefined) === (i === 2), "valid converted truncation state");
}
const invalidInputs = [UNDEFINED, num(NaN), num(Infinity), num(-Infinity), num(-1), num(1.5), num(4294967296), str("x")];
for (const value of invalidInputs) {
    const a = three();
    error(defineLength(a, { value, writable: false, enumerable: true }), "RangeError");
    length(a, 3); check(a.ownPropertyKeys().join(",") === "0,1,2,length", "invalid conversion no mutation");
}
const coercible = new GuestObject();
const hook = new GuestObject();
hook.callable = { kind: "builtin", invoke: (_receiver, _args, _context, _loc): Completion => { throw new Error("unsupported hook called"); } };
coercible.define("valueOf", obj(hook), true, true, true);
coercible.define("toString", obj(hook), true, true, true);
const unsupported = three();
const rejected = defineLength(unsupported, { value: obj(coercible), writable: false });
error(rejected, "TypeError");
check(rejected.type === "throw" && rejected.diagnostic.message === "object-to-primitive conversion unsupported", "explicit unsupported object conversion");
length(unsupported, 3); check(unsupported.ownPropertyKeys().join(",") === "0,1,2,length", "object rejection preserves indices");

const frozen = new GuestArray(); element(frozen, "1");
bool(defineLength(frozen, { value: num(3), writable: false }), true); length(frozen, 3, false);
bool(defineLength(frozen, { value: num(3) }), true);
bool(frozen.internalSet("length", num(3), obj(frozen), loc), false);
error(frozen.set("length", num(3), loc), "TypeError");
error(defineLength(frozen, { value: num(NaN) }), "RangeError");
bool(frozen.internalSet("length", num(NaN), obj(frozen), loc), false);
error(frozen.set("length", num(NaN), loc), "TypeError");
bool(frozen.internalSet("length", obj(coercible), obj(frozen), loc), false);
bool(defineLength(frozen, { value: num(2) }), false);
bool(defineLength(frozen, { value: num(4) }), false);
bool(frozen.defineOwnProperty("3", { value: num(1) }, loc), false);
bool(frozen.defineOwnProperty("1", { value: num(2) }, loc), true);
element(frozen, "0"); length(frozen, 3, false);
check(frozen.getOwnProperty("3") === undefined, "frozen extension absent");
const updatedElement = frozen.get("1");
check(updatedElement.kind === "number" && updatedElement.value === 2, "frozen length existing element updates");

const closed = new GuestArray(); element(closed, "1"); bool(closed.preventExtensions(), true);
bool(closed.defineOwnProperty("0", { value: UNDEFINED }, loc), false);
bool(closed.defineOwnProperty("2", { value: UNDEFINED }, loc), false); length(closed, 2);
bool(closed.defineOwnProperty("1", { value: num(4) }, loc), true);
bool(defineLength(closed, { value: num(7) }), true); length(closed, 7);
check(closed.ownPropertyKeys().join(",") === "1,length", "nonextensible grow only holes");
const closedValue = closed.get("1"); check(closedValue.kind === "number" && closedValue.value === 4, "nonextensible update");

for (const freeze of [false, true]) {
    const a = partial(); length(a, 6);
    const d: DataDescriptorUpdate = { value: num(1) };
    if (freeze) d.writable = false;
    bool(defineLength(a, d), false); length(a, 4, !freeze);
    check(a.ownPropertyKeys().join(",") === "1,3,length", "descending partial deletion stops at blocker");
    bool(a.internalDelete("3"), false); length(a, 4, !freeze);
}
const shrunk = three(); bool(defineLength(shrunk, { value: num(1), writable: false }), true); length(shrunk, 1, false);
check(shrunk.ownPropertyKeys().join(",") === "0,length", "successful delayed freeze");
bool(defineLength(shrunk, { value: num(2) }), false);
for (const flag of ["enumerable", "configurable"]) {
    const a = three();
    const d: DataDescriptorUpdate = { value: num(1), writable: false };
    if (flag === "enumerable") d.enumerable = true;
    else d.configurable = true;
    bool(defineLength(a, d), false); length(a, 3);
    check(a.ownPropertyKeys().join(",") === "0,1,2,length", "flag rejection before deletion/freeze");
}
const flags = three(); bool(defineLength(flags, {}), true);
bool(defineLength(flags, { writable: false }), true); length(flags, 3, false);
bool(defineLength(flags, { writable: true }), false); length(flags, 3, false);
check(flags.ownPropertyKeys().join(",") === "0,1,2,length", "absent value never deletes");

// Guest assignments run through the evaluator's actual reference/receiver path.
let output = "";
const realm = new Realm((line) => { output += line + "\n"; });
const guestArray = new GuestArray();
const originalRhs = str("2");
realm.global.bindings.set("a", { initialized: true, mutable: true, value: obj(guestArray) });
realm.global.bindings.set("rhs", { initialized: true, mutable: true, value: originalRhs });
const success = run("a['4'] = 8; let assigned = a.length = rhs; console.log(assigned, a.length, a['4']);", realm);
check(success.phase === "runtime" && success.completion.type === "normal", "guest success");
check(output === "2 2 undefined\n", "guest converted length and truncation");
check(realm.global.bindings.get("assigned")?.value === originalRhs, "guest original RHS identity"); length(guestArray, 2);
const other = new Realm((_line) => {});
const otherArray = new GuestArray();
other.global.bindings.set("a", { initialized: true, mutable: true, value: obj(otherArray) });
const independent = run("a['0'] = 99;", other);
check(independent.phase === "runtime" && independent.completion.type === "normal", "second realm assignment");
length(otherArray, 1); length(guestArray, 2);
check(guestArray.getOwnProperty("0") === undefined && otherArray.getOwnProperty("0") !== undefined, "realm storage independent");

for (const mode of ["invalid", "readonly", "partial", "object"]) {
    let effects = "";
    const r = new Realm((line) => { effects += line + "\n"; });
    const a = mode === "partial" ? partial() : three();
    if (mode === "readonly") bool(defineLength(a, { writable: false }), true);
    const rhs = mode === "invalid" ? num(NaN) : mode === "readonly" ? num(3) : mode === "partial" ? num(1) : obj(coercible);
    r.global.bindings.set("a", { initialized: true, mutable: true, value: obj(a) });
    r.global.bindings.set("rhs", { initialized: true, mutable: true, value: rhs });
    const result = run("function effect() { console.log('rhs'); return rhs; }\n  a.length = effect(); console.log('after');", r);
    check(effects === "rhs\n", "RHS effect once, failure stops execution");
    check(result.phase === "runtime", "guest error runtime phase");
    if (result.phase !== "runtime" || result.completion.type !== "throw") throw new Error("guest throw missing");
    const diagnostic = result.completion.diagnostic;
    check(diagnostic.name === (mode === "invalid" ? "RangeError" : "TypeError") && diagnostic.phase === "runtime", "guest failure kind");
    check(diagnostic.loc.line === 2 && diagnostic.loc.column === 3, "guest assignment location");
    length(a, mode === "partial" ? 4 : 3, mode !== "readonly");
    check(a.ownPropertyKeys().join(",") === (mode === "partial" ? "1,3,length" : "0,1,2,length"), "guest failure final state");
}
console.log("array storage passed");
