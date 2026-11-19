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
for (const method of ["map", "forEach", "filter"]) {
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
    } else if (method === "filter") {
        const value = completion.value;
        check(value.kind === "object" && value.object instanceof GuestArray && value.object.getPrototypeOf() === owner.arrayPrototype, "filter foreign result Realm");
        if (value.kind !== "object") throw new Error("filter result");
        check(sameValue(own(value.object,"length"),num(2)) && sameValue(own(value.object,"0"),num(7)) && sameValue(own(value.object,"1"),num(11)), "filter selects original values densely");
    } else check(completion.value.kind === "undefined", "forEach discards callback result");
}
{
    const r = fresh(), input = r.createArray(), holder = r.createObject();
    input.bootstrapDefine("0", {value: num(1)});
    input.bootstrapDefine("constructor", {value: obj(holder)});
    let constructed = false;
    const custom = r.createBuiltinConstructor("species", 1,
        (_receiver, _args, _context, _loc): ValueCompletion => { throw new Error("species call"); },
        (_callee, _newTarget, _args, _context, _loc): ValueCompletion => { constructed = true; return normal(obj(r.createObject())); });
    holder.bootstrapDefine(wellKnownSpecies, {value: obj(custom), writable: true});
    seed(r, "input", obj(input));
    const mapped = run(r, "input.map(function(){throw 'callback';});");
    check(mapped.type === "throw" && mapped.origin.kind === "guest" && sameValue(mapped.value,{kind:"string",value:"callback"}) && constructed, "map constructs species before callback");
    constructed = false;
    const filtered = run(r,"input.filter(function(){throw 'callback';});");
    check(filtered.type === "throw" && filtered.origin.kind === "guest" && sameValue(filtered.value,{kind:"string",value:"callback"}) && constructed,"filter constructs species before callback");
    holder.bootstrapDefine(wellKnownSpecies, {value: num(7)});
    const invalid = run(r, "input.map(function(){throw 'callback';});");
    check(invalid.type === "throw" && invalid.origin.kind === "engine-diagnostic" && invalid.diagnostic.name === "TypeError", "nonconstructor species is language TypeError");
    const ignored = run(r, "input.forEach(function(){});");
    check(ignored.type === "normal" && ignored.value.kind === "undefined", "forEach ignores constructors and species");
}
for (const method of ["map", "forEach", "filter"]) {
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
{
    const owner = fresh(), caller = fresh(), input = caller.createArray();
    input.bootstrapDefine("0", {value:num(7), writable:true, configurable:true});
    seed(caller, "splice", own(owner.arrayPrototype, "splice")); seed(caller, "input", obj(input));
    const completion = run(caller, "splice.call(input,0,1);");
    check(completion.type === "normal" && completion.value.kind === "object" && completion.value.object.getPrototypeOf() === owner.arrayPrototype, "splice foreign intrinsic result Realm");
    if (completion.type !== "normal" || completion.value.kind !== "object") throw new Error("splice result");
    check(sameValue(own(completion.value.object,"0"),num(7)), "foreign deleted element");
}
{
    const r = fresh(), input = r.createArray(), holder = r.createObject();
    input.bootstrapDefine("0", {value:num(7), writable:true, configurable:true});
    input.bootstrapDefine("constructor", {value:obj(holder)});
    let trace = "";
    const custom = r.createBuiltinConstructor("species", 1,
        (_receiver, _args, _context, _loc): ValueCompletion => { throw new Error("splice species called"); },
        (_callee, _newTarget, _args, _context, _loc): ValueCompletion => { throw new Error("splice species constructed"); });
    holder.bootstrapDefine(wellKnownSpecies, {get:obj(r.createBuiltin("speciesGetter",0,(_receiver,_args,_context,_loc): ValueCompletion => {
        trace += "species;"; return normal(obj(custom));
    })), configurable:true});
    seed(r,"input",obj(input));
    hostConstruction(() => run(r,"input.splice({valueOf:function(){return 0;}},1);"), "splice species constructed");
    check(trace === "species;" && sameValue(own(input,"0"),num(7)) && sameValue(own(input,"length"),num(1)), "species before receiver mutation");
    holder.bootstrapDefine(wellKnownSpecies,{value:num(7),configurable:true});
    const invalid = run(r,"input.splice(0,1);");
    check(invalid.type === "throw" && invalid.origin.kind === "engine-diagnostic" && invalid.diagnostic.name === "TypeError", "splice invalid species language failure");
    holder.bootstrapDefine(wellKnownSpecies,{value:{kind:"null"},configurable:true});
    const fallback = run(r,"input.splice(0,1);");
    check(fallback.type === "normal" && fallback.value.kind === "object" && fallback.value.object.getPrototypeOf() === r.arrayPrototype, "null splice species default");
}
check(legacy.arrayPrototype.getOwnProperty("splice") === undefined, "splice is a Script surface");
{
    const r = fresh();
    const bounded = run(r,"[].filter.call({length:Infinity},function(){return false;});",40);
    check(bounded.type === "throw" && bounded.origin.kind === "resource-limit","filter huge holes bounded without preallocating source length");
    const result = run(r,"let a=[1,2,3];a.filter(function(v,i){if(i===0){a[0]=99;delete a[1];a[2]=7;a[3]=9;}return true;}).join(',');");
    check(result.type === "normal" && sameValue(result.value,{kind:"string",value:"1,7"}),"filter saved values, live presence and captured limit");
    const truthy = run(fresh(),"[1].filter(function(){return {valueOf:function(){throw 7;}};})[0];");
    check(truthy.type === "normal" && sameValue(truthy.value,num(1)),"filter truthiness does not coerce objects");
}
{
    const r = fresh();
    r.arrayPrototype.bootstrapDefine("1",{value:num(7),writable:true,configurable:true});
    const inherited = run(r,"let a=[1,,3];a.filter(function(v){return v>2;}).join(',');");
    check(inherited.type === "normal" && sameValue(inherited.value,{kind:"string",value:"7,3"}),"filter includes inherited values");
}
{
    const r = fresh();
    r.arrayPrototype.bootstrapDefine("0",{set:obj(r.createBuiltin("setter",1,(_receiver,_args,_context,_loc): ValueCompletion => {throw new Error("filter inherited result setter");})),configurable:true});
    const result = run(r,"[].filter.call({length:1,0:7},function(){return true;});");
    check(result.type === "normal" && result.value.kind === "object","filter result own data");
    if(result.type !== "normal" || result.value.kind !== "object")throw new Error("filter result");
    const d=result.value.object.getOwnProperty("0");
    check(d !== undefined && d.kind === "data" && sameValue(d.value,num(7)) && d.writable && d.enumerable && d.configurable,"filter defines data without inherited setter");
}
check(legacy.arrayPrototype.getOwnProperty("filter") === undefined,"filter Script only");
console.log("Public array iteration passed");

function hostConstruction(action: () => ValueCompletion, message: string): void {
    let caught = false;
    try { action(); } catch (error) {
        if (!(error instanceof Error)) throw error;
        check(error.message === message, "constructor host exception");
        caught = true;
    }
    check(caught, "custom species constructor invoked");
}
