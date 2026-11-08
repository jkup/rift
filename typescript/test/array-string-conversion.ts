import type { OperationContext } from "../src/runtime.js";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, normal, failure, sameValue, type Value, type ValueCompletion, type PropertyKey, type Builtin, type InternalBooleanCompletion } from "../src/runtime.js";
import { GuestSymbol, wellKnownToPrimitive, wellKnownToStringTag } from "../src/symbols.js";
import { GuestArray } from "../src/array-object.js";
import { GuestStringObject } from "../src/primitive-objects.js";
import { toPrimitive } from "../src/primitive-conversion.js";
import { lengthOfArrayLike } from "../src/array-like.js";
import { toString, toNumber, toPropertyKey } from "../src/conversion.js";
import { parse } from "../src/parser.js";
import { readFileSync } from "node:fs";
import type { Location } from "../src/syntax.js";

const loc: Location = { line: 91, column: 7 };
function check(ok: boolean, label: string): void {
    if (!ok) throw new Error("Array conversion " + label);
}
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function put(object: GuestObject, key: PropertyKey, value: Value): void {
    object.bootstrapDefine(key, { value, writable: true, enumerable: true, configurable: true });
}
function num(value: number): Value { return { kind: "number", value }; }
function str(value: string): Value { return { kind: "string", value }; }
const nil: Value = { kind: "null" };
function expect(completion: ValueCompletion, expected: Value, label: string): void {
    check(completion.type === "normal" && sameValue(completion.value, expected), label);
}
function error(completion: ValueCompletion, message: string, name: string = "TypeError"): void {
    check(completion.type === "throw" && completion.diagnostic.phase === "runtime"
        && completion.diagnostic.name === name && completion.diagnostic.message === message
        && completion.diagnostic.loc.line === loc.line && completion.diagnostic.loc.column === loc.column
        && sameValue(completion.value, str(name + ": " + message)), "exact " + message);
}
function array(realm: Realm, values: Value[]): GuestArray {
    const result = realm.createArray();
    for (let i = 0; i < values.length; i++) put(result, String(i), values[i]);
    return result;
}
function fn(realm: Realm, body: Builtin): Value { return obj(realm.createBuiltin("hook", 0, body)); }
class Observed extends GuestObject {
    reads: PropertyKey[] = [];
    failKey: PropertyKey = "unused";
    hostFault = false;
    readonly fault = new Error("host sentinel");
    readonly abrupt = failure("Sentinel", "read", loc);
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        this.reads.push(key);
        if (key === this.failKey) {
            if (this.hostFault) throw this.fault;
            return this.abrupt;
        }
        return super.internalGet(key, receiver, context, at);
    }
    internalHasProperty(_key: PropertyKey, _at: Location): InternalBooleanCompletion {
        throw new Error("join must use Get, never HasProperty");
    }
}
function reads(object: Observed, expected: PropertyKey[], label: string): void {
    check(object.reads.length === expected.length, label + " read count");
    for (let i = 0; i < expected.length; i++) check(object.reads[i] === expected[i], label + " read order");
}

const a = new Realm((_line) => {});
const b = new Realm((_line) => {});
const c = new Realm((_line) => {});
const active = new Evaluator(a);
const join = b.arrayPrototype.get("join", active.context, loc);
const stringify = b.arrayPrototype.get("toString", active.context, loc);
function j(receiver: Value, args: Value[] = []): ValueCompletion {
    return active.call(join, receiver, args, loc);
}
function t(receiver: Value, args: Value[] = []): ValueCompletion {
    return active.call(stringify, receiver, args, loc);
}
const symbol: Value = { kind: "symbol", value: new GuestSymbol("element") };

