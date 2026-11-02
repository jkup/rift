import { wellKnownToPrimitive } from "../src/symbols.js";
import type { PropertyKey } from "../src/runtime.js";
import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { toPropertyKey, toString, toNumber } from "../src/conversion.js";
import { GuestArray } from "../src/array-object.js";
import { GuestObject, UNDEFINED, normal, getValue, putValue, type OperationContext, type Builtin, type Completion, type Value, type ValueCompletion, type ThrowCompletion } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function str(value: string): Value { return { kind: "string", value }; }
function num(value: number): Value { return { kind: "number", value }; }
function builtin(realm: Realm, invoke: Builtin): Value {
    const object = new GuestObject(null, false, { kind: "builtin", realm, invoke });
    return obj(object);
}
function seed(active: Evaluator, name: string, value: Value): void {
    active.context.realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function binding(active: Evaluator, name: string): Value {
    const entry = active.context.realm.global.bindings.get(name);
    if (entry === undefined) throw new Error("missing " + name);
    return entry.value;
}
function run(active: Evaluator, source: string): Completion {
    const parsed = parse(source);
    if (parsed.error !== null) throw new Error(parsed.error.message);
    return active.block(parsed.body, active.context.realm.global, UNDEFINED);
}
function payload(value: Value): string | number | boolean {
    if (value.kind === "string" || value.kind === "number" || value.kind === "boolean") return value.value;
    throw new Error("expected scalar");
}
const fixture = readFileSync("test/fixtures/key-coercion.js", "utf8");
function setup(): Evaluator {
    const active = new Evaluator(new Realm((_line) => {}), 100000, 12);
    check(run(active, fixture).type === "normal", "runtime fixture");
    return active;
}
const loc: Location = { line: 19, column: 7 };
const sentinel: ThrowCompletion = { type: "throw", value: obj(new GuestObject()), diagnostic: { name: "RangeError", phase: "runtime", message: "key sentinel", loc } };
// Synthetic Get/Set observations are host dispatch tests, not accessors/proxies.
class Observed extends GuestObject {
    active: Evaluator;
    stop = "";
    original: Value = UNDEFINED;
    constructor(active: Evaluator) { super(); this.active = active; }
    mark(letter: string): void { seed(this.active, "trace", str(payload(binding(this.active, "trace")) + letter)); }
    internalGet(key: PropertyKey, receiver: Value, location: Location): ValueCompletion {
        this.mark("G");
        check(receiver === this.original, "original base Get receiver");
        return this.stop === "G" ? sentinel : super.internalGet(key, receiver, location);
    }
    set(key: PropertyKey, value: Value, context: OperationContext, location: Location): Completion {
        check(context === this.active.context, "Set active context identity");
        this.mark("S");
        return this.stop === "S" ? sentinel : super.set(key, value, context, location);
    }
}
for (const path of ["read", "write", "call"]) {
    for (const stop of ["", "B", "K", "R", "C", "G", "S", "A", "M"]) {
        if ((stop === "R" || stop === "S") && path !== "write") continue;
        if ((stop === "A" || stop === "M") && path !== "call") continue;
        if (stop === "G" && path === "write") continue;
        const active = setup();
        const target = new Observed(active);
        target.original = obj(target);
        target.stop = stop;
        seed(active, "target", target.original);
        const key = binding(active, "key");
        if (key.kind !== "object") throw new Error("key");
        key.object.bootstrapDefine("toString", { value: builtin(active.context.realm, (receiver, args, context, _location) => {
            target.mark("C");
            check(receiver === key && args.length === 0 && context === active.context, "original key/context/zero args");
            return stop === "C" ? sentinel : normal(str("x"));
        }), writable: true, enumerable: true, configurable: true });
        const rhs = obj(new GuestObject());
        for (const stage of ["B", "K", "R", "A"]) {
            const name = stage === "B" ? "base" : stage === "K" ? "keyExpression" : stage === "R" ? "rhs" : "argument";
            seed(active, name, builtin(active.context.realm, (_receiver, _args, _context, _location) => {
                target.mark(stage);
                return stop === stage ? sentinel : normal(stage === "B" ? target.original : stage === "K" ? key : rhs);
            }));
        }
        target.bootstrapDefine("x", { value: builtin(active.context.realm, (receiver, args, _context, _location) => {
            target.mark("M");
            check(receiver === target.original && args.length === 2 && args[0] === rhs && args[1] === rhs, "method receiver/args");
            return stop === "M" ? sentinel : normal(receiver);
        }), writable: true, enumerable: true, configurable: true });
        const source = path === "write" ? "let result = base()[keyExpression()] = rhs();" : path === "call" ? "let result = base()[keyExpression()](argument(), argument());" : "let result = base()[keyExpression()];";
        const result = run(active, source);
        const full = path === "write" ? "BKRCS" : path === "call" ? "BKCGAAM" : "BKCG";
        check(payload(binding(active, "trace")) === (stop === "" ? full : full.slice(0, full.indexOf(stop) + 1)), "exact reference order " + path + stop);
        if (stop !== "") check(result === sentinel, "exact abrupt record " + stop);
        else {
            check(result.type === "normal", "successful reference");
            if (path === "write") check(binding(active, "result") === rhs && target.getOwnProperty("x")?.value === rhs, "RHS identity");
        }
        check(active.calls === 0 && active.depth === 0, "reference unwind");
    }
}
// Saved base/key survive RHS binding replacement; saved method mutation is live.
const capture = setup();
check(run(capture, "let oldBase = target; let oldKey = key; function replace() { trace = trace + 'R'; oldKey.toString = function() { trace = trace + 'C'; return 'y'; }; target = {}; key = {}; return 11; } let assigned = base()[keyExpression()] = replace();").type === "normal", "capture write");
const oldBase = binding(capture, "oldBase");
const newBase = binding(capture, "target");
check(oldBase.kind === "object" && newBase.kind === "object" && payload(oldBase.object.get("y")) === 11 && newBase.object.getOwnProperty("y") === undefined && payload(binding(capture, "trace")) === "BKRC", "saved references and delayed lookup");
// Conversion itself mutates the base before its Get.
check(run(capture, "oldKey.toString = function() { oldBase.z = 12; return 'z'; }; let mutated = oldBase[oldKey];").type === "normal" && payload(binding(capture, "mutated")) === 12, "conversion mutation visible to Get");
const active = setup();
const primitives: { value: Value; key: string }[] = [
    { value: UNDEFINED, key: "undefined" }, { value: { kind: "null" }, key: "null" },
    { value: { kind: "boolean", value: true }, key: "true" }, { value: { kind: "boolean", value: false }, key: "false" },
    { value: num(-0), key: "0" }, { value: num(NaN), key: "NaN" }, { value: num(Infinity), key: "Infinity" },
    { value: num(-Infinity), key: "-Infinity" }, { value: num(1e21), key: "1e+21" },
    { value: str(""), key: "" }, { value: str("a\0\ud800\udfff"), key: "a\0\ud800\udfff" },
];
for (const kind of ["ordinary", "array", "function"]) {
    for (const inherited of [false, true]) {
        for (const fallback of ["first", "noncallable", "object"]) {
            for (const row of primitives) {
                const object = kind === "array" ? new GuestArray() : new GuestObject(null, false,
            kind === "function" ? { kind: "builtin", realm: active.context.realm, invoke: (_r, _a, _c, _l): Completion => { throw new Error("key called directly"); } } : null);
                const key = obj(object);
                const owner = inherited ? new GuestObject() : object;
                if (inherited) object.setPrototypeOf(owner);
                let calls = 0;
                const method = builtin(active.context.realm, (receiver, args, context, _location) => {
                    check(receiver === key && args.length === 0 && context === active.context, "inherited original key receiver");
                    calls++;
                    return normal(row.value);
                });
                owner.bootstrapDefine("toString", { value: fallback === "first" ? method : fallback === "noncallable" ? num(8) : builtin(active.context.realm, (_r, _a, _c, _l) => normal(key)), writable: true, enumerable: true, configurable: true });
                owner.bootstrapDefine("valueOf", { value: fallback === "first" ? UNDEFINED : method, writable: true, enumerable: true, configurable: true });
                const result = toPropertyKey(key, active.context, loc);
                check(result.type === "normal" && result.value === row.key && calls === 1, "primitive spelling/hint/fallback " + kind);
                const target = obj(new GuestObject());
                const ref = { kind: "property" as const, base: target, key, loc };
                const rhs = obj(new GuestObject());
                check(putValue(ref, rhs, active.context, loc).type === "normal", "direct write");
                const read = getValue(ref, active.context, loc);
                check(read.type === "normal" && read.value === rhs && calls === 3, "direct read once per consumption");
            }
        }
    }
}
for (const both of [false, true]) {
    const object = new GuestObject();
    const key = obj(object);
    if (both) for (const name of ["toString", "valueOf"]) object.bootstrapDefine(name, { value: builtin(active.context.realm, (_r, _a, _c, _l) => normal(key)), writable: true, enumerable: true, configurable: true });
    const result = toPropertyKey(key, active.context, loc);
    check(result.type === "throw" && result.diagnostic.message === "cannot convert object to primitive" && result.diagnostic.loc === loc, "located no primitive result");
}
class ThrowingKey extends GuestObject {
    stop = "toString";
    reads = "";
    internalGet(key: PropertyKey, receiver: Value, location: Location): ValueCompletion {
        if (key === wellKnownToPrimitive) return normal(UNDEFINED);
        this.reads += key + ";";
        return key === this.stop ? sentinel : super.internalGet(key, receiver, location);
    }
}
for (const stop of ["toString", "valueOf"]) {
    const object = new ThrowingKey(); object.stop = stop;
    check(toPropertyKey(obj(object), active.context, loc) === sentinel && object.reads === (stop === "toString" ? "toString;" : "toString;valueOf;"), "exact first/second Get throw");
    const callKey = new GuestObject();
    callKey.bootstrapDefine(stop, { value: builtin(active.context.realm, (_r, _a, _c, _l) => sentinel), writable: true, enumerable: true, configurable: true });
    check(toPropertyKey(obj(callKey), active.context, loc) === sentinel, "exact first/second call throw");
}
// Active ticks propagate unchanged, before either candidate lookup.
for (const second of [false, true]) {
    const object = new ThrowingKey(); object.stop = "never";
    let ticks = 0;
    const context = { realm: active.context.realm, call: active.context.call, tick: (_location: Location): ValueCompletion => { ticks++; return ticks === (second ? 3 : 2) ? sentinel : normal(); } };
    check(toPropertyKey(obj(object), context, loc) === sentinel && object.reads === (second ? "toString;" : ""), "exact tick throw");
}
// Object keys may name array indices/length; length values remain primitive-only.
const arrays = setup();
check(run(arrays, "let a = []; let index = { toString: function() { return 2; } }; a[index] = 8; let lengthKey = { toString: function() { return 'length'; } }; a[lengthKey] = 2; let nonindex = { toString: function() { return '01'; } }; a[nonindex] = 9;").type === "normal", "array keys");
const array = binding(arrays, "a");
check(array.kind === "object" && payload(array.object.get("length")) === 2 && array.object.getOwnProperty("2") === undefined && payload(array.object.get("01")) === 9, "index/length/nonindex distinctions");
check(run(arrays, "a[lengthKey] = key;").type === "throw" && payload(binding(arrays, "trace")) === "", "array length value skips hooks");
const nested = setup();
check(run(nested, "let answer = target[nested];").type === "normal" && payload(binding(nested, "trace")) === "C", "nested parsed key coercion");
for (const name of ["looping", "recursive"]) {
    const limited = setup(); limited.maxSteps = limited.steps + 250;
    const result = run(limited, "target[" + name + "];");
    check(result.type === "throw" && result.diagnostic.name === "RangeError" && limited.calls === 0 && limited.depth === 0, "shared runaway bounds " + name);
}
for (const mode of ["host", "break", "continue"] as const) {
    const key = new GuestObject();
    key.bootstrapDefine("toString", { value: builtin(active.context.realm, (_r, _a, _c, _l): Completion => { if (mode === "host") throw new Error("host fault"); return { type: mode, value: UNDEFINED }; }), writable: true, enumerable: true, configurable: true });
    let escaped = false;
    try { toPropertyKey(obj(key), active.context, loc); } catch { escaped = true; }
    check(escaped && active.calls === 0, "call cleanup " + mode);
}
const first = setup(); const second = setup();
check(run(first, "target[key]; target[key];").type === "normal" && payload(binding(first, "trace")) === "CC" && payload(binding(second, "trace")) === "", "realm state isolation");
const steps = first.steps;
check(run(first, "target[key];").type === "normal" && first.steps > steps && payload(binding(first, "trace")) === "CCC", "retained monotonic context");
const boundary = binding(second, "key");
check(toString(boundary, loc).type === "throw" && toNumber(boundary, loc).type === "throw" && payload(binding(second, "trace")) === "", "direct converters stay primitive-only");
// A fresh fallback lookup observes mutation by the first method.
const mutation = setup();
check(run(mutation, "key.toString = function() { key.valueOf = function() { return 'x'; }; return {}; }; let changed = target[key];").type === "normal" && payload(binding(mutation, "changed")) === 7, "fresh fallback after mutation");
for (const closed of [false, true]) {
    const target = new GuestObject();
    if (closed) target.preventExtensions();
    else target.bootstrapDefine("x", { value: num(4), writable: false, enumerable: true, configurable: true });
    const key = binding(second, "key");
    const result = putValue({ kind: "property", base: obj(target), key, loc }, num(9), second.context, loc);
    check(result.type === "throw" && result.diagnostic.message === "property is not writable: x" && result.diagnostic.loc === loc, "object key strict false Set");
    check(closed ? target.getOwnProperty("x") === undefined : payload(target.get("x")) === 4, "rejected write preserves state");
}
// Invalid bases reject before a key lookup in direct reference APIs too.
for (const base of [UNDEFINED, { kind: "null" } as Value, num(1), str("text"), { kind: "boolean", value: false } as Value]) {
    const key = new ThrowingKey();
    const ref = { kind: "property" as const, base, key: obj(key), loc };
    for (const result of [getValue(ref, active.context, loc), putValue(ref, num(3), active.context, loc)]) {
        check(result.type === "throw" && result.diagnostic.message === "property base must be an object" && result.diagnostic.loc === loc && key.reads === "", "direct invalid base precedes coercion");
    }
}
console.log("key coercion passed");

