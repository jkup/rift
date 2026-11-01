import { readFileSync } from "node:fs";
import { mapObjectDefaultArray } from "../src/array-map.js";
import { GuestArray } from "../src/array-object.js";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, failure, normal, sameValue, type Builtin, type Completion, type InternalBooleanCompletion, type OperationContext, type Value, type ValueCompletion } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const loc: Location = { line: 71, column: 9 };
const sentinel = failure("Sentinel", "original", loc);
const trace: string[] = [];
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function num(value: number): Value { return { kind: "number", value }; }
function put(o: GuestObject, k: string, v: Value): void { o.define(k, v, true, true, true); }
function builtin(invoke: Builtin): Value { const o = new GuestObject(); o.callable = { kind: "builtin", invoke }; return obj(o); }
function error(c: Completion, name: string, at: Location = loc): void {
    check(c.type === "throw" && c.diagnostic.phase === "runtime" && c.diagnostic.name === name && c.diagnostic.loc === at, "error phase/name/location " + name);
}
function result(c: Completion, length: number): GuestObject {
    if (c.type !== "normal" || c.value.kind !== "object") throw new Error("expected map result");
    const o = c.value.object;
    const d = o.getOwnProperty("length");
    check(o instanceof GuestArray && d !== undefined && sameValue(d.value, num(length)) && d.writable && !d.enumerable && !d.configurable, "result array length/flags");
    return o;
}
function element(o: GuestObject, key: string, value: Value): void {
    const d = o.getOwnProperty(key);
    check(d !== undefined && sameValue(d.value, value) && d.writable && d.enumerable && d.configurable, "own element " + key);
}
function hole(o: GuestObject, key: string): void { check(o.getOwnProperty(key) === undefined, "hole " + key); }
class Traced extends GuestObject {
    failGet = ""; failHas = "";
    internalGet(key: string, receiver: Value, at: Location): ValueCompletion {
        trace.push("Get " + key);
        check(receiver.kind === "object" && receiver.object === this && at === loc, "Get receiver/location");
        return key === this.failGet ? sentinel : super.internalGet(key, receiver, at);
    }
    internalHasProperty(key: string, at: Location): InternalBooleanCompletion {
        trace.push("Has " + key);
        check(at === loc, "Has location");
        return key === this.failHas ? sentinel : super.internalHasProperty(key, at);
    }
}
class TracedArray extends GuestArray {
    failConstructor = false;
    internalGet(key: string, receiver: Value, at: Location): ValueCompletion {
        trace.push("Get " + key);
        check(receiver.kind === "object" && receiver.object === this && at === loc, "array receiver/location");
        return key === "constructor" && this.failConstructor ? sentinel : super.internalGet(key, receiver, at);
    }
}
function traceIs(expected: string): void { check(trace.join(",") === expected, "trace: " + trace.join(",") + " expected " + expected); trace.length = 0; }
const fault = new Error("host fault");
let outputFault = false;
const realm = new Realm((_line) => { if (outputFault) throw fault; });
const host = new GuestObject();
realm.global.bindings.set("host", { initialized: true, mutable: true, value: obj(host) });
const contexts: OperationContext[] = [];
const adapter = realm.registerBuiltin(host, "__testMapObjectDefaultArray", (_receiver, args, context, at) => {
    const input = args[0] ?? UNDEFINED;
    if (input.kind !== "object") return failure("TypeError", "object-only test map entry", at);
    return mapObjectDefaultArray(input.object, args[1] ?? UNDEFINED, args[2] ?? UNDEFINED, context, at);
});
function program(source: string, e: Evaluator): Completion { const p = parse(source); check(p.error === null, "fixture parse"); return e.block(p.body, realm.global, UNDEFINED); }
const setup = new Evaluator(realm);
check(program(readFileSync("test/fixtures/array-map/callbacks.js", "utf8"), setup).type === "normal", "fixture setup");
function binding(name: string): Value { const b = realm.global.bindings.get(name); if (b === undefined) throw new Error(name); return b.value; }
const identity = binding("identity");
function map(o: GuestObject, cb: Value = identity, receiver: Value = UNDEFINED, e: Evaluator = new Evaluator(realm)): ValueCompletion { return e.call(adapter, UNDEFINED, [obj(o), cb, receiver], loc); }
function ordinary(length: Value): GuestObject { const o = new GuestObject(); put(o, "length", length); return o; }
for (const primitive of [UNDEFINED, { kind: "null" } as const, num(1), { kind: "boolean", value: true } as const, { kind: "string", value: "abc" } as const]) error(setup.call(adapter, UNDEFINED, [primitive, identity], loc), "TypeError");
error(setup.call(adapter, UNDEFINED, [], loc), "TypeError");
const t = new Traced(); t.failGet = "length";
check(map(t, UNDEFINED) === sentinel, "length exact throw"); traceIs("Get length");
t.failGet = "";
for (const length of [obj(new GuestObject()), UNDEFINED, num(-1), num(NaN), { kind: "string", value: "0" } as const]) {
    put(t, "length", length); error(map(t, UNDEFINED), "TypeError"); traceIs("Get length");
}
put(t, "length", { kind: "string", value: "2.9" }); put(t, "0", num(4)); put(t, "1", num(5)); put(t, "2", num(6));
const doubled = result(map(t, binding("double")), 2); element(doubled, "0", num(8)); element(doubled, "1", num(10)); hole(doubled, "2"); traceIs("Get length,Has 0,Get 0,Has 1,Get 1");
const zero = new Traced(); put(zero, "length", num(0)); const ze = new Evaluator(realm, 0); const z1 = result(map(zero, identity, UNDEFINED, ze), 0); traceIs("Get length"); const z2 = result(map(zero), 0); traceIs("Get length"); check(z1 !== z2 && ze.steps === 0, "fresh empty/no ticks");
const generic = new Traced(); put(generic, "length", num(1)); put(generic, "constructor", num(7)); result(map(generic), 1); traceIs("Get length,Has 0");
for (const inherited of [false, true]) { const a = new TracedArray(); if (inherited) { const p = new GuestObject(); put(p, "constructor", UNDEFINED); a.setPrototypeOf(p); } else put(a, "constructor", UNDEFINED); result(map(a), 0); traceIs("Get length,Get constructor"); }
const a = new TracedArray(); a.failConstructor = true; error(map(a, UNDEFINED), "TypeError"); traceIs("Get length"); check(map(a) === sentinel, "constructor exact throw"); traceIs("Get length,Get constructor"); a.failConstructor = false;
for (const ctor of [{ kind: "null" } as const, num(7), obj(new Traced())]) { put(a, "constructor", ctor); error(map(a), "TypeError"); traceIs("Get length,Get constructor"); }
for (const length of [4294967296, Infinity]) { put(generic, "length", num(length)); error(map(generic), "RangeError"); traceIs("Get length"); error(map(generic, UNDEFINED), "TypeError"); traceIs("Get length"); }
const huge = new Traced(); put(huge, "length", num(4294967295)); const budget = new Evaluator(realm, 3); error(map(huge, identity, UNDEFINED, budget), "RangeError"); traceIs("Get length,Has 0,Has 1,Has 2"); check(budget.steps === 4 && budget.calls === 0, "huge budget");
const sparse = ordinary(num(3)); put(sparse, "0", UNDEFINED); const proto = new GuestObject(); put(proto, "2", num(7)); sparse.setPrototypeOf(proto);
let visits = 0;
const observe = builtin((_receiver, args, _context, at) => { check(at === loc && args.length === 3 && args[1].kind === "number" && args[1].value === (visits === 0 ? 0 : 2) && args[2].kind === "object" && args[2].object === sparse, "sparse args"); visits++; return normal(args[0]); });
const sr = result(map(sparse, observe), 3); element(sr, "0", UNDEFINED); hole(sr, "1"); element(sr, "2", num(7)); check(visits === 2, "two sparse calls");
const trailing = ordinary(num(3)); put(trailing, "0", num(1)); const tr = result(map(trailing, binding("empty")), 3); element(tr, "0", UNDEFINED); hole(tr, "1"); hole(tr, "2");
const mutated = ordinary(num(3)); put(mutated, "0", num(1)); put(mutated, "1", num(2)); const mr = result(map(mutated, binding("mutate")), 3); element(mr, "0", num(1)); element(mr, "1", num(20)); element(mr, "2", num(30)); hole(mr, "3");
for (const inherited of [false, true]) {
    const d = ordinary(num(2)); put(d, "0", num(1)); put(d, "1", num(2)); if (inherited) { const p = new GuestObject(); put(p, "1", num(9)); d.setPrototypeOf(p); }
    const deleting = builtin((_receiver, args, _context, _at) => { if (sameValue(args[1], num(0))) { const deleted = d.internalDelete("1"); check(deleted.type === "normal" && deleted.value, "delete"); } return normal(args[0]); });
    const dr = result(map(d, deleting), 2); if (inherited) element(dr, "1", num(9)); else hole(dr, "1");
}
const shrinking = new GuestArray(); put(shrinking, "0", num(1)); put(shrinking, "1", num(2)); put(shrinking, "2", num(3)); shrinking.setPrototypeOf(proto); const shr = result(map(shrinking, binding("shrink")), 3); hole(shr, "1"); element(shr, "2", num(7)); check(sameValue(shrinking.get("length"), num(1)), "shrink source");
const one = ordinary(num(1)); put(one, "0", obj(new GuestObject()));
for (const receiver of [obj(new GuestObject()), num(4), { kind: "null" } as const, UNDEFINED]) element(result(map(one, binding("receiver"), receiver), 1), "0", receiver);
element(result(setup.call(adapter, UNDEFINED, [obj(one), binding("receiver")], loc), 1), "0", UNDEFINED);
let observed = 0;
realm.registerBuiltin(host, "observe", (_receiver, args, context, _at) => { observed++; check(args[0] === one.get("0") && sameValue(args[1], num(0)) && args[2].kind === "object" && args[2].object === one && args[3] === UNDEFINED && sameValue(args[4], num(observed)), "guest retained closure args"); contexts.push(context); return normal(); });
const first = new Evaluator(realm); const second = new Evaluator(realm); const r1 = result(map(one, binding("saved"), UNDEFINED, first), 1); const r2 = result(map(one, binding("saved"), UNDEFINED, second), 1); element(r1, "0", one.get("0")); check(r1 !== r2 && observed === 2 && contexts[0] === first.context && contexts[1] === second.context, "current run retained closure");
put(r1, "0", num(99)); element(r2, "0", one.get("0"));
const throwing = new Traced(); put(throwing, "length", num(3)); put(throwing, "0", num(10)); put(throwing, "1", num(11)); put(throwing, "2", num(12));
let effects = 0;
const tracedCallback = builtin((_receiver, args, _context, _at) => { trace.push("Call"); effects++; return normal(args[0]); });
for (const boundary of ["Has", "Get"]) { effects = 0; throwing.failHas = boundary === "Has" ? "1" : ""; throwing.failGet = boundary === "Get" ? "1" : ""; const c = map(throwing, tracedCallback); check(c === sentinel && c.value === sentinel.value && c.diagnostic === sentinel.diagnostic && effects === 1, "exact boundary abrupt"); traceIs("Get length,Has 0,Get 0,Call,Has 1" + (boundary === "Get" ? ",Get 1" : "")); }
throwing.failHas = ""; throwing.failGet = "";
put(host, "sentinel", obj(new GuestObject()));
realm.registerBuiltin(host, "effect", (_receiver, args, _context, _at) => { trace.push("Effect " + (args[0].kind === "number" ? String(args[0].value) : "bad")); return normal(); });
const thrown = map(throwing, binding("throwing")); check(thrown.type === "throw" && thrown.value === host.get("sentinel") && thrown.diagnostic.phase === "runtime" && thrown.diagnostic.name === "Uncaught" && thrown.diagnostic.loc.line === 9 && thrown.diagnostic.loc.column === 61, "guest throw value/location"); traceIs("Get length,Has 0,Get 0,Effect 0,Has 1,Get 1,Effect 1");
const bridge = builtin((_receiver, _args, _context, _at) => sentinel); check(map(one, bridge) === sentinel, "callback exact record");
let constants = 0;
const constant = builtin((_receiver, _args, _context, _at) => { constants++; return normal(num(42)); });
const dense = ordinary(num(5)); for (let i = 0; i < 5; i++) put(dense, String(i), num(i)); const be = new Evaluator(realm, 3); error(map(dense, constant, UNDEFINED, be), "RangeError"); check(constants === 3 && be.steps === 4 && be.calls === 0, "builtin loop bounded");
const inner = new Traced(); put(inner, "length", num(3)); const nested = new Evaluator(realm, 3);
const reenter = builtin((_receiver, _args, context, at) => { check(context === nested.context && nested.calls === 2, "nested same context"); return context.call(adapter, UNDEFINED, [obj(inner), constant], at); });
error(map(dense, reenter, UNDEFINED, nested), "RangeError"); traceIs("Get length,Has 0,Has 1"); check(nested.steps === 4 && nested.calls === 0 && constants === 3, "nested exact ticks");
put(host, "input", obj(one)); const recursive = new Evaluator(realm, 1000, 4); const rec = map(one, binding("recursive"), UNDEFINED, recursive); check(rec.type === "throw" && rec.diagnostic.phase === "runtime" && rec.diagnostic.name === "RangeError" && rec.diagnostic.loc.line === 10 && recursive.calls === 0, "recursive map call limit");
for (const kind of ["fault", "return", "break", "continue", "output"]) {
    const e = new Evaluator(realm); let escaped = false;
    const cb = kind === "output" ? binding("output") : builtin((_receiver, _args, _context, _at): Completion => { if (kind === "fault") throw fault; if (kind === "return") return { type: "return", value: UNDEFINED }; if (kind === "break") return { type: "break", value: UNDEFINED }; return { type: "continue", value: UNDEFINED }; });
    outputFault = kind === "output";
    try { map(one, cb, UNDEFINED, e); } catch (caught) { escaped = caught instanceof Error && (kind === "fault" || kind === "output" ? caught === fault : caught.message === "invalid completion escaped call boundary: " + kind); }
    check(escaped && e.calls === 0, "map host fault cleanup " + kind); outputFault = false;
    result(map(one, identity, UNDEFINED, e), 1);
}
const other = new Realm((_line) => {}); const oe = new Evaluator(other); const otherCallback = builtin((_receiver, args, context, _at) => { check(context.realm === other && context === oe.context, "other active realm"); return normal(args[0]); });
const otherResult = result(map(one, otherCallback, UNDEFINED, oe), 1); put(otherResult, "0", num(8)); element(r2, "0", one.get("0")); check(!other.global.bindings.has("host") && first.context !== oe.context, "realm independent storage/registration");