// J1-J14: generic inputs, sparse reads, explicit boxing and separator defaults.
for (const receiver of [obj(a.createArray()), obj(b.arrayPrototype)]) {
    expect(j(receiver), str(""), "J1 omitted");
    expect(j(receiver, [UNDEFINED]), str(""), "J1 undefined");
}
const pair = obj(array(a, [num(1), num(2)]));
const separators = [UNDEFINED, nil, str("")];
const texts = ["1,2", "1null2", "12"];
expect(j(pair), str("1,2"), "J2 omitted");
for (let i = 0; i < separators.length; i++) expect(j(pair, [separators[i]]), str(texts[i]), "J2");
const sparse = new Observed(a.arrayPrototype);
put(sparse, "length", num(3));
put(sparse, "1", str("x"));
expect(j(obj(sparse)), str(",x,"), "J3");
reads(sparse, ["length", "0", "1", "2"], "J3");
expect(j(obj(array(a, [nil, UNDEFINED, str(""), { kind: "boolean", value: false }, num(0), num(-0)]))), str(",,,false,0,0"), "J4");
expect(j(obj(array(a, [pair, obj(array(a, [num(3)]))])), [str(";")]), str("1,2;3"), "J5");
const parent = a.createObject();
put(parent, "0", str("p"));
const inherited = new Observed(parent);
put(inherited, "length", num(2));
expect(j(obj(inherited)), str("p,"), "J6");
reads(inherited, ["length", "0", "1"], "J6");
const generic = new Observed();
put(generic, "length", num(3));
put(generic, "0", str("a"));
put(generic, "2", str("c"));
expect(j(obj(generic)), str("a,,c"), "J7");
put(generic, "1", str("b"));
for (const length of [num(-1), num(NaN), UNDEFINED, num(2.9)]) {
    put(generic, "length", length);
    expect(j(obj(generic)), str(length.kind === "number" && length.value === 2.9 ? "a,b" : ""), "J8");
}
for (const receiver of [str("ab"), obj(c.createStringObject("ab"))]) {
    expect(j(receiver, [str("-")]), str("a-b"), "J9");
}
expect(j(str("\ud83d\ude00"), [str("|")]), str("\ud83d|\ude00"), "J10");
for (const receiver of [{ kind: "boolean", value: true } as Value, num(7), symbol]) {
    expect(j(receiver), str(""), "J11");
}
let separatorCalls = 0;
const separator = a.createObject();
put(separator, wellKnownToPrimitive, fn(a, (_receiver, args, _context, _at) => {
    separatorCalls++;
    check(sameValue(args[0], str("string")), "J13 hint");
    return normal(str("x"));
}));
const forbiddenSeparator = a.createObject();
put(forbiddenSeparator, wellKnownToPrimitive, fn(a, (_receiver, _args, _context, _at): ValueCompletion => {
    throw new Error("J12 separator must not run");
}));
for (const receiver of [nil, UNDEFINED]) error(j(receiver, [obj(forbiddenSeparator)]), "cannot convert null or undefined to object");
check(separatorCalls === 0, "J12 no hook");
expect(j(obj(a.createArray()), [obj(separator)]), str(""), "J13");
check(separatorCalls === 1, "J13 once");
error(j(obj(a.createArray()), [symbol]), "cannot convert symbol to string");

// J15-J22: ordered effects, original abrupt records, ordinary and symbol hooks.
let trace = "";
function hook(label: string, hint: string, value: Value): Value {
    const object = a.createObject();
    put(object, wellKnownToPrimitive, fn(a, (_receiver, args, _context, _at) => {
        trace += label;
        check(sameValue(args[0], str(hint)), "J15 hint " + label);
        return normal(value);
    }));
    return obj(object);
}
const ordered = new Observed();
put(ordered, "length", hook("L", "number", num(2)));
put(ordered, "0", hook("A", "string", str("a")));
put(ordered, "1", hook("B", "string", str("b")));
expect(j(obj(ordered), [hook("S", "string", str("-"))]), str("a-b"), "J15");
check(trace === "LSAB", "J15 trace");
const sentinel = failure("Sentinel", "hook", { line: 47, column: 3 });
const throwing = a.createObject();
put(throwing, wellKnownToPrimitive, fn(a, (_receiver, _args, _context, _at) => sentinel));
put(ordered, "length", obj(throwing));
ordered.reads = [];
check(j(obj(ordered), [obj(separator)]) === sentinel, "J16 exact throw");
reads(ordered, ["length"], "J16");
put(ordered, "length", num(2));
ordered.reads = [];
check(j(obj(ordered), [obj(throwing)]) === sentinel, "J17 exact throw");
reads(ordered, ["length"], "J17");
for (const value of [symbol, obj(a.createSymbolObject(new GuestSymbol("boxed")))]) {
    error(j(obj(array(a, [value]))), "cannot convert symbol to string");
}
for (const value of [str("x"), symbol, obj(a.createObject())]) {
    const result = j(obj(array(a, [hook("", "string", value)])));
    if (value.kind === "string") expect(result, value, "J19 text");
    else error(result, value.kind === "symbol" ? "cannot convert symbol to string" : "cannot convert object to primitive");
}
const ordinary = a.createObject();
put(ordinary, "toString", fn(a, (_receiver, _args, _context, _at) => {
    trace += "toString;";
    return normal(obj(ordinary));
}));
put(ordinary, "valueOf", fn(a, (_receiver, _args, _context, _at) => {
    trace += "valueOf;";
    return normal(num(7));
}));
trace = "";
expect(j(obj(array(a, [obj(ordinary)]))), str("7"), "J20");
check(trace === "toString;valueOf;", "J20 trace");
put(ordinary, "valueOf", fn(a, (_receiver, _args, _context, _at) => normal(obj(ordinary))));
for (const element of [ordinary, new GuestObject()]) {
    const receiver = new Observed();
    put(receiver, "length", num(2));
    put(receiver, "0", obj(element));
    error(j(obj(receiver)), "cannot convert object to primitive");
    reads(receiver, ["length", "0"], "J21");
}
expect(j(obj(array(a, [hook("", "string", UNDEFINED), hook("", "string", nil)]))), str("undefined,null"), "J22");

