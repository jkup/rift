import { Realm } from "../src/realm.js";
import { GuestObject, normal, sameValue, languageFailure, type Value, type ValueCompletion,
    type OperationContext, type PropertyKey, type InternalBooleanCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function num(value: number): Value { return { kind: "number", value }; }
function bool(value: boolean): Value { return { kind: "boolean", value }; }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function data(object: GuestObject, key: string, value: number): void {
    object.bootstrapDefine(key, { value: num(value), writable: true, configurable: true });
}
class Observed extends GuestObject {
    trace = "";
    failGet = "";
    failHas = false;
    constructor(readonly realm: Realm) { super(realm.objectPrototype); }
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, loc: Location): ValueCompletion {
        this.trace += "get:" + key + ";";
        if (key === this.failGet) return languageFailure(context.realm, "TypeError", "get sentinel", loc);
        return super.internalGet(key, receiver, context, loc);
    }
    internalHasProperty(key: PropertyKey, loc: Location): InternalBooleanCompletion {
        this.trace += "has:" + key + ";";
        if (this.failHas) return languageFailure(this.realm, "TypeError", "has sentinel", loc);
        return super.internalHasProperty(key, loc);
    }
}
function fixture() {
    const realm = new Realm((_line: string) => {}, "script");
    const target = new Observed(realm);
    realm.defineScriptGlobal("target", { value: obj(target), configurable: true });
    data(target, "length", 3); data(target, "0", 11); data(target, "2", 17);
    return { realm, target };
}
function run(realm: Realm, method: string, callback = "callback", thisArg = "undefined", steps = 100000): ValueCompletion {
    const text = "[]." + method + ".call(target," + callback + "," + thisArg + ");";
    const prepared = prepareBoundedScript({ id: "array-predicate", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
}
function result(actual: ValueCompletion, expected: boolean): void {
    check(actual.type === "normal" && sameValue(actual.value, bool(expected)), "result");
}
for (const method of ["every", "some"]) {
    const continuing = method === "every";
    {
        const { realm, target } = fixture();
        const marker = realm.createObject();
        realm.defineScriptGlobal("marker", { value: obj(marker) });
        let calls = 0;
        const callback = realm.createBuiltin("callback", 3, (receiver, args, _context, _loc) => {
            const index = calls === 0 ? 0 : 2;
            check(sameValue(receiver, obj(marker)), "thisArg identity");
            check(args.length === 3 && sameValue(args[0], num(index === 0 ? 11 : 17)) &&
                sameValue(args[1], num(index)) && sameValue(args[2], obj(target)), "callback arguments");
            target.trace += "call:" + index + ";";
            calls++;
            return normal(bool(continuing));
        });
        realm.defineScriptGlobal("callback", { value: obj(callback) });
        result(run(realm, method, "callback", "marker"), continuing);
        check(calls === 2 && target.trace === "get:length;has:0;get:0;call:0;has:1;has:2;get:2;call:2;", "skip holes in order");
    }
    {
        const { realm, target } = fixture();
        const callback = realm.createBuiltin("callback", 3, (_receiver, _args, _context, _loc) => normal(bool(!continuing)));
        realm.defineScriptGlobal("callback", { value: obj(callback) });
        result(run(realm, method), !continuing);
        check(target.trace === "get:length;has:0;get:0;", "short circuit before next HasProperty");
    }
    {
        const { realm, target } = fixture();
        data(realm.objectPrototype, "1", 13);
        let values = "";
        const callback = realm.createBuiltin("callback", 3, (_receiver, args, _context, _loc) => {
            check(args[0].kind === "number", "numeric inherited element");
            if (args[0].kind === "number") values += args[0].value + ",";
            return normal(bool(continuing));
        });
        realm.defineScriptGlobal("callback", { value: obj(callback) });
        result(run(realm, method), continuing);
        check(values === "11,13,17,", "visit inherited elements");
    }
    {
        const { realm, target } = fixture();
        let values = "";
        const callback = realm.createBuiltin("callback", 3, (_receiver, args, _context, _loc) => {
            if (args[0].kind !== "number" || args[1].kind !== "number") throw new Error("numeric arguments");
            values += args[0].value + ",";
            if (args[1].value === 0) {
                data(target, "length", 10); data(target, "1", 13); data(target, "3", 19);
                target.internalDelete("2");
            }
            return normal(bool(continuing));
        });
        realm.defineScriptGlobal("callback", { value: obj(callback) });
        result(run(realm, method), continuing);
        check(values === "11,13," && target.trace === "get:length;has:0;get:0;has:1;get:1;has:2;", "captured length and live properties");
    }
    {
        const { realm, target } = fixture();
        const length = realm.createBuiltin("length", 0, (_receiver, _args, _context, _loc) => {
            target.trace += "length-getter;";
            return normal(num(0));
        });
        target.bootstrapDefine("length", { get: obj(length), configurable: true });
        const invalid = run(realm, method, "7");
        check(invalid.type === "throw" && invalid.diagnostic.name === "TypeError", "empty validates callback");
        check(target.trace === "get:length;length-getter;", "length before callable validation");
        const callback = realm.createBuiltin("callback", 3, (_receiver, _args, _context, _loc): ValueCompletion => { throw new Error("empty callback"); });
        realm.defineScriptGlobal("callback", { value: obj(callback) });
        result(run(realm, method), continuing);
    }
    for (const failure of ["length", "0", "has", "callback"]) {
        const { realm, target } = fixture();
        const callback = realm.createBuiltin("callback", 3, (_receiver, _args, context, loc) =>
            languageFailure(context.realm, "TypeError", "callback sentinel", loc));
        realm.defineScriptGlobal("callback", { value: obj(callback) });
        target.failGet = failure;
        target.failHas = failure === "has";
        const actual = run(realm, method);
        const expected = failure === "has" ? "has sentinel" : failure === "callback" ? "callback sentinel" : "get sentinel";
        check(actual.type === "throw" && actual.diagnostic.message === expected, "abrupt completion");
        check(!target.trace.includes("has:1;"), "failure stops iteration");
    }
    {
        const { realm, target } = fixture();
        data(target, "length", Infinity); target.internalDelete("0"); target.internalDelete("2");
        const callback = realm.createBuiltin("callback", 3, (_receiver, _args, _context, _loc): ValueCompletion => { throw new Error("hole callback"); });
        realm.defineScriptGlobal("callback", { value: obj(callback) });
        const actual = run(realm, method, "callback", "undefined", 40);
        check(actual.type === "throw" && actual.origin.kind === "resource-limit" && actual.origin.guardCode === "steps", "holes consume budget");
        check(target.trace.includes("has:0;") && !target.trace.includes("get:0;"), "budget enters sparse loop");
    }
}
for (const method of ["find", "findIndex", "findLast", "findLastIndex"]) {
    const reverse = method === "findLast" || method === "findLastIndex";
    const returnsIndex = method === "findIndex" || method === "findLastIndex";
    {
        const { realm, target } = fixture();
        const callbackRealm = new Realm((_line: string) => {}, "script");
        const marker = realm.createObject();
        realm.defineScriptGlobal("marker", { value: obj(marker) });
        target.failHas = true;
        let calls = 0;
        const callback = callbackRealm.createBuiltin("callback", 3, (receiver, args, context, _loc): ValueCompletion => {
            const index = reverse ? 2 - calls : calls;
            check(context.realm === callbackRealm && sameValue(receiver, obj(marker)), "search callback Realm and receiver");
            check(args.length === 3 && sameValue(args[1], num(index)) && sameValue(args[2], obj(target)), "search callback tuple");
            check(index === 1 ? args[0].kind === "undefined" : sameValue(args[0], num(index === 0 ? 11 : 17)), "search visits holes");
            target.trace += "call:" + index + ";";
            calls++;
            return normal(bool(false));
        });
        realm.defineScriptGlobal("callback", { value: obj(callback) });
        const actual = run(realm, method, "callback", "marker");
        check(actual.type === "normal" && (returnsIndex ? sameValue(actual.value, num(-1)) : actual.value.kind === "undefined"), "missing search result");
        check(calls === 3 && target.trace === (reverse ? "get:length;get:2;call:2;get:1;call:1;get:0;call:0;" : "get:length;get:0;call:0;get:1;call:1;get:2;call:2;"), "search never checks presence");
    }
    {
        const { realm, target } = fixture();
        const first = reverse ? 2 : 0;
        const callback = realm.createBuiltin("callback", 3, (_receiver, _args, _context, _loc): ValueCompletion => {
            data(target, String(first), 99);
            return normal(obj(realm.createObject()));
        });
        realm.defineScriptGlobal("callback", { value: obj(callback) });
        const actual = run(realm, method);
        check(actual.type === "normal" && sameValue(actual.value, num(returnsIndex ? first : reverse ? 17 : 11)), "search saves value before truthy callback");
        check(target.trace === "get:length;get:" + first + ";", "search stops immediately");
    }
    for (const failure of ["length", reverse ? "2" : "0", "callback"]) {
        const { realm, target } = fixture();
        target.failGet = failure;
        const callback = realm.createBuiltin("callback", 3, (_receiver, _args, context, loc): ValueCompletion =>
            languageFailure(context.realm, "TypeError", "search sentinel", loc));
        realm.defineScriptGlobal("callback", { value: obj(callback) });
        const actual = run(realm, method, failure === "length" ? "7" : "callback");
        check(actual.type === "throw" && actual.diagnostic.message === (failure === "callback" ? "search sentinel" : "get sentinel"), "search abrupt order");
    }
    {
        const { realm, target } = fixture();
        data(target, "length", 0);
        const actual = run(realm, method, "7");
        check(actual.type === "throw" && actual.diagnostic.name === "TypeError" && target.trace === "get:length;", "empty search validates callback after length");
    }
    {
        const { realm, target } = fixture();
        data(target, "length", Infinity);
        const callback = realm.createBuiltin("callback", 3, (_receiver, _args, _context, _loc): ValueCompletion => normal(bool(false)));
        realm.defineScriptGlobal("callback", { value: obj(callback) });
        const actual = run(realm, method, "callback", "undefined", 40);
        check(actual.type === "throw" && actual.origin.kind === "resource-limit", "search traversal bounded");
    }
}
console.log("array predicates passed");
