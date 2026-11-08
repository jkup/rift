import {Realm} from "../src/realm.js";
import {GuestObject, normal, sameValue, languageFailure, type Value, type ValueCompletion, type OperationContext, type PropertyKey, type InternalBooleanCompletion} from "../src/runtime.js";
import type {Location} from "../src/syntax.js";
import {prepareBoundedScript} from "../src/script-record.js";
import {createScriptSession, evaluateScript} from "../src/script-execution.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function obj(object: GuestObject): Value { return {kind: "object", object}; }
function num(value: number): Value { return {kind: "number", value}; }
function seed(realm: Realm, name: string, value: Value): void { realm.defineScriptGlobal(name, {value, configurable: true}); }
function data(object: GuestObject, name: string, value: number): void { object.bootstrapDefine(name, {value: num(value), writable: true, configurable: true}); }
class Observed extends GuestObject {
    trace = "";
    failGet = "";
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, loc: Location): ValueCompletion {
        this.trace += "get:" + key + ";";
        if (key === this.failGet) return languageFailure(context.realm, "TypeError", "list sentinel", loc);
        return super.internalGet(key, receiver, context, loc);
    }
    internalHasProperty(_key: PropertyKey, _loc: Location): InternalBooleanCompletion { throw new Error("apply must not check presence"); }
}
function run(realm: Realm, text: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "apply", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare apply");
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const completion = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "apply restores session");
    return completion;
}
{
    const owner = fresh(), caller = fresh(), targetRealm = fresh(), prototype = caller.createObject(), input = new Observed(prototype), receiver = caller.createObject();
    data(prototype, "2", 11); data(input, "length", 3); data(input, "0", 7);
    let calls = 0;
    const target = targetRealm.createBuiltin("target", 0, (thisArg, args, context, _loc): ValueCompletion => {
        check(context.realm === targetRealm && sameValue(thisArg, obj(receiver)), "apply target Realm and receiver");
        check(args.length === 3 && sameValue(args[0], num(7)) && args[1].kind === "undefined" && sameValue(args[2], num(11)), "apply ordered values including holes and inheritance");
        input.trace += "call;"; calls++; return normal(obj(receiver));
    });
    const method = owner.functionPrototype.getOwnProperty("apply");
    if (method === undefined || method.kind !== "data") throw new Error("apply builtin");
    seed(caller, "apply", method.value); seed(caller, "target", obj(target)); seed(caller, "list", obj(input)); seed(caller, "receiver", obj(receiver));
    const actual = run(caller, "apply.call(target,receiver,list);");
    check(actual.type === "normal" && sameValue(actual.value, obj(receiver)) && calls === 1 && input.trace === "get:length;get:0;get:1;get:2;call;", "apply protocol and result identity");
    input.trace = "";
    const invalid = run(caller, "apply.call({},receiver,list);");
    check(invalid.type === "throw" && invalid.value.kind === "object" && invalid.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError") && input.trace === "", "target validation before argument access");
    input.trace = ""; input.failGet = "1";
    const abrupt = run(caller, "apply.call(target,receiver,list);");
    check(abrupt.type === "throw" && abrupt.diagnostic.message === "list sentinel" && calls === 1 && input.trace === "get:length;get:0;get:1;", "argument read failure prevents call");
}
{
    const realm = fresh(), input = new Observed(realm.objectPrototype), length = realm.createObject();
    length.bootstrapDefine("valueOf", {value: obj(realm.createBuiltin("length", 0, (_receiver, _args, _context, _loc): ValueCompletion => {
        input.trace += "convert;"; data(input, "length", 0); data(input, "1", 9); return normal(num(2));
    }))});
    input.bootstrapDefine("length", {value: obj(length), configurable: true}); data(input, "0", 7);
    seed(realm, "list", obj(input));
    const actual = run(realm, "function f(a,b){return a+b;}f.apply(null,list);");
    check(actual.type === "normal" && sameValue(actual.value, num(16)) && input.trace === "get:length;convert;get:0;get:1;", "apply captures length and reads live values");
}
{
    const actual = run(fresh(), "let marker={};function f(){throw marker;}try{f.apply(null,[]);}catch(e){e===marker;}");
    check(actual.type === "normal" && actual.value.kind === "boolean" && actual.value.value, "target throw identity");
    const huge = run(fresh(), "function f(){throw 'must not call';}f.apply(null,{length:Infinity});", 40);
    check(huge.type === "throw" && huge.origin.kind === "resource-limit", "apply list growth bounded");
    let interrupted = false, completed = false;
    for (let steps = 0; steps < 50; steps++) {
        const result = run(fresh(), "function f(a,b){return a+b;}f.apply(null,[1,2]);", steps);
        if (result.type === "throw") { check(result.origin.kind === "resource-limit", "apply budget"); interrupted = true; }
        else { check(sameValue(result.value, num(3)), "apply budget result"); completed = true; }
    }
    check(interrupted && completed, "apply budget boundary");
}
console.log("Function apply passed");