// J23-J28: length is captured once; each later indexed read is fresh.
for (const mode of ["shrink", "extend"]) {
    const receiver = array(a, [str("a"), str("old")]);
    const sep = a.createObject();
    put(sep, wellKnownToPrimitive, fn(a, (_receiver, _args, context, at) => {
        if (mode === "shrink") receiver.defineOwnProperty("length", { value: num(0) }, context, at);
        else {
            put(receiver, "1", str("b"));
            put(receiver, "2", str("c"));
        }
        return normal(str(","));
    }));
    expect(j(obj(receiver), [obj(sep)]), str(mode === "shrink" ? "," : "a,b"), "J23/J24");
}
for (const mode of ["delete", "replace", "shrink"]) {
    const realm = new Realm((_line) => {});
    put(realm.arrayPrototype, "1", str("p"));
    const receiver = array(realm, [UNDEFINED, str("old")]);
    const element = realm.createObject();
    put(element, wellKnownToPrimitive, fn(realm, (_receiver, _args, context, at) => {
        if (mode === "delete") receiver.internalDelete("1");
        else if (mode === "replace") {
            put(receiver, "1", str("z"));
            put(receiver, "2", str("later"));
        } else {
            realm.arrayPrototype.internalDelete("1");
            receiver.defineOwnProperty("length", { value: num(1) }, context, at);
        }
        return normal(str("a"));
    }));
    put(receiver, "0", obj(element));
    expect(j(obj(receiver)), str(mode === "delete" ? "a,p" : mode === "replace" ? "a,z" : "a,"), "J25-J27");
}
const snapshot = new Observed();
const lengthHook = a.createObject();
put(lengthHook, wellKnownToPrimitive, fn(a, (_receiver, _args, _context, _at) => {
    put(snapshot, "length", num(0));
    return normal(num(2));
}));
put(snapshot, "length", obj(lengthHook));
expect(j(obj(snapshot)), str(","), "J28");
reads(snapshot, ["length", "0", "1"], "J28");
snapshot.reads = [];
put(snapshot, "length", num(3));
snapshot.failKey = "1";
check(j(obj(snapshot)) === snapshot.abrupt, "J29 exact read throw");
reads(snapshot, ["length", "0", "1"], "J29");
let count = 0;
const shared = a.createObject();
put(shared, wellKnownToPrimitive, fn(a, (_receiver, _args, _context, _at) => {
    count++;
    return normal(num(count));
}));
expect(j(obj(array(a, [obj(shared), obj(shared)]))), str("1,2"), "J30 fresh conversions");
function depthError(completion: ValueCompletion): void {
    check(completion.type === "throw" && completion.diagnostic.name === "RangeError"
        && completion.diagnostic.message === "call depth limit exceeded"
        && completion.diagnostic.loc.line === 91 && completion.diagnostic.loc.column === 7,
        "located call guard");
}

