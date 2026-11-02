import { Evaluator } from "../src/evaluator.js";
import { GuestArray } from "../src/array-object.js";
import { GuestObject, UNDEFINED } from "../src/runtime.js";
import type { BooleanCompletion, Completion, DataDescriptorUpdate, InternalBooleanCompletion, OperationContext, PropertyKey, Value, ValueCompletion } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { run } from "../src/interpreter.js";

const keyContext = new Evaluator(new Realm((_line) => {})).context;
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
    bool(a.defineOwnProperty(key, { value: UNDEFINED, writable: true, enumerable: true, configurable }, keyContext, loc), true);
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
    const r = a.defineOwnProperty("length", d, keyContext, loc);
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

const parent = new GuestObject(); parent.bootstrapDefine("4", { value: num(7), writable: true, enumerable: true, configurable: true });
const receiver = new GuestArray();
bool(parent.internalSet("4", num(9), obj(receiver), keyContext, loc), true); length(receiver, 5);
check(receiver.get("4").kind === "number" && parent.getOwnProperty("4")?.value.kind === "number", "receiver created");
const parentValue = parent.get("4");
check(parentValue.kind === "number" && parentValue.value === 7, "ordinary lookup parent unchanged");
const ordinary = new GuestObject();
bool(receiver.internalSet("8", num(11), obj(ordinary), keyContext, loc), true); length(receiver, 5);
check(receiver.getOwnProperty("8") === undefined && ordinary.getOwnProperty("8") !== undefined, "array base ordinary receiver");
bool(receiver.internalSet("4", num(12), obj(ordinary), keyContext, loc), true); length(receiver, 5);
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
let hookCalls = 0;
const hook = new GuestObject(null, false, {
    realm: keyContext.realm,
    kind: "builtin",
    invoke: (_receiver, _args, _context, _loc): Completion => {
        hookCalls++;
        return { type: "normal", value: num(2) };
    },
});
coercible.bootstrapDefine("valueOf", { value: obj(hook), writable: true, enumerable: true, configurable: true });
coercible.bootstrapDefine("toString", { value: obj(hook), writable: true, enumerable: true, configurable: true });
const converted = three();
const convertedResult = defineLength(converted, { value: obj(coercible), writable: false });
bool(convertedResult, true);
check(hookCalls === 2, "two object length conversions");
length(converted, 2, false);
check(converted.ownPropertyKeys().join(",") === "0,1,length", "object shrink removes index 2");
hookCalls = 0;

const frozen = new GuestArray(); element(frozen, "1");
bool(defineLength(frozen, { value: num(3), writable: false }), true); length(frozen, 3, false);
bool(defineLength(frozen, { value: num(3) }), true);
bool(frozen.internalSet("length", num(3), obj(frozen), keyContext, loc), false);
error(frozen.set("length", num(3), keyContext, loc), "TypeError");
error(defineLength(frozen, { value: num(NaN) }), "RangeError");
bool(frozen.internalSet("length", num(NaN), obj(frozen), keyContext, loc), false);
error(frozen.set("length", num(NaN), keyContext, loc), "TypeError");
bool(frozen.internalSet("length", obj(coercible), obj(frozen), keyContext, loc), false);
check(hookCalls === 0, "readonly Set skips hooks");
bool(defineLength(frozen, { value: num(2) }), false);
bool(defineLength(frozen, { value: num(4) }), false);
bool(frozen.defineOwnProperty("3", { value: num(1) }, keyContext, loc), false);
bool(frozen.defineOwnProperty("1", { value: num(2) }, keyContext, loc), true);
element(frozen, "0"); length(frozen, 3, false);
check(frozen.getOwnProperty("3") === undefined, "frozen extension absent");
const updatedElement = frozen.get("1");
check(updatedElement.kind === "number" && updatedElement.value === 2, "frozen length existing element updates");

