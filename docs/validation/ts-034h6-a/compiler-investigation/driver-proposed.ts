import { readFileSync } from "node:fs";
import { Realm } from "../../../../src/realm.js";
import { GuestObject, GuestError, UNDEFINED, normal, failure, sameValue, type Value, type ValueCompletion, type Completion, type ErrorName, type Builtin, type OperationContext } from "../../../../src/runtime.js";
import { prepareBoundedScript, type ExecutableScript } from "../../../../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../../../../src/script-execution.js";
import { wellKnownToStringTag } from "../../../../src/symbols.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => { throw new Error("unexpected output"); }, "script"); }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function string(value: string): Value { return { kind: "string", value }; }
function object(value: Value): GuestObject { if (value.kind !== "object") throw new Error("object required"); return value.object; }
function prepare(text: string, realm: Realm, id: string): ExecutableScript {
    const p = prepareBoundedScript({ id, text }, realm);
    if (p.kind !== "ready") throw new Error("preparation " + p.kind);
    return p.record;
}
function idle(session: ScriptSession): void {
    const s = session.inspect(); check(s.active === null && s.calls === 0 && s.depth === 0, "idle");
}
function run(text: string, realm: Realm, session = createScriptSession(), id = "T"): ValueCompletion {
    const result = evaluateScript(session, prepare(text, realm, id));
    check(result.phase === "body", "body phase"); idle(session); return result.completion;
}
function define(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
function keysEqual(object: GuestObject, expected: string[]): boolean {
    const actual = object.ownPropertyKeys();
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) if (actual[i] !== expected[i]) return false;
    return true;
}
function descriptor(o: GuestObject, key: string, expected: string): void {
    const d = o.getOwnProperty(key);
    check(d !== undefined && d.kind === "data" && sameValue(d.value, string(expected)) && d.writable && !d.enumerable && d.configurable, "descriptor " + key);
}
function instance(c: ValueCompletion, r: Realm, message: string): GuestObject {
    if (c.type !== "normal") throw new Error("normal instance required");
    const o = object(c.value);
    check(o instanceof GuestError && o.getPrototypeOf() === r.getErrorPrototype("TypeError"), "brand/prototype");
    check(keysEqual(o, ["message"]), "instance keys"); descriptor(o, "message", message); return o;
}
function hostFault(callback: () => void, message: string): void {
    let caught = false;
    try { callback(); } catch (e) { if (!(e instanceof Error) || e.message !== message) throw e; caught = true; }
    check(caught, "host rejection " + message);
}
const loc = { line: 1, column: 1 };
const names: ErrorName[] = ["Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError"];
const input = readFileSync(process.argv[2], "utf8");
const message = input === 'make("seven");\n' ? "seven" : "eleven";
check(input === 'make("' + message + '");\n', "exact runtime input");
const inputId = message === "seven" ? "input-a" : "input-b";