// T1-T14: current join forwarding and immutable intrinsic fallback.
expect(t(pair, [obj(throwing)]), str("1,2"), "T1 ignored arguments");
for (const returned of [obj(a.createObject()), symbol, UNDEFINED]) {
    const receiver = a.createObject();
    put(receiver, "join", fn(c, (actual, args, context, _at) => {
        check(actual.kind === "object" && actual.object === receiver && args.length === 0, "T2 receiver/args");
        check(context === active.context && context.realm === c, "T2 shared context");
        return normal(returned);
    }));
    expect(t(obj(receiver)), returned, "T2 exact result");
}
for (const noncallable of [num(0), nil, UNDEFINED, obj(throwing)]) {
    const receiver = a.createArray();
    put(receiver, "join", noncallable);
    expect(t(obj(receiver)), str("[object Array]"), "T3 no join coercion");
}
const deletedRealm = new Realm((_line) => {});
deletedRealm.arrayPrototype.internalDelete("join");
expect(t(obj(deletedRealm.createArray())), str("[object Array]"), "T4");
const lookalike = new GuestObject(a.arrayPrototype);
put(lookalike, "join", num(0));
expect(t(obj(lookalike)), str("[object Object]"), "T5");
expect(t(obj(c.createStringObject("ab"))), str("[object String]"), "T6");
const boxes: GuestObject[] = [];
put(b.stringPrototype, "join", fn(c, (receiver, args, context, _at) => {
    check(receiver.kind === "object", "T7 boxed receiver");
    if (receiver.kind !== "object") throw new Error("box required");
    check(receiver.object.getPrototypeOf() === b.stringPrototype && args.length === 0 && context.realm === c, "T7 defining box");
    boxes.push(receiver.object);
    return normal(str("observed"));
}));
expect(t(str("ab")), str("observed"), "T7 first");
expect(t(str("ab")), str("observed"), "T7 second");
check(boxes.length === 2 && boxes[0] !== boxes[1], "T7 fresh boxes");
b.stringPrototype.internalDelete("join");
for (const tag of [str("Custom"), num(1)]) {
    const receiver = a.createArray();
    put(receiver, "join", nil);
    put(receiver, wellKnownToStringTag, tag);
    expect(t(obj(receiver)), str(tag.kind === "string" ? "[object Custom]" : "[object Array]"), "T8");
}
const brokenJoin = new Observed();
brokenJoin.failKey = "join";
check(t(obj(brokenJoin)) === brokenJoin.abrupt, "T9 Get throw");
brokenJoin.failKey = "unused";
put(brokenJoin, "join", fn(c, (_receiver, _args, _context, _at) => sentinel));
check(t(obj(brokenJoin)) === sentinel, "T9 call throw");

class CallObserver extends Evaluator {
    callees: Value[] = [];
    realms: Realm[] = [];
    stepCounts: number[] = [];
    call(callee: Value, receiver: Value, args: Value[], at: Location): ValueCompletion {
        this.callees.push(callee);
        this.realms.push(this.context.realm);
        this.stepCounts.push(this.steps);
        const result = super.call(callee, receiver, args, at);
        this.realms.push(this.context.realm);
        this.stepCounts.push(this.steps);
        return result;
    }
}
const captured = b.objectPrototype.get("toString", active.context, loc);
for (const owner of [a, b]) {
    for (const mode of ["replace", "delete"]) {
        if (mode === "replace") put(owner.objectPrototype, "toString", fn(owner, (_receiver, _args, _context, _at) => sentinel));
        else owner.objectPrototype.internalDelete("toString");
        const evaluator = new CallObserver(a);
        const receiver = new Observed(c.objectPrototype);
        put(receiver, wellKnownToStringTag, str("Foreign"));
        expect(evaluator.call(stringify, obj(receiver), [], loc), str("[object Foreign]"), "T10/R4");
        check(evaluator.callees.length === 2 && evaluator.callees[1] === captured, "T10 exact captured callee");
        check(evaluator.realms[1] === b && evaluator.realms[2] === b && evaluator.context.realm === a, "R4 defining realm");
        reads(receiver, ["join", wellKnownToStringTag], "R4");
    }
}
// Restore public methods for later controls; captured identity never changed.
put(b.objectPrototype, "toString", captured);
const freshObjectToString = new Realm((_line) => {}).objectPrototype.get("toString", active.context, loc);
put(a.objectPrototype, "toString", freshObjectToString);
const savedRealm = new Realm((_line) => {});
const savedJ = savedRealm.arrayPrototype.get("join", active.context, loc);
const savedT = savedRealm.arrayPrototype.get("toString", active.context, loc);
const savedInput = array(savedRealm, [num(2)]);
put(savedRealm.arrayPrototype, "join", fn(savedRealm, (_receiver, _args, _context, _at) => normal(str("replacement"))));
savedRealm.arrayPrototype.internalDelete("toString");
expect(active.call(savedJ, obj(savedInput), [], loc), str("2"), "T11 saved J");
expect(active.call(savedT, obj(savedInput), [], loc), str("replacement"), "T11 current J");
savedRealm.arrayPrototype.internalDelete("join");
expect(active.call(savedT, obj(savedInput), [], loc), str("[object Array]"), "T11 deleted J");
class ChangingJoin extends GuestObject {
    first: Value = UNDEFINED;
    second: Value = UNDEFINED;
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        if (key === "join") {
            const fetched = this.first;
            this.first = this.second;
            return normal(fetched);
        }
        return super.internalGet(key, receiver, context, at);
    }
}
const changing = new ChangingJoin();
changing.first = fn(c, (_receiver, _args, _context, _at) => normal(str("F")));
changing.second = fn(c, (_receiver, _args, _context, _at) => normal(str("G")));
expect(t(obj(changing)), str("F"), "T12 captured Get");
expect(t(obj(changing)), str("G"), "T12 fresh Get");
for (const receiver of [nil, UNDEFINED]) error(t(receiver), "cannot convert null or undefined to object");
const returnedObject = a.createObject();
const primitiveInput = a.createArray();
put(primitiveInput, "join", fn(c, (_receiver, _args, _context, _at) => normal(obj(returnedObject))));
put(primitiveInput, "valueOf", fn(c, (_receiver, _args, _context, _at) => normal(num(9))));
expect(t(obj(primitiveInput)), obj(returnedObject), "T14 direct result");
expect(toPrimitive(obj(primitiveInput), "string", active.context, loc), num(9), "T14 ordinary continuation");