const closed = new GuestArray(); element(closed, "1"); bool(closed.preventExtensions(), true);
bool(closed.defineOwnProperty("0", { value: UNDEFINED }, keyContext, loc), false);
bool(closed.defineOwnProperty("2", { value: UNDEFINED }, keyContext, loc), false); length(closed, 2);
bool(closed.defineOwnProperty("1", { value: num(4) }, keyContext, loc), true);
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
    hookCalls = 0;
    const result = run("function effect() { console.log('rhs'); return rhs; }\n  let assigned = a.length = effect(); console.log('after');", r);
    if (mode === "object") {
        check(result.phase === "runtime" && result.completion.type === "normal", "object assignment success");
        check(effects === "rhs\nafter\n" && hookCalls === 2, "object assignment effects and two hooks");
        check(r.global.bindings.get("assigned")?.value === rhs, "object assignment RHS identity");
        length(a, 2);
        check(a.getOwnProperty("2") === undefined, "object assignment shrink");
        continue;
    }
    check(effects === "rhs\n", "RHS effect once, failure stops execution");
    check(result.phase === "runtime", "guest error runtime phase");
    if (result.phase !== "runtime" || result.completion.type !== "throw") throw new Error("guest throw missing");
    const diagnostic = result.completion.diagnostic;
    check(diagnostic.name === (mode === "invalid" ? "RangeError" : "TypeError") && diagnostic.phase === "runtime", "guest failure kind");
    check(diagnostic.loc.line === 2 && diagnostic.loc.column === 18, "guest assignment location");
    length(a, mode === "partial" ? 4 : 3, mode !== "readonly");
    check(a.ownPropertyKeys().join(",") === (mode === "partial" ? "1,3,length" : "0,1,2,length"), "guest failure final state");
}
// P2-P5: trusted setup is validated, uses array storage rules, and never
// dispatches semantic hooks. These cases intentionally exercise host faults.
function bootstrapFault(target: GuestObject, key: string, desc: DataDescriptorUpdate): void {
    let fault = false;
    try { target.bootstrapDefine(key, desc); }
    catch (error) { fault = error instanceof Error; }
    check(fault, "bootstrap rejection is a host fault");
}
let constructionDispatches = 0;
class SetupArray extends GuestArray {
    protected ordinaryDefineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate): BooleanCompletion {
        constructionDispatches++;
        return super.ordinaryDefineOwnProperty(key, desc);
    }
    semanticCalls = 0;
    bootstrapCalls = 0;
    defineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate, context: OperationContext, at: Location): InternalBooleanCompletion {
        constructionDispatches++;
        this.semanticCalls++;
        return super.defineOwnProperty(key, desc, context, at);
    }
    protected bootstrapDefineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate, at: Location): InternalBooleanCompletion {
        constructionDispatches++;
        this.bootstrapCalls++;
        return super.bootstrapDefineOwnProperty(key, desc, at);
    }
}
const constructed = new SetupArray();
length(constructed, 0);
check(constructionDispatches === 0, "constructor bypasses subclass dispatch");
constructed.bootstrapDefine("2", { value: UNDEFINED, configurable: true });
length(constructed, 3);
check(constructed.bootstrapCalls === 1 && constructed.semanticCalls === 0, "array setup dispatch excludes semantics");

for (let i = 0; i < validInputs.length; i++) {
    const a = three();
    a.bootstrapDefine("length", { value: validInputs[i] });
    length(a, validLengths[i]);
}
for (const value of zeroInputs) {
    const a = three();
    a.bootstrapDefine("length", { value });
    length(a, 0);
    check(a.ownPropertyKeys().join(",") === "length", "bootstrap zero shrink");
}
for (const value of invalidInputs) {
    const a = three();
    bootstrapFault(a, "length", { value, writable: false });
    length(a, 3);
    check(a.ownPropertyKeys().join(",") === "0,1,2,length", "invalid bootstrap preserves storage");
}
const bootstrapFrozen = three();
bootstrapFrozen.bootstrapDefine("length", { writable: false });
bootstrapFrozen.bootstrapDefine("length", { value: num(3) });
bootstrapFault(bootstrapFrozen, "length", { value: num(2) });
bootstrapFault(bootstrapFrozen, "length", { writable: true });
bootstrapFault(bootstrapFrozen, "3", { value: UNDEFINED });
length(bootstrapFrozen, 3, false);
check(bootstrapFrozen.getOwnProperty("3") === undefined, "bootstrap cannot grow frozen array");
const bootstrapClosed = three();
bool(bootstrapClosed.preventExtensions(), true);
bootstrapFault(bootstrapClosed, "3", { value: UNDEFINED });
bootstrapClosed.bootstrapDefine("length", { value: num(7) });
length(bootstrapClosed, 7);
check(bootstrapClosed.ownPropertyKeys().join(",") === "0,1,2,length", "closed bootstrap grows holes only");

class BootstrapValue extends GuestObject {
    reads = 0;
    internalGet(_key: PropertyKey, _receiver: Value, _at: Location): ValueCompletion {
        this.reads++;
        throw new Error("bootstrap must not inspect object length");
    }
}
const untouchedObject = new BootstrapValue();
const untouched = obj(untouchedObject);
const objectLength = three();
bootstrapFault(objectLength, "length", { value: untouched, writable: false });
length(objectLength, 3);
check(objectLength.ownPropertyKeys().join(",") === "0,1,2,length" && untouchedObject.reads === 0, "object length fails before reads or mutation");
const ordinaryLength = new GuestObject();
ordinaryLength.bootstrapDefine("length", { value: untouched });
objectLength.bootstrapDefine("0", { value: untouched });
check(ordinaryLength.get("length") === untouched && objectLength.get("0") === untouched && untouchedObject.reads === 0, "ordinary length and element preserve object identity");

const bootstrapPartial = partial();
const partialDescriptor: DataDescriptorUpdate = { value: num(1), writable: false };
const originalValue = partialDescriptor.value;
bootstrapFault(bootstrapPartial, "length", partialDescriptor);
length(bootstrapPartial, 4, false);
check(bootstrapPartial.ownPropertyKeys().join(",") === "1,3,length", "bootstrap descending partial deletion and freeze");
check(partialDescriptor.value === originalValue && partialDescriptor.writable === false && partialDescriptor.enumerable === undefined && partialDescriptor.configurable === undefined, "bootstrap partial descriptor unchanged");
console.log("array storage passed");
