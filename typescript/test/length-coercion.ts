import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { lengthOfArrayLike } from "../src/array-like.js";
import { mapObjectDefaultArray } from "../src/array-map.js";
import { GuestArray } from "../src/array-object.js";
import { toNumber, toString, toIntegerOrInfinity, toLength, type NumberCompletion } from "../src/conversion.js";
import { GuestObject, UNDEFINED, normal, failure, sameValue, type Builtin, type Completion, type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";
const loc: Location = { line: 14, column: 9 };
function check(ok: boolean, label: string): void {
    if (!ok) throw new Error(label);
}
function obj(object: GuestObject): Value {
    return { kind: "object", object };
}
function num(value: number): Value {
    return { kind: "number", value };
}
function put(object: GuestObject, key: string, value: Value): void {
    object.bootstrapDefine(key, { value: value, writable: true, enumerable: true, configurable: true });
}
function builtin(invoke: Builtin): Value {
    const object = new GuestObject();
    object.callable = { kind: "builtin", invoke };
    return obj(object);
}
function seed(active: Evaluator, key: string, value: Value): void {
    active.context.realm.global.bindings.set(key, { initialized: true, mutable: true, value });
}
function binding(active: Evaluator, key: string): Value {
    const entry = active.context.realm.global.bindings.get(key);
    if (entry === undefined) throw new Error(key);
    return entry.value;
}
function object(value: Value): GuestObject {
    if (value.kind !== "object") throw new Error("expected object");
    return value.object;
}
function run(active: Evaluator, source: string): Completion {
    const parsed = parse(source);
    if (parsed.error !== null) throw new Error(parsed.error.message);
    return active.block(parsed.body, active.context.realm.global, UNDEFINED);
}
function number(result: NumberCompletion, expected: number): void {
    check(result.type === "normal" && result.value === expected && (expected !== 0 || 1 / result.value === Infinity), "normalized length " + expected);
}
function error(result: NumberCompletion | Completion, name: string): void {
    check(result.type === "throw" && result.diagnostic.name === name, "expected " + name);
}
function mapped(result: ValueCompletion, length: number): GuestObject {
    if (result.type !== "normal") throw new Error("map threw");
    const value = object(result.value);
    check(value instanceof GuestArray && sameValue(value.get("length"), num(length)), "mapped length");
    return value;
}
const fixture = readFileSync("test/fixtures/length-coercion.js", "utf8");
function setup(): Evaluator {
    const active = new Evaluator(new Realm((_line) => {}), 100000, 12);
    const host = new GuestObject();
    seed(active, "host", obj(host));
    active.context.realm.registerBuiltin(host, "length", 1, (_receiver, args, context, at) => {
        const result = lengthOfArrayLike(object(args[0]), context, at);
        return result.type === "throw" ? result : normal(num(result.value));
    });
    active.context.realm.registerBuiltin(host, "map", 2, (_receiver, args, context, at) => mapObjectDefaultArray(object(args[0]), args[1], UNDEFINED, context, at));
    active.context.realm.registerBuiltin(host, "remove", 2, (_receiver, args, _context, _at) => {
        check(args[1].kind === "string", "delete key");
        if (args[1].kind === "string") object(args[0]).internalDelete(args[1].value);
        return normal();
    });
    put(host, "payload", obj(new GuestObject()));
    check(run(active, fixture).type === "normal", "runtime fixture setup");
    return active;
}
function input(length: Value): GuestObject {
    const value = new GuestObject();
    put(value, "length", length);
    return value;
}
const sentinel = failure("Sentinel", "length boundary", loc);
// Synthetic host observations test dispatch, not guest accessors or proxies.
class ObservedLength extends GuestObject {
    gets = 0;
    constructorReads = 0;
    internalGet(key: string, receiver: Value, at: Location): ValueCompletion {
        if (key === "length") {
            this.gets++;
            check(receiver.kind === "object" && receiver.object === this && at === loc, "length Get receiver/location");
        }
        if (key === "constructor") {
            this.constructorReads++;
            return sentinel;
        }
        return super.internalGet(key, receiver, at);
    }
}
// Primitive returns, object kinds, inheritance and both fallback routes use parsed methods.
const rows: {
    value: Value;
    expected: number;
}[] = [
    { value: UNDEFINED, expected: 0 }, { value: { kind: "null" }, expected: 0 },
    { value: { kind: "boolean", value: false }, expected: 0 }, { value: { kind: "boolean", value: true }, expected: 1 },
    { value: num(2.9), expected: 2 }, { value: num(-2.9), expected: 0 }, { value: num(-0), expected: 0 },
    { value: num(NaN), expected: 0 }, { value: num(Infinity), expected: 9007199254740991 }, { value: num(-Infinity), expected: 0 },
    { value: { kind: "string", value: " 4.9 " }, expected: 4 }, { value: { kind: "string", value: "" }, expected: 0 },
    { value: { kind: "string", value: "junk" }, expected: 0 },
];
for (const name of ["lengthValue", "arrayLengthValue", "functionLengthValue"]) {
    for (const inherited of [false, true]) {
        for (const mode of ["first", "noncallable", "object"]) {
            const active = setup();
            const value = binding(active, name);
            const target = object(value);
            const methods = inherited ? new GuestObject() : target;
            if (inherited) {
                target.internalDelete("valueOf");
                target.internalDelete("toString");
                target.setPrototypeOf(methods);
            }
            put(methods, "valueOf", mode === "noncallable" ? num(9) : binding(active, mode === "object" ? "objectResult" : "fallback"));
            put(methods, "toString", mode === "first" ? binding(active, "throwing") : binding(active, "fallback"));
            const source = new ObservedLength();
            put(source, "length", value);
            for (const row of rows) {
                seed(active, "returned", row.value);
                seed(active, "hits", num(0));
                const before = source.gets;
                number(lengthOfArrayLike(source, active.context, loc), row.expected);
                check(source.gets === before + 1 && sameValue(binding(active, "hits"), num(mode === "object" ? 2 : 1)), "one Get and effective hook");
            }
        }
    }
}
// Exact lookup/call/tick abrupt records and original Value receiver, no extra ticks.
class ObservedHook extends GuestObject {
    reads: string[] = [];
    original: Value = UNDEFINED;
    stop = "";
    internalGet(key: string, receiver: Value, at: Location): ValueCompletion {
        this.reads.push(key);
        check(receiver === this.original && at === loc, "hook original receiver/location");
        return key === this.stop ? sentinel : super.internalGet(key, receiver, at);
    }
}
for (const stop of ["", "get1", "get2", "call1", "call2", "tick1", "tick2"]) {
    const active = setup();
    const hook = new ObservedHook();
    hook.original = obj(hook);
    hook.stop = stop === "get1" ? "valueOf" : stop === "get2" ? "toString" : "";
    let calls = 0;
    let ticks = 0;
    const context: OperationContext = {
        realm: active.context.realm,
        tick: (_at) => {
            ticks++;
            return stop === "tick" + ticks ? sentinel : normal();
        },
        call: (callee, receiver, args, at) => active.context.call(callee, receiver, args, at),
    };
    for (const name of ["valueOf", "toString"]) {
        put(hook, name, builtin((receiver, args, _context, at) => {
            calls++;
            check(receiver === hook.original && args.length === 0 && at === loc, "hook call receiver/args/location");
            put(hook, "effect", num(calls));
            if (stop === "call" + calls) return sentinel;
            return normal(name === "valueOf" ? obj(new GuestObject()) : num(2.9));
        }));
    }
    const source = new ObservedLength();
    put(source, "length", hook.original);
    const result = lengthOfArrayLike(source, context, loc);
    if (stop === "") {
        number(result, 2);
    } else {
        check(result === sentinel, "exact abrupt " + stop);
    }
    const second = stop === "" || stop.endsWith("2");
    check(ticks === (second ? 2 : 1) && source.gets === 1, "exact ticks/Get");
    check(hook.reads.join(",") === (stop === "tick1" ? "" : second && stop !== "tick2" ? "valueOf,toString" : "valueOf"), "lookup prefix");
    check(calls === (stop === "tick1" || stop === "get1" ? 0 : stop === "" || stop === "call2" ? 2 : 1), "call prefix");
    if (calls > 0) check(sameValue(hook.getOwnProperty("effect")!.value, num(calls)), "effects survive failure");
    check(active.calls === 0, "abrupt call unwind");
}
for (const bothObjects of [false, true]) {
    const active = setup();
    const hook = new GuestObject();
    if (bothObjects) {
        put(hook, "valueOf", binding(active, "objectResult"));
        put(hook, "toString", binding(active, "objectResult"));
    }
    const result = lengthOfArrayLike(input(obj(hook)), active.context, loc);
    check(result.type === "throw" && result.diagnostic.message === "cannot convert object to primitive" && result.diagnostic.loc === loc, "located final failure");
}
// The second lookup is fresh on the saved length object after first-hook mutation.
const fresh = setup();
const savedHook = new GuestObject();
const replacedSource = input(obj(savedHook));
let oldCalls = 0;
put(savedHook, "toString", builtin((_receiver, _args, _context, _at) => {
    oldCalls++;
    return normal(num(99));
}));
put(savedHook, "valueOf", builtin((_receiver, _args, _context, _at) => {
    put(replacedSource, "length", num(100));
    put(savedHook, "toString", binding(fresh, "fallback"));
    return normal(obj(new GuestObject()));
}));
number(lengthOfArrayLike(replacedSource, fresh.context, loc), 2);
check(oldCalls === 0 && sameValue(replacedSource.get("length"), num(100)) && sameValue(binding(fresh, "hits"), num(1)), "saved length and fresh second method");
// F12/F14: saved length survives binding/property replacement; elements remain live.
const mutation = setup();
const source = new ObservedLength();
const saved = binding(mutation, "lengthValue");
put(object(saved), "valueOf", binding(mutation, "mutate"));
put(source, "length", saved);
put(source, "1", num(11));
const parent = new GuestObject();
put(parent, "2", num(20));
source.setPrototypeOf(parent);
seed(mutation, "input", obj(source));
const changed = mapped(mapObjectDefaultArray(source, binding(mutation, "identity"), UNDEFINED, mutation.context, loc), 3);
check(sameValue(changed.get("0"), num(10)) && changed.getOwnProperty("1") === undefined && sameValue(changed.get("2"), num(20)) && changed.getOwnProperty("3") === undefined, "live elements/holes, saved bound");
check(source.gets === 1 && source.constructorReads === 0 && sameValue(binding(mutation, "hits"), num(3)) && binding(mutation, "lengthValue") !== saved, "saved value, generic skips changed constructor");
// F13 and allocation ordering: conversion errors precede invalid callbacks.
for (const succeeds of [false, true]) {
    const active = setup();
    const source = new ObservedLength();
    const hook = new GuestObject();
    put(hook, "valueOf", builtin((_receiver, _args, _context, _at) => {
        put(source, "effect", num(1));
        return succeeds ? normal(num(Infinity)) : sentinel;
    }));
    put(source, "length", obj(hook));
    const result = mapObjectDefaultArray(source, UNDEFINED, UNDEFINED, active.context, loc);
    if (succeeds) {
        check(result.type === "throw" && result.diagnostic.message === "map callback is not callable", "callback after conversion before allocation");
    } else {
        check(result === sentinel, "length throw beats callback");
    }
    check(source.gets === 1 && source.constructorReads === 0 && sameValue(source.get("effect"), num(1)), "failure retains mutation");
    if (succeeds) error(mapObjectDefaultArray(source, binding(active, "identity"), UNDEFINED, active.context, loc), "RangeError");
}
// Actual array storage remains numeric; only this observer synthesizes object Get.
class ArrayObserver extends GuestArray {
    lengthValue: Value = UNDEFINED;
    trace: string[] = [];
    internalGet(key: string, receiver: Value, at: Location): ValueCompletion {
        this.trace.push(key);
        return key === "length" ? normal(this.lengthValue) : super.internalGet(key, receiver, at);
    }
}
for (const invalidCallback of [false, true]) {
    const active = setup();
    const array = new ArrayObserver();
    const hook = new GuestObject();
    array.lengthValue = obj(hook);
    put(hook, "valueOf", builtin((_receiver, _args, _context, _at) => {
        array.trace.push("hook");
        put(array, "constructor", num(7));
        return normal(num(0));
    }));
    const result = mapObjectDefaultArray(array, invalidCallback ? UNDEFINED : binding(active, "identity"), UNDEFINED, active.context, loc);
    check(result.type === "throw" && result.diagnostic.message === (invalidCallback ? "map callback is not callable" : "unsupported map constructor/species"), "array constructor after length/callback");
    check(array.trace.join(",") === (invalidCallback ? "length,hook" : "length,hook,constructor") && sameValue(array.getOwnProperty("length")!.value, num(0)), "observer ordering; numeric storage");
}
// Guest nested length and map callbacks retain the active evaluator's budgets.
const nested = setup();
const inner = input(binding(nested, "lengthValue"));
put(inner, "0", num(9));
seed(nested, "inner", obj(inner));
const outerHook = new GuestObject();
put(outerHook, "valueOf", binding(nested, "nestedLength"));
number(lengthOfArrayLike(input(obj(outerHook)), nested.context, loc), 2);
const outer = input(num(1));
put(outer, "0", num(8));
check(sameValue(mapped(mapObjectDefaultArray(outer, binding(nested, "nestedMap"), UNDEFINED, nested.context, loc), 1).get("0"), num(2)), "guest nested map");
check(nested.steps > 0 && nested.calls === 0, "shared nested ticks/unwind");
for (const method of ["loop", "recursive"]) {
    const initial = setup();
    const active = new Evaluator(initial.context.realm, 150, 5);
    const hook = new GuestObject();
    put(hook, "valueOf", binding(active, method));
    const source = input(obj(hook));
    seed(active, "input", obj(source));
    const result = lengthOfArrayLike(source, active.context, loc);
    error(result, "RangeError");
    const expectedMessage = method === "loop"
        ? "execution step limit exceeded"
        : "call depth limit exceeded";
    check(result.type === "throw" && result.diagnostic.message === expectedMessage, "specific runaway limit " + method);
    check(active.calls === 0 && active.depth === 0 && active.steps > 0, "runaway unwind " + method);
}
// Huge sparse maps spend bounded ticks after their single conversion.
const sparseActive = setup();
const sparse = input(obj(new GuestObject()));
put(object(sparse.get("length")), "valueOf", builtin((_receiver, _args, _context, _at) => normal(num(4294967295))));
const budget = new Evaluator(sparseActive.context.realm, 3);
error(mapObjectDefaultArray(sparse, binding(budget, "identity"), UNDEFINED, budget.context, loc), "RangeError");
check(budget.steps === 4 && budget.calls === 0, "one hook tick plus bounded sparse scan");
// Direct converters remain zero-hook boundaries; semantic storage converts twice.
const excluded = setup();
const value = binding(excluded, "lengthValue");
error(toNumber(value, loc), "TypeError");
const stringResult = toString(value, loc);
check(stringResult.type === "throw", "direct string boundary");
error(toIntegerOrInfinity(value, loc), "TypeError");
error(toLength(value, loc), "TypeError");
check(sameValue(binding(excluded, "hits"), num(0)), "direct converters invoke no hooks");
const storage = new GuestArray();
error(storage.set("length", value, excluded.context, loc), "RangeError");
check(sameValue(binding(excluded, "hits"), num(2)), "constant 2.9 converts twice before rejection");
seed(excluded, "returned", num(2));
seed(excluded, "hits", num(0));
const assigned = storage.set("length", value, excluded.context, loc);
check(assigned.type === "normal" && assigned.value === value, "storage assignment original RHS");
const defined = storage.defineOwnProperty("length", { value }, excluded.context, loc);
check(defined.type === "normal" && defined.value, "array define success");
check(sameValue(storage.get("length"), num(2)) && sameValue(binding(excluded, "hits"), num(4)), "storage calls each convert twice");
class ForbiddenHooks extends GuestObject {
    reads = 0;
    internalGet(_key: string, _receiver: Value, _at: Location): ValueCompletion {
        this.reads++;
        return sentinel;
    }
}
const forbidden = new ForbiddenHooks();
const forbiddenValue = obj(forbidden);
error(toNumber(forbiddenValue, loc), "TypeError");
check(toString(forbiddenValue, loc).type === "throw", "string zero-read boundary");
error(toIntegerOrInfinity(forbiddenValue, loc), "TypeError");
error(toLength(forbiddenValue, loc), "TypeError");
check(forbidden.reads === 0, "direct converters perform zero reads");
check(storage.set("length", forbiddenValue, excluded.context, loc) === sentinel, "Set exact Get sentinel");
check(forbidden.reads === 1, "Set one lookup");
check(storage.defineOwnProperty("length", { value: forbiddenValue }, excluded.context, loc) === sentinel, "Define exact Get sentinel");
check(forbidden.reads === 2, "two semantic lookups total");
// Guest throw identity is captured at the bridge; host faults still unwind calls.
const exact = setup();
const hook = new GuestObject();
let captured: ValueCompletion = normal();
put(hook, "valueOf", builtin((receiver, args, context, at) => {
    captured = context.call(binding(exact, "throwing"), receiver, args, at);
    return captured;
}));
const exactResult = lengthOfArrayLike(input(obj(hook)), exact.context, loc);
check(exactResult.type === "throw" && captured.type === "throw" && exactResult === captured && captured.value === object(binding(exact, "host")).get("payload"), "exact guest throw");
for (const mode of ["fault", "break"]) {
    const fault = new Error("length host fault");
    put(hook, "valueOf", builtin((_receiver, _args, _context, _at): Completion => {
        if (mode === "fault") throw fault;
        return { type: "break", value: UNDEFINED };
    }));
    let escaped = false;
    try {
        lengthOfArrayLike(input(obj(hook)), exact.context, loc);
    } catch (caught) {
        escaped = caught instanceof Error && (mode === "fault"
            ? caught === fault
            : caught.message.includes("invalid completion"));
    }
    check(escaped && exact.calls === 0, "host fault cleanup");
}
const realmA = setup();
const realmB = setup();
number(lengthOfArrayLike(input(binding(realmA, "lengthValue")), realmA.context, loc), 2);
number(lengthOfArrayLike(input(binding(realmA, "lengthValue")), realmA.context, loc), 2);
number(lengthOfArrayLike(input(binding(realmB, "lengthValue")), realmB.context, loc), 2);
check(sameValue(binding(realmA, "hits"), num(2)) && sameValue(binding(realmB, "hits"), num(1)) && realmA.context.realm !== realmB.context.realm, "independent realms/counters");
console.log("length coercion passed");