// R1-R5: metadata, no receiver writes, and active Realm transitions.
const roots = [a.arrayPrototype, b.arrayPrototype, c.arrayPrototype];
const realms = [a, b, c];
for (let r = 0; r < roots.length; r++) {
    const root = roots[r];
    const keys = root.ownPropertyKeys();
    check(keys.length === 5 && keys[0] === "length" && keys[1] === "join" && keys[2] === "toString" && keys[3] === "push" && keys[4] === "pop", "R1 key order");
    const length = root.getOwnProperty("length");
    check(length !== undefined && length.kind === "data" && sameValue(length.value, num(0)) && length.writable && !length.enumerable && !length.configurable, "R1 root length");
    for (const name of ["join", "toString"]) {
        const property = root.getOwnProperty(name);
        check(property !== undefined && property.kind === "data" && property.writable && !property.enumerable && property.configurable, "R1 property flags");
        const method = root.get(name, active.context, loc);
        if (method.kind !== "object") throw new Error("missing Array method");
        check(method.object.getPrototypeOf() === realms[r].functionPrototype && method.object.callable !== null && method.object.callable.realm === realms[r], "R1 defining function");
        check(method.object.ownPropertyKeys().length === 2 && method.object.getOwnProperty("prototype") === undefined, "R1 no prototype");
        check(sameValue(method.object.get("name", active.context, loc), str(name)) && sameValue(method.object.get("length", active.context, loc), num(name === "join" ? 1 : 0)), "R1 metadata");
        for (const key of ["name", "length"]) {
            const metadata = method.object.getOwnProperty(key);
            check(metadata !== undefined && metadata.kind === "data" && !metadata.writable && !metadata.enumerable && metadata.configurable, "R1 metadata flags");
        }
        for (let previous = 0; previous < r; previous++) check(!sameValue(method, roots[previous].get(name, active.context, loc)), "R1 fresh intrinsic");
    }
    check(!sameValue(root.get("join", active.context, loc), root.get("toString", active.context, loc)), "R1 distinct methods");
}
const frozenRealm = new Realm((_line) => {});
const frozen = array(frozenRealm, [num(1)]);
frozen.preventExtensions();
frozenRealm.arrayPrototype.preventExtensions();
expect(j(obj(frozen)), str("1"), "R2 nonextensible receiver");
expect(t(obj(frozen)), str("1"), "R2 nonextensible root");
check(frozen.ownPropertyKeys().length === 2 && frozenRealm.arrayPrototype.ownPropertyKeys().length === 5, "R2 no writes");
const transitions = new CallObserver(a);
const foreign = c.createObject();
put(foreign, "join", fn(c, (_receiver, _args, context, _at) => {
    check(context === transitions.context && context.realm === c, "R3 C active");
    return normal(num(17));
}));
expect(transitions.call(stringify, obj(foreign), [], loc), num(17), "R3 result");
check(transitions.realms.length === 4 && transitions.realms[0] === a && transitions.realms[1] === b
    && transitions.realms[2] === b && transitions.realms[3] === a, "R3 A/B/C/B/A");
for (let i = 1; i < transitions.stepCounts.length; i++) check(transitions.stepCounts[i] >= transitions.stepCounts[i - 1], "R3 monotonic");

// Observe boxing and indexed reads through the wrapper factory without changing Get.
class ReadString extends GuestStringObject {
    reads: PropertyKey[] = [];
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        check(receiver.kind === "object" && receiver.object === this, "R5 Get receiver identity");
        this.reads.push(key);
        return super.internalGet(key, receiver, context, at);
    }
}
class BoxingRealm extends Realm {
    boxes: ReadString[] = [];
    createStringObject(value: string): ReadString {
        const box = new ReadString(value, this.stringPrototype);
        this.boxes.push(box);
        return box;
    }
}
const boxingRealm = new BoxingRealm((_line) => {});
const boxingJ = boxingRealm.arrayPrototype.get("join", active.context, loc);
expect(active.call(boxingJ, str("ab"), [], loc), str("a,b"), "R5 first box");
expect(active.call(boxingJ, str("ab"), [], loc), str("a,b"), "R5 second box");
check(boxingRealm.boxes.length === 2 && boxingRealm.boxes[0] !== boxingRealm.boxes[1]
    && boxingRealm.boxes[0].getPrototypeOf() === boxingRealm.stringPrototype, "R5 defining fresh boxes");
