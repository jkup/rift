import {Realm} from "../src/realm.js";
import {GuestObject, normal, sameValue, languageFailure, UNDEFINED, type Value, type ValueCompletion,
    type OperationContext, type PropertyKey, type InternalBooleanCompletion} from "../src/runtime.js";
import {prepareBoundedScript} from "../src/script-record.js";
import {createScriptSession, evaluateScript} from "../src/script-execution.js";
import type {Location} from "../src/syntax.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function num(value: number): Value { return {kind: "number", value}; }
function obj(object: GuestObject): Value { return {kind: "object", object}; }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function data(object: GuestObject, key: string, value: Value): void {
    object.bootstrapDefine(key, {value, writable: true, configurable: true});
}
class Observed extends GuestObject {
    trace = "";
    failGet = "";
    failHas = "";
    constructor(readonly realm: Realm) { super(realm.objectPrototype); }
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, loc: Location): ValueCompletion {
        this.trace += "G" + key + ";";
        if (key === this.failGet) return languageFailure(context.realm, "TypeError", "get sentinel", loc);
        return super.internalGet(key, receiver, context, loc);
    }
    internalHasProperty(key: PropertyKey, loc: Location): InternalBooleanCompletion {
        this.trace += "H" + key + ";";
        if (key === this.failHas) return languageFailure(this.realm, "TypeError", "has sentinel", loc);
        return super.internalHasProperty(key, loc);
    }
}
function run(realm: Realm, method: string, args: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "reduce", text: "Array.prototype." + method + ".call(target," + args + ");"}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare reduce");
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const completion = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "reduction restores session");
    return completion;
}
function result(completion: ValueCompletion, expected: Value): void {
    check(completion.type === "normal" && sameValue(completion.value, expected), "reduction result");
}
function fixture() {
    const realm = fresh(), target = new Observed(realm);
    realm.defineScriptGlobal("target", {value: obj(target)});
    data(target, "length", num(3)); data(target, "0", num(2)); data(target, "2", num(5));
    return {realm, target};
}
for (const method of ["reduce", "reduceRight"]) {
    const reverse = method === "reduceRight", {realm, target} = fixture(), callbackRealm = fresh();
    let calls = 0;
    const callback = callbackRealm.createBuiltin("callback", 4, (receiver, args, context, _loc): ValueCompletion => {
        calls++;
        check(receiver.kind === "undefined" && context.realm === callbackRealm && args.length === 4 &&
            sameValue(args[0], num(reverse ? 5 : 2)) && sameValue(args[1], num(reverse ? 2 : 5)) &&
            sameValue(args[2], num(reverse ? 0 : 2)) && args[3].kind === "object" && args[3].object === target, "callback tuple, undefined receiver and owning Realm");
        target.trace += "C;";
        return normal(num(7));
    });
    realm.defineScriptGlobal("callback", {value: obj(callback)});
    result(run(realm, method, "callback"), num(7));
    check(calls === 1 && target.trace === (reverse ? "Glength;H2;G2;H1;H0;G0;C;" : "Glength;H0;G0;H1;H2;G2;C;"), "initial element and hole traversal");
    target.internalDelete("0"); target.internalDelete("2"); target.trace = "";
    data(realm.objectPrototype, "1", num(23));
    result(run(realm, method, "callback"), num(23));
    check(calls === 1, "single inherited element does not call callback");
    realm.objectPrototype.internalDelete("1");
    const empty = run(realm, method, "callback");
    check(empty.type === "throw" && empty.diagnostic.name === "TypeError", "holes without accumulator throw");
    result(run(realm, method, "callback,undefined"), UNDEFINED);
    result(run(realm, method, "callback,target"), obj(target));
    check(calls === 1, "explicit undefined and object accumulators on holes");
}
for (const method of ["reduce", "reduceRight"]) {
    const reverse = method === "reduceRight", {realm, target} = fixture();
    target.internalDelete("0"); target.internalDelete("2"); data(target, "length", num(4));
    const first = reverse ? 3 : 0, deleted = reverse ? 2 : 1, added = reverse ? 1 : 2, last = reverse ? 0 : 3;
    data(target, String(first), num(10)); data(target, String(deleted), num(20)); data(target, String(last), num(40));
    let visited = "";
    const callback = realm.createBuiltin("mutate", 4, (_receiver, args, _context, _loc): ValueCompletion => {
        if (args[0].kind !== "number" || args[1].kind !== "number" || args[2].kind !== "number") throw new Error("numeric callback");
        visited += args[2].value + ";";
        if (args[2].value === first) {
            target.internalDelete(String(deleted)); data(target, String(added), num(30));
            data(target, "length", num(0)); data(target, "4", num(99));
        }
        return normal(num(args[0].value + args[1].value));
    });
    realm.defineScriptGlobal("callback", {value: obj(callback)});
    result(run(realm, method, "callback,0"), num(80));
    check(visited === first + ";" + added + ";" + last + ";", "captured length and live mutation in traversal order");
}
for (const method of ["reduce", "reduceRight"]) {
    const {realm, target} = fixture();
    target.failGet = "length";
    const length = run(realm, method, "0");
    check(length.type === "throw" && length.diagnostic.message === "get sentinel" && target.trace === "Glength;", "length failure wins over invalid callback");
    target.failGet = ""; target.trace = "";
    const invalid = run(realm, method, "0,7");
    check(invalid.type === "throw" && invalid.diagnostic.message.includes("callback") && target.trace === "Glength;", "invalid callback before element lookup");
    const first = method === "reduce" ? "0" : "2";
    target.failHas = first; target.trace = "";
    const has = run(realm, method, "function(a,b){return b;}");
    check(has.type === "throw" && has.diagnostic.message === "has sentinel" && target.trace === "Glength;H" + first + ";", "HasProperty failure prevents Get");
    target.failHas = ""; target.failGet = first;
    const get = run(realm, method, "function(a,b){return b;}");
    check(get.type === "throw" && get.diagnostic.message === "get sentinel", "initial element Get failure");
    target.failGet = ""; target.trace = "";
    const callback = run(realm, method, "function(a,b){throw target;},0");
    check(callback.type === "throw" && callback.origin.kind === "guest" && sameValue(callback.value, obj(target)) &&
        target.trace === "Glength;H" + first + ";G" + first + ";", "callback throw stops traversal with exact identity");
    data(target, "length", num(Infinity));
    const bounded = run(realm, method, "function(a,b){return a;},0", 40);
    check(bounded.type === "throw" && bounded.origin.kind === "resource-limit", "large sparse reduction is bounded");
}
console.log("Array reduction passed");
