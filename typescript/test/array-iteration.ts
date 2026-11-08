import {Realm} from "../src/realm.js";
import {GuestArray} from "../src/array-object.js";
import {GuestObject, normal, sameValue, type Value, type ValueCompletion} from "../src/runtime.js";
import {prepareBoundedScript} from "../src/script-record.js";
import {createScriptSession, evaluateScript} from "../src/script-execution.js";
import {wellKnownSpecies} from "../src/symbols.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function obj(object: GuestObject): Value { return {kind: "object", object}; }
function num(value: number): Value { return {kind: "number", value}; }
function seed(r: Realm, name: string, value: Value): void { r.defineScriptGlobal(name, {value, writable: true, configurable: true}); }
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("own data property");
    return descriptor.value;
}
function run(r: Realm, text: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "iteration", text}, r);
    if (prepared.kind !== "ready") throw new Error("prepare iteration");
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const completion = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "iteration restores session");
    return completion;
}
for (const method of ["map", "forEach"]) {
    const owner = fresh(), caller = fresh(), callbackRealm = fresh(), input = caller.createArray(), receiver = caller.createObject();
    input.bootstrapDefine("0", {value: num(7), writable: true, enumerable: true, configurable: true});
    input.bootstrapDefine("2", {value: num(11), writable: true, enumerable: true, configurable: true});
    let visited = "";
    const callback = callbackRealm.createBuiltin("callback", 3, (thisValue, args, context, _loc): ValueCompletion => {
        check(context.realm === callbackRealm && sameValue(thisValue, obj(receiver)) && args.length === 3 &&
            args[0].kind === "number" && args[1].kind === "number" && sameValue(args[2], obj(input)), "callback tuple and Realm");
        if (args[0].kind !== "number" || args[1].kind !== "number") throw new Error("numeric callback");
        visited += args[1].value + ";";
        return normal(num(args[0].value * 2));
    });
    seed(caller, "iterate", own(owner.arrayPrototype, method)); seed(caller, "input", obj(input));
    seed(caller, "callback", obj(callback)); seed(caller, "receiver", obj(receiver));
    const completion = run(caller, "iterate.call(input,callback,receiver);");
    check(visited === "0;2;" && completion.type === "normal", "public traversal skips holes");
    if (completion.type !== "normal") throw new Error("iteration completion");
    if (method === "map") {
        const value = completion.value;
        check(value.kind === "object" && value.object instanceof GuestArray && value.object !== input && value.object.getPrototypeOf() === owner.arrayPrototype, "foreign intrinsic map result Realm");
        if (value.kind !== "object") throw new Error("map result");
        check(sameValue(own(value.object, "length"), num(3)) && sameValue(own(value.object, "0"), num(14)) && sameValue(own(value.object, "2"), num(22)) && value.object.getOwnProperty("1") === undefined, "map preserves result holes");
    } else check(completion.value.kind === "undefined", "forEach discards callback result");
}
{
    const r = fresh(), input = r.createArray(), holder = r.createObject();
    input.bootstrapDefine("0", {value: num(1)});
    input.bootstrapDefine("constructor", {value: obj(holder)});
    let constructed = false;
    const custom = r.createBuiltinConstructor("species", 1,
        (_receiver, _args, _context, _loc): ValueCompletion => { throw new Error("species call"); },
        (_callee, _args, _context, _loc): ValueCompletion => { constructed = true; return normal(obj(r.createObject())); });
    holder.bootstrapDefine(wellKnownSpecies, {value: obj(custom), writable: true});
    seed(r, "input", obj(input));
    const unsupported = run(r, "input.map(function(){throw 'callback';});");
    check(unsupported.type === "throw" && unsupported.origin.kind === "unsupported-operation" && !constructed, "custom map species remains explicit and uninvoked");
    holder.bootstrapDefine(wellKnownSpecies, {value: num(7)});
    const invalid = run(r, "input.map(function(){throw 'callback';});");
    check(invalid.type === "throw" && invalid.origin.kind === "engine-diagnostic" && invalid.diagnostic.name === "TypeError", "nonconstructor species is language TypeError");
    const ignored = run(r, "input.forEach(function(){});");
    check(ignored.type === "normal" && ignored.value.kind === "undefined", "forEach ignores constructors and species");
}
for (const method of ["map", "forEach"]) {
    const r = fresh();
    const completion = run(r, "let input=[1,2]; input." + method + "(function(){throw input;});");
    check(completion.type === "throw" && completion.origin.kind === "guest" && completion.value.kind === "object" && completion.value.object instanceof GuestArray, "exact callback throw");
    let interrupted = false, completed = false;
    for (let steps = 0; steps < 60; steps++) {
        const realm = fresh(), result = run(realm, "[1,,3]." + method + "(function(x){return x;});", steps);
        if (result.type === "throw") { check(result.origin.kind === "resource-limit", "iteration budget"); interrupted = true; }
        else completed = true;
    }
    check(interrupted && completed, "public iteration budget boundary");
}
{
    const r = fresh();
    const result = run(r, "Array.prototype.forEach.call({length:Infinity},function(){});", 40);
    check(result.type === "throw" && result.origin.kind === "resource-limit", "forEach huge holes bounded");
    const range = run(r, "Array.prototype.map.call({length:Infinity},function(){});");
    check(range.type === "throw" && range.diagnostic.name === "RangeError", "map result length limit precedes traversal");
}
const legacy = new Realm((_line: string) => {});
check(legacy.arrayPrototype.getOwnProperty("map") === undefined && legacy.arrayPrototype.getOwnProperty("forEach") === undefined, "public iteration is a Script surface");
console.log("Public array iteration passed");