// This is the ordinary guarded host builtin from the frozen A contract.
function make(realm: Realm): GuestObject {
    return realm.createBuiltin("make", 1, (_receiver, args, context, _loc): ValueCompletion => {
        const value = args[0];
        if (value === undefined || value.kind !== "string") throw new Error("string argument required");
        return normal(obj(context.realm.createError("TypeError", value.value)));
    });
}
{
    const r = fresh(); define(r, "make", obj(make(r)));
    const a = instance(run(input, r), r, message), b = instance(run(input, r), r, message);
    check(a !== b, "fresh invocation");
    const other = message === "seven" ? "eleven" : "seven";
    check(instance(run('make("' + other + '");', r), r, other) !== a, "distinct message input");
}
console.log("PASS A01");
{
    const a = fresh(), b = fresh(), protos: GuestObject[] = [];
    for (const name of names) {
        const p = a.getErrorPrototype(name), q = b.getErrorPrototype(name);
        check(p !== q && !protos.includes(p) && !(p instanceof GuestError) && !(q instanceof GuestError), "distinct ordinary prototypes"); protos.push(p);
        for (const r of [a, b]) {
            const expected = name === "Error" ? r.objectPrototype : r.getErrorPrototype("Error");
            check(r.getErrorPrototype(name).getPrototypeOf() === expected && r.objectPrototype.getPrototypeOf() === null, "graph");
        }
        const x = a.createError(name, "x"), y = a.createError(name, "x"), z = b.createError(name, "x");
        check(x !== y && x !== z && y !== z && x.getPrototypeOf() === p && y.getPrototypeOf() === p && z.getPrototypeOf() === q, "factory identity");
    }
}
console.log("PASS A02");
{
    const r = fresh();
    for (const name of names) {
        const p = r.getErrorPrototype(name), e = r.createError(name, "x");
        check(keysEqual(p, ["name", "message"]), "prototype keys");
        descriptor(p, "name", name); descriptor(p, "message", "");
        check(keysEqual(e, ["message"]), "private brand has no guest key"); descriptor(e, "message", "x");
        for (const key of ["name", "constructor", "diagnostic", "stack", "location", "toString", "cause"])
            check(e.getOwnProperty(key) === undefined, "absent instance " + key);
        check(p.getOwnProperty("constructor") === undefined && p.getOwnProperty("toString") === undefined, "A graph incomplete internally");
        check(r.globalObject.getOwnProperty(name) === undefined, "no Error globals");
    }
    check(keysEqual(r.globalObject, ["undefined", "NaN", "Infinity", "console", "Number"]), "original globals");
}
console.log("PASS A03");
function formatter(r: Realm): void {
    const d = r.objectPrototype.getOwnProperty("toString");
    if (d === undefined || d.kind !== "data") throw new Error("toString intrinsic");
    const method = d.value;
    define(r, "tag", obj(r.createBuiltin("tag", 1, (_t, args, c, l): ValueCompletion => c.call(method, args[0], [], l))));
}
function expect(c: ValueCompletion, value: Value): void { check(c.type === "normal" && sameValue(c.value, value), "exact normal value"); }
{
    const r = fresh(), e = r.createError("TypeError", message); formatter(r);
    const poison: Builtin = (_t, _a, _c, _l): Completion => { throw new Error("name/message read"); };
    const getter = obj(r.createBuiltin("poison", 0, poison));
    e.bootstrapDefine("name", { get: getter, configurable: true });
    e.bootstrapDefine("message", { get: getter, configurable: true });
    check(e.setPrototypeOf(null).value, "relink"); define(r, "e", obj(e));
    expect(run("tag(e);", r), string("[object Error]"));
    for (const name of names) {
        define(r, "e", obj(new GuestObject(r.getErrorPrototype(name)))); expect(run("tag(e);", r), string("[object Object]"));
        define(r, "e", obj(r.getErrorPrototype(name))); expect(run("tag(e);", r), string("[object Object]"));
    }
}
console.log("PASS A04");
{
    const r = fresh(), e = r.createError("Error", message); formatter(r); define(r, "e", obj(e));
    for (const custom of [string("Custom"), { kind: "number", value: 7 } as Value]) {
        e.bootstrapDefine(wellKnownToStringTag, { value: custom, configurable: true });
        const s = createScriptSession(); expect(run("tag(e);", r, s), string(custom.kind === "string" ? "[object Custom]" : "[object Error]"));
        check(s.inspect().steps === 4, "existing tag tick");
    }
    const q = failure("Sentinel", "exact", loc); q.value = obj(new GuestObject()); let gets = 0;
    e.bootstrapDefine(wellKnownToStringTag, { get: obj(r.createBuiltin("getTag", 0, (_t, _a, _c, _l): ValueCompletion => { gets++; return q; })), configurable: true });
    const stopped = createScriptSession({ maxSteps: 3, maxCalls: 3 });
    const noGet = run("tag(e);", r, stopped); check(noGet.type === "throw" && noGet.origin.kind === "resource-limit" && gets === 0, "tick precedes tag Get");
    const s = createScriptSession(); check(run("tag(e);", r, s) === q && gets === 1 && s.inspect().steps === 4, "exact tag abrupt");
}
console.log("PASS A05");
{
    const a = fresh(), b = fresh(), s = createScriptSession(); let callbacks = 0;
    define(b, "make", obj(a.createBuiltin("make", 1, (_t, args, c, _l): ValueCompletion => {
        const v = args[0]; if (v.kind !== "string") throw new Error("argument");
        const before = s.inspect(), frame = before.active;
        check(c.realm === a && frame !== null && frame.realm === a && frame.record.belongsTo(b) && frame.phase === "body" && before.calls === 1, "defining Realm/caller source");
        const e = c.realm.createError("TypeError", v.value);
        check(s.inspect().steps === before.steps, "zero-tick allocation"); callbacks++; return normal(obj(e));
    })));
    instance(run(input, b, s, inputId), a, message); check(callbacks === 1 && s.inspect().steps === 3, "cross Realm allocation");
}
console.log("PASS A06");
{
    const r = fresh(), s = createScriptSession(); let callbacks = 0;
    const retained: OperationContext[] = [], argsRetained: Value[][] = [];
    const f = r.createBuiltin("make", 1, (_t, args, c, _l): ValueCompletion => {
        callbacks++; retained.push(c); argsRetained.push(args);
        const v = args[0]; if (v.kind !== "string") throw new Error("argument");
        return normal(obj(c.realm.createError("TypeError", v.value)));
    });
    const slot = f.callable; if (slot === null || slot.kind !== "builtin") throw new Error("builtin slot");
    let ticks = 0;
    const fabricated: OperationContext = { realm: r, tick: (_l): ValueCompletion => { ticks++; return normal(); }, call: (_f, _t, _a, _l): ValueCompletion => { throw new Error("call forbidden"); } };
    hostFault(() => { slot.invoke(UNDEFINED, [string(message)], fabricated, loc); }, "Script execution unavailable");
    check(callbacks === 0 && ticks === 0 && s.inspect().steps === 0, "fabricated guard before work");
    define(r, "make", obj(f)); instance(run(input, r, s), r, message);
    hostFault(() => { slot.invoke(UNDEFINED, argsRetained[0], retained[0], loc); }, "Script execution unavailable");
    check(callbacks === 1 && ticks === 0 && s.inspect().steps === 3, "retained guard before work"); idle(s);
}
console.log("PASS A07");
{
    for (const cross of [false, true]) for (const seed of [0, 7]) for (let k = 0; k <= 4; k++) {
        const a = fresh(), r = cross ? fresh() : a, s = createScriptSession({ maxSteps: seed + k, maxCalls: 1 }); let allocations = 0;
        define(r, "make", obj(a.createBuiltin("make", 1, (_t, args, c, _l): ValueCompletion => {
            const v = args[0]; if (v.kind !== "string") throw new Error("argument"); allocations++; return normal(obj(c.realm.createError("TypeError", v.value)));
        })));
        if (seed === 7) { expect(run("0;0;0;", r, s, "seed6"), { kind: "number", value: 0 }); expect(run(";", r, s, "seed1"), UNDEFINED); }
        const record = prepare(input, r, inputId), result = evaluateScript(s, record), c = result.completion;
        check(result.phase === "body", "prefix body"); idle(s);
        if (k < 3) {
            if (c.type !== "throw") throw new Error("prefix throw");
            const origin = c.origin, column = [1, 1, 6][k], abrupt = s.inspect().lastAbrupt;
            check(origin.kind === "resource-limit" && origin.guardCode === "steps" && origin.count === seed + k + 1 && origin.limit === seed + k, "prefix origin");
            check(c.diagnostic.loc.line === 1 && c.diagnostic.loc.column === column && s.inspect().steps === seed + k + 1 && allocations === 0, "prefix loc/count/no allocation");
            check(abrupt !== null && abrupt.record === record && abrupt.realm === r && abrupt.unitId === inputId && abrupt.loc.line === 1 && abrupt.loc.column === column, "prefix provenance");
        } else { instance(c, a, message); check(allocations === 1 && s.inspect().steps === seed + 3 && s.inspect().lastAbrupt === null, "prefix success"); }
    }
    for (const seed of [0, 7]) for (const limit of [0, 1]) {
        const r = fresh(), s = createScriptSession({ maxSteps: seed + 3, maxCalls: limit }); define(r, "make", obj(make(r)));
        if (seed === 7) { run("0;0;0;", r, s); run(";", r, s); }
        const c = run(input, r, s, inputId); check(s.inspect().steps === seed + 3, "calls after argument");
        if (limit === 0) {
            if (c.type !== "throw") throw new Error("calls throw"); const origin = c.origin;
            check(origin.kind === "resource-limit" && origin.guardCode === "calls" && origin.count === 0 && origin.limit === 0, "calls origin");
            const abrupt = s.inspect().lastAbrupt;
            check(c.diagnostic.loc.line === 1 && c.diagnostic.loc.column === 1 && abrupt !== null && abrupt.realm === r && abrupt.unitId === inputId, "calls provenance");
        } else instance(c, r, message);
    }
}
console.log("PASS A08");
{
    const legacy = new Realm((_line: string) => {});
    check(Array.from(legacy.global.bindings.keys()).join(",") === "undefined,NaN,Infinity,console,Number", "legacy globals");
    for (const name of names) {
        hostFault(() => { legacy.createError(name, "x"); }, "Script Error prototype required");
        hostFault(() => { legacy.getErrorPrototype(name); }, "Script Error prototype required");
        check(!legacy.global.bindings.has(name), "legacy Error absent");
    }
    const r = fresh(); hostFault(() => { r.getErrorPrototype("Missing" as ErrorName); }, "Script Error prototype required");
    hostFault(() => { r.createError("Missing" as ErrorName, "x"); }, "Script Error prototype required");
    const c = run("missing;", r); check(c.type === "throw" && c.value.kind === "string" && c.diagnostic.name === "ReferenceError", "no failure migration");
}
console.log("PASS A09");