for (const box of boxingRealm.boxes) {
    check(box.reads.length === 3 && box.reads[0] === "length" && box.reads[1] === "0" && box.reads[2] === "1", "R5 length/index order");
}
const cBox = c.createStringObject("ab");
expect(active.call(boxingJ, obj(cBox), [], loc), str("a,b"), "R5 existing box");
check(boxingRealm.boxes.length === 2 && cBox.getPrototypeOf() === c.stringPrototype, "R5 no reboxing");

// R6: each effect boundary propagates the original guest/host failure and unwinds.
for (const stage of ["length", "separator", "index", "element", "join", "tag"]) {
    for (const mode of ["guest", "host", "step"]) {
        const evaluator = new Evaluator(a);
        const receiver = new Observed(c.objectPrototype);
        const hookObject = c.createObject();
        const hostFault = new Error("boundary fault");
        let effects = 0;
        put(hookObject, wellKnownToPrimitive, fn(c, (_receiver, _args, context, at): ValueCompletion => {
            effects++;
            if (mode === "host") throw hostFault;
            if (mode === "step") {
                evaluator.maxSteps = evaluator.steps;
                return context.tick(at);
            }
            return sentinel;
        }));
        put(receiver, "length", num(2));
        put(receiver, "0", num(1));
        let method = join;
        let args: Value[] = [];
        if (stage === "length") put(receiver, "length", obj(hookObject));
        if (stage === "separator") args = [obj(hookObject)];
        if (stage === "element") put(receiver, "0", obj(hookObject));
        if (stage === "index" || stage === "join" || stage === "tag") {
            receiver.failKey = stage === "index" ? "0" : stage === "join" ? "join" : wellKnownToStringTag;
            receiver.hostFault = mode === "host";
            if (stage !== "index") method = stringify;
            if (mode === "step") {
                receiver.failKey = "unused";
                evaluator.maxSteps = stage === "join" ? 0 : 1;
            }
        }
        let fault: Error | null = null;
        try {
            const completion = evaluator.call(method, obj(receiver), args, loc);
            if (mode === "step") error(completion, "execution step limit exceeded", "RangeError");
            else if (mode === "guest") {
                check(completion === (stage === "index" || stage === "join" || stage === "tag" ? receiver.abrupt : sentinel), "R6 original completion " + stage);
            } else check(false, "R6 missing host fault");
        } catch (caught) {
            if (!(caught instanceof Error)) throw new Error("unexpected non-Error host fault");
            fault = caught;
        }
        if (mode === "host") check(fault === (stage === "index" || stage === "join" || stage === "tag" ? receiver.fault : hostFault), "R6 exact host fault");
        else check(fault === null, "R6 unexpected host fault");
        check(evaluator.calls === 0 && evaluator.context.realm === a, "R6 cleanup " + stage);
        check(receiver.reads.indexOf("1") === -1 && effects <= 1, "R6 no later effects");
    }
}
// A callable join can fail after the forwarding call has entered C.
for (const mode of ["guest", "host", "step"]) {
    const evaluator = new Evaluator(a);
    const receiver = c.createObject();
    const hostFault = new Error("join fault");
    put(receiver, "join", fn(c, (_receiver, _args, context, at): ValueCompletion => {
        check(context.realm === c, "R6 callable join realm");
        if (mode === "host") throw hostFault;
        if (mode === "step") {
            evaluator.maxSteps = evaluator.steps;
            return context.tick(at);
        }
        return sentinel;
    }));
    let caught: Error | null = null;
    try {
        const completion = evaluator.call(stringify, obj(receiver), [], loc);
        if (mode === "guest") check(completion === sentinel, "R6 callable join sentinel");
        if (mode === "step") error(completion, "execution step limit exceeded", "RangeError");
    } catch (fault) {
        if (!(fault instanceof Error)) throw new Error("unexpected non-Error host fault");
        caught = fault;
    }
    check(caught === (mode === "host" ? hostFault : null), "R6 callable join host identity");
    check(evaluator.calls === 0 && evaluator.context.realm === a, "R6 callable join cleanup");
}
for (const method of [join, stringify]) {
    const evaluator = new Evaluator(a, 100000, 0);
    const receiver = new Observed();
    depthError(evaluator.call(method, obj(receiver), [], loc));
    check(evaluator.steps === 0 && receiver.reads.length === 0 && evaluator.calls === 0, "R7 denied before effects");
}
const oneCall = new Evaluator(a, 100000, 1);
const emptyObserved = new Observed(b.arrayPrototype);
depthError(oneCall.call(stringify, obj(emptyObserved), [], loc));
check(oneCall.steps === 1, "R8 steps");
reads(emptyObserved, ["join"], "R8 no length");
for (const maxSteps of [1, 2]) {
    for (const length of [2, 4294967296, Infinity]) {
        const evaluator = new Evaluator(a, maxSteps);
        const receiver = new Observed();
        put(receiver, "length", num(length));
        error(evaluator.call(join, obj(receiver), [], loc), "execution step limit exceeded", "RangeError");
        check(evaluator.steps === maxSteps + 1 && evaluator.calls === 0 && evaluator.context.realm === a, "R9-R11 boundary");
        reads(receiver, maxSteps === 1 ? ["length"] : ["length", "0"], "R9-R11 reads");
    }
}

