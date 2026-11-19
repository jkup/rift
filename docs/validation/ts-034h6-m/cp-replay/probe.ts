import { readFileSync } from "node:fs";
import { Realm, type RealmProfile } from "../../../../src/realm.js";
import { GuestArray } from "../../../../src/array-object.js";
import { Evaluator } from "../../../../src/evaluator.js";
import { GuestObject, UNDEFINED, normal, failure, sameValue, type Value, type ValueCompletion, type OperationContext, type PropertyKey } from "../../../../src/runtime.js";
import { mapObjectDefaultArray } from "../../../../src/array-map.js";
import { prepareBoundedScript } from "../../../../src/script-record.js";
import { createScriptSession, evaluateScript } from "../../../../src/script-execution.js";
import type { Location } from "../../../../src/syntax.js";
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function num(value: number): Value { return { kind: "number", value }; }
const loc: Location = { line: 1, column: 1 };
class Counts { effects = ""; callbacks = 0; constructors = 0; }
class CountRealm extends Realm {
    allocations = 0;
    createArray(): GuestArray { this.allocations++; return super.createArray(); }
}
class ReadArray extends GuestArray {
    constructor(proto: GuestObject, readonly counts: Counts) { super(proto); }
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        if (key === "length") this.counts.effects += "L";
        else if (key === "constructor") this.counts.effects += "K";
        else if (key === "0") this.counts.effects += "E";
        return super.internalGet(key, receiver, context, at);
    }
}
class ReadObject extends GuestObject {
    constructor(proto: GuestObject, readonly counts: Counts) { super(proto); }
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        if (key === "length") this.counts.effects += "L";
        else if (key === "constructor") this.counts.effects += "K";
        else if (key === "0") this.counts.effects += "E";
        return super.internalGet(key, receiver, context, at);
    }
}
const input = readFileSync(process.argv[2], "utf8");
check(input === "String(7);\n" || input === "String(11);\n", "frozen input");
const number = input === "String(7);\n" ? 7 : 11;
const inputId = number === 7 ? "input-a" : "input-b";
function row(profile: RealmProfile, after: boolean, kind: string): void {
    const r = new CountRealm((_line: string) => { throw new Error("unexpected output"); }, profile), counts = new Counts();
    check(r.objectPrototype.getOwnProperty("constructor") === undefined, "baseline absence");
    if (profile === "script" && after) {
        // Trusted bootstrap simulation only. Neither callback implements Object.
        const constructor = r.createBuiltinConstructor("Object", 1,
            (_receiver, _args, _context, _loc): ValueCompletion => { counts.constructors++; throw new Error("constructor call forbidden"); },
            (_callee, _args, _context, _loc): ValueCompletion => { counts.constructors++; throw new Error("constructor new forbidden"); });
        constructor.bootstrapDefine("prototype", { value: obj(r.objectPrototype), writable: false, enumerable: false, configurable: false });
        r.objectPrototype.bootstrapDefine("constructor", { value: obj(constructor), writable: true, enumerable: false, configurable: true });
        const slot = constructor.constructorSlot, callable = constructor.callable;
        check(slot !== null && slot.kind === "builtin-constructor" && callable !== null && slot.callable === callable && slot.realm === r, "real matching B factory slots");
    }
    const source: GuestObject = kind === "ordinary" ? new ReadObject(r.objectPrototype, counts) : new ReadArray(r.arrayPrototype, counts);
    const length = kind === "empty" ? 0 : 1;
    if (kind === "ordinary") source.bootstrapDefine("length", { value: num(1), writable: true, configurable: true });
    if (length === 1) source.bootstrapDefine("0", { value: num(number), writable: true, enumerable: true, configurable: true });
    const abrupt = failure("Sentinel", "exact constructor Get", loc); abrupt.value = obj(r.createObject());
    if (kind === "undefined") source.bootstrapDefine("constructor", { value: UNDEFINED, writable: true, configurable: true });
    if (kind === "nondefault") source.bootstrapDefine("constructor", { value: num(7), configurable: true });
    if (kind === "getthrow" || kind === "getnormal" || kind === "badcallback" || kind === "ordinary") {
        const getter = r.createBuiltin("getConstructor", 0, (_receiver, _args, _context, _loc): ValueCompletion => {
            counts.effects += "G";
            if (kind === "getnormal") return normal(UNDEFINED);
            return abrupt;
        });
        source.bootstrapDefine("constructor", { get: obj(getter), configurable: true });
    }
    const callback = r.createBuiltin("callback", 3, (_receiver, args, context, _loc): ValueCompletion => {
        counts.effects += "C"; counts.callbacks++;
        check(context.realm === r && args.length === 3 && sameValue(args[0], num(number)) && sameValue(args[1], num(0)) && args[2].kind === "object" && args[2].object === source, "callback receiver/value/index/source");
        return normal(args[0]);
    });
    const probe = r.createBuiltin("probe", 0, (_receiver, _args, context, at) => mapObjectDefaultArray(source, kind === "badcallback" ? num(0) : obj(callback), UNDEFINED, context, at));
    r.allocations = 0;
    let completion: ValueCompletion = normal(), steps = 0;
    if (profile === "script") {
        r.defineScriptGlobal("probe", { value: obj(probe), writable: true, configurable: true });
        const prepared = prepareBoundedScript({ id: inputId, text: "probe();" }, r);
        if (prepared.kind !== "ready") throw new Error("prepare");
        const session = createScriptSession(), result = evaluateScript(session, prepared.record), snapshot = session.inspect();
        check(result.phase === "body" && snapshot.active === null && snapshot.calls === 0 && snapshot.depth === 0, "Script cleanup");
        completion = result.completion; steps = snapshot.steps;
        if (completion.type === "throw") check(snapshot.lastAbrupt !== null && snapshot.lastAbrupt.realm === r && snapshot.lastAbrupt.unitId === inputId, "abrupt source/Realm");
    } else {
        const e = new Evaluator(r); completion = e.call(obj(probe), UNDEFINED, [], loc); steps = e.steps;
        check(e.context.realm === r && e.calls === 0 && e.depth === 0 && r.objectPrototype.getOwnProperty("constructor") === undefined, "legacy unchanged and cleanup");
    }
    const invalid = profile === "script" && kind === "nondefault";
    const unsupported = profile === "legacy" && kind === "nondefault", exact = kind === "getthrow", bad = kind === "badcallback";
    const success = !unsupported && !invalid && !exact && !bad;
    const expectedEffects = kind === "ordinary" ? "LEC" : kind === "getthrow" ? "LKG" : kind === "badcallback" ? "L" : kind === "getnormal" ? "LKGEC" : unsupported || invalid || kind === "empty" ? "LK" : "LKEC";
    const expectedCallbacks = success && length === 1 ? 1 : 0;
    check(counts.effects === expectedEffects && counts.callbacks === expectedCallbacks && counts.constructors === 0, "literal effects/callbacks/constructor nonexecution");
    check(r.allocations === (success ? 1 : 0), "result allocation count");
    check(steps === (profile === "script" ? 2 : 0) + expectedCallbacks, "literal steps");
    let outcome = "";
    if (unsupported) { check(completion.type === "throw" && completion.origin.kind === "unsupported-operation" && completion.origin.capabilityCode === "runtime.map-species" && completion.diagnostic.name === "TypeError" && completion.diagnostic.message === "unsupported map constructor/species", "literal species rejection"); outcome = "unsupported map-species"; }
    else if (invalid) { check(completion.type === "throw" && completion.value.kind === "object" && completion.origin.kind === "engine-diagnostic" && completion.diagnostic.name === "TypeError" && completion.diagnostic.message === "map species is not a constructor", "new invalid species language error"); outcome = "language TypeError"; }
    else if (exact) { check(completion === abrupt, "exact constructor completion identity"); outcome = "exact abrupt"; }
    else if (bad) { check(completion.type === "throw" && completion.diagnostic.name === "TypeError" && completion.diagnostic.message === "map callback is not callable", "callback before constructor"); outcome = "TypeError callback"; }
    else {
        if (completion.type !== "normal" || completion.value.kind !== "object") throw new Error("normal array");
        const result = completion.value.object, size = result.getOwnProperty("length");
        check(result instanceof GuestArray && result !== source && result.getPrototypeOf() === r.arrayPrototype && size !== undefined && size.kind === "data" && sameValue(size.value, num(length)), "fresh actual result array/length/prototype");
        if (length === 1) { const element = result.getOwnProperty("0"); check(element !== undefined && element.kind === "data" && sameValue(element.value, num(number)), "literal element"); }
        outcome = length === 0 ? "array []" : "array [" + number + "]";
    }
    console.log(inputId + " " + profile + " " + (after ? "after" : "before") + " " + kind + " | " + outcome + " | effects=" + counts.effects + " callbacks=" + counts.callbacks + " allocations=" + r.allocations + " constructors=0 steps=" + steps);
}
for (const after of [false, true]) {
    for (const kind of ["empty", "nonempty", "ordinary", "undefined", "nondefault", "getthrow", "getnormal", "badcallback"]) row("script", after, kind);
    for (const kind of ["empty", "nonempty"]) row("legacy", after, kind);
}