// Additional boundary checks keep same-name errors and exact guest throws distinct.
const absentLength = new Traced();
error(map(absentLength, obj(new GuestObject())), "TypeError"); traceIs("Get length");
put(absentLength, "length", obj(new GuestObject()));
const conversionError = map(absentLength, UNDEFINED);
check(conversionError.type === "throw" && conversionError.diagnostic.message.includes("object"), "conversion error precedes callback validation"); traceIs("Get length");
const inheritedUndefined = ordinary(num(1));
const undefinedProto = new GuestObject(); put(undefinedProto, "0", UNDEFINED); inheritedUndefined.setPrototypeOf(undefinedProto);
element(result(map(inheritedUndefined), 1), "0", UNDEFINED);
let captured: ValueCompletion = normal();
const captureGuest = builtin((receiver, args, context, at) => { captured = context.call(binding("throwing"), receiver, args, at); return captured; });
const exactGuest = map(throwing, captureGuest);
check(exactGuest === captured && exactGuest.type === "throw" && captured.type === "throw" && exactGuest.value === captured.value && exactGuest.diagnostic === captured.diagnostic, "exact guest throw record/diagnostic");
traceIs("Get length,Has 0,Get 0,Effect 0,Has 1,Get 1,Effect 1");
const prior = new Evaluator(realm);
const hostFaultCallback = builtin((_receiver, _args, _context, _at): Completion => { throw fault; });
const recovery = builtin((_receiver, _args, context, at) => {
    let caught = false;
    try { context.call(adapter, UNDEFINED, [obj(one), hostFaultCallback], at); }
    catch (e) { caught = e instanceof Error && e === fault; }
    check(caught && prior.calls === 1, "map restores prior active calls");
    return context.call(adapter, UNDEFINED, [obj(one), identity], at);
});
result(prior.call(recovery, UNDEFINED, [], loc), 1);
check(prior.calls === 0, "outer recovery releases calls");
console.log("array map passed");