// Run the real default guard before claiming recursive native safety.
for (const mutual of [false, true]) {
    const realm = new Realm((_line) => {});
    const a = realm.createArray();
    const b = mutual ? realm.createArray() : a;
    put(a, "0", obj(b));
    put(b, "0", obj(a));
    for (const limit of [1, 2, 4, 64]) {
        const evaluator = limit === 64 ? new Evaluator(realm) : new Evaluator(realm, 100000, limit);
        check(evaluator.maxCalls === limit, "R12 default call guard");
        depthError(evaluator.call(realm.arrayPrototype.get("join", oneCall.context, loc), obj(a), [], loc));
        check(evaluator.calls === 0 && evaluator.context.realm === realm, "cycle cleanup");
        check(evaluator.steps === (limit % 2 === 0 ? limit / 2 * 5 : (limit - 1) / 2 * 5 + 4), "cycle steps");
        console.log("cycle", mutual, limit, evaluator.steps);
    }
}
// R12-R15: finite nesting, reentry, reused contexts, and repeated identities.
const finite = new Evaluator(a, 100000, 3);
expect(finite.call(join, obj(array(a, [obj(array(a, [num(1)]))])), [], loc), str("1"), "R12 finite");
check(finite.steps === 7 && finite.calls === 0, "R12 finite budget");
for (const mode of ["separator", "element"]) {
    for (const limit of [2, 64]) {
        const evaluator = limit === 64 ? new Evaluator(a) : new Evaluator(a, 100000, limit);
        check(evaluator.maxCalls === limit, "R13 default call guard");
        const receiver = array(c, [num(1)]);
        const recursive = c.createObject();
        put(recursive, wellKnownToPrimitive, fn(c, (_receiver, _args, context, at) => {
            if (mode === "separator") return context.call(join, obj(receiver), [obj(recursive)], at);
            return context.call(stringify, obj(receiver), [], at);
        }));
        if (mode === "element") put(receiver, "0", obj(recursive));
        depthError(evaluator.call(join, obj(receiver), mode === "separator" ? [obj(recursive)] : [], loc));
        check(evaluator.calls === 0 && evaluator.context.realm === a, "R13 cleanup");
        const before = evaluator.steps;
        expect(evaluator.call(join, obj(a.createArray()), [], loc), str(""), "R14 independent after failure");
        check(evaluator.steps === before + 1, "R14 steps retained");
        check(new Evaluator(a).steps === 0, "R14 fresh evaluator");
        console.log("reentry", mode, limit, before);
    }
}
const sharedInner = new Observed(a.arrayPrototype);
put(sharedInner, "length", num(1));
put(sharedInner, "0", num(1));
expect(j(obj(array(a, [obj(sharedInner), obj(sharedInner)]))), str("1,1"), "R15 repeated identity");
reads(sharedInner, [wellKnownToPrimitive, "toString", "join", "length", "0", wellKnownToPrimitive, "toString", "join", "length", "0"], "R15 no visited cache");

// C1-C3 use a guest fixture, with operands read from mutable bindings.
const consumerRealm = new Realm((_line) => {});
const consumer = new Evaluator(consumerRealm);
const equality = parse("let empty = []; if (!(empty == 0)) throw 'C2'; if (empty != 0) throw 'C2';");
check(equality.error === null, "C2 equality parse");
const equalityRealm = new Realm((_line) => {});
check(new Evaluator(equalityRealm).block(equality.body, equalityRealm.global, UNDEFINED).type === "normal", "C2 equality success");
const fixture = parse(readFileSync("test/fixtures/array-string-conversion.js", "utf8"));
check(fixture.error === null, "C fixture parse");
const executed = consumer.block(fixture.body, consumerRealm.global, UNDEFINED);
check(executed.type === "normal", "C fixture assertions");
const deletion = parse("let object = {}; delete object.x;");
check(deletion.error === null, "C3 delete parse");
const deletionRealm = new Realm((_line) => {});
check(new Evaluator(deletionRealm).block(deletion.body, deletionRealm.global, UNDEFINED).type === "normal", "C3 delete success");
const consumerObject = consumerRealm.global.bindings.get("object");
check(consumerObject !== undefined && consumerObject.value.kind === "object"
    && consumerObject.value.object.getOwnProperty("") === undefined
    && consumerObject.value.object.getOwnProperty("1,2") === undefined, "C3 guest descriptors absent");
for (const values of [[], [num(1), num(2)]]) {
    const receiver = consumerRealm.createObject();
    const operand = obj(array(consumerRealm, values));
    const expectedKey = values.length === 0 ? "" : "1,2";
    put(receiver, expectedKey, num(42));
    const converted = toPropertyKey(operand, consumer.context, loc);
    if (converted.type === "throw") throw new Error("C3 key conversion");
    check(converted.value === expectedKey, "C3 exact deletion key");
    const removed = receiver.internalDelete(converted.value);
    check(removed.type === "normal" && removed.value && receiver.getOwnProperty(expectedKey) === undefined, "C3 internal deletion");
}
for (const length of [array(a, []), array(a, [num(2)])]) {
    const receiver = a.createObject();
    put(receiver, "length", obj(length));
    const completion = lengthOfArrayLike(receiver, active.context, loc);
    check(completion.type === "normal" && completion.value === (length.get("0", active.context, loc).kind === "undefined" ? 0 : 2), "C4");
}
for (const values of [[], [num(2)], [num(1), num(2)]]) {
    const target = array(a, [num(7), num(8), num(9)]);
    const completion = target.defineOwnProperty("length", { value: obj(array(a, values)) }, active.context, loc);
    if (values.length === 2) {
        check(completion.type === "throw" && completion.diagnostic.name === "RangeError" && completion.diagnostic.message === "invalid array length", "C5 invalid");
        check(sameValue(target.get("length", active.context, loc), num(3)) && sameValue(target.get("2", active.context, loc), num(9)), "C5 unchanged storage");
    } else {
        check(completion.type === "normal" && completion.value && sameValue(target.get("length", active.context, loc), num(values.length === 0 ? 0 : 2)), "C5 valid");
    }
}
const changingLength = a.createArray();
let conversions = 0;
put(changingLength, "join", fn(a, (_receiver, _args, _context, _at) => {
    conversions++;
    return normal(str(conversions === 1 ? "2" : "3"));
}));
const target = array(a, [num(7), num(8), num(9)]);
const invalid = target.defineOwnProperty("length", { value: obj(changingLength) }, active.context, loc);
check(invalid.type === "throw" && invalid.diagnostic.name === "RangeError" && invalid.diagnostic.message === "invalid array length"
    && conversions === 2 && sameValue(target.get("length", active.context, loc), num(3)) && sameValue(target.get("2", active.context, loc), num(9)), "C6 fresh conversions/no write");
const controls = new Realm((_line) => {});
const controlEvaluator = new Evaluator(controls);
const controlArray = obj(controls.createArray());
expect(controlEvaluator.call(controls.objectPrototype.get("valueOf", controlEvaluator.context, loc), controlArray, [], loc), controlArray, "C7 identity");
check(controlEvaluator.steps === 0, "C7 no ticks");
expect(toPrimitive(controlArray, "number", controlEvaluator.context, loc), str(""), "C7 Array default");
check(controlEvaluator.steps === 5, "C7 conversion steps");
expect(toPrimitive(obj(controls.createObject()), "default", controlEvaluator.context, loc), str("[object Object]"), "C8 Object");
expect(toPrimitive(obj(controls.functionPrototype), "default", controlEvaluator.context, loc), str("function () { [native code] }"), "C8 Function");
expect(toPrimitive(obj(controls.createNumberObject(2)), "default", controlEvaluator.context, loc), num(2), "C8 Number default");
expect(toPrimitive(obj(controls.createNumberObject(2)), "string", controlEvaluator.context, loc), str("2"), "C8 Number string");
for (const object of [new GuestObject(), ordinary]) error(toPrimitive(obj(object), "string", controlEvaluator.context, loc), "cannot convert object to primitive");
for (const object of [controls.createArray(), controls.createObject(), controls.createNumberObject(2)]) {
    check(toString(obj(object), loc, null).type === "throw" && toNumber(obj(object), loc, null).type === "throw", "C9 primitive-only converters");
}
console.log("array-string-conversion ok");
