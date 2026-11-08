import { Realm } from "../src/realm.js";
import { GuestObject, sameValue, normal, languageFailure, type Value, type ValueCompletion,
    type OperationContext, type PropertyKey, type InternalBooleanCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function num(value: number): Value { return { kind: "number", value }; }
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
function run(realm: Realm, method: string, search: string, from = "undefined", steps = 100000): ValueCompletion {
    const text = "[]." + method + ".call(target," + search + "," + from + ");";
    const prepared = prepareBoundedScript({ id: "array-search", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
}
function result(actual: ValueCompletion, expected: Value): void {
    check(actual.type === "normal" && sameValue(actual.value, expected), "result");
}
for (const method of ["indexOf", "includes"]) {
    const { realm, target } = fixture();
    const expected: Value = method === "indexOf" ? num(2) : { kind: "boolean", value: true };
    result(run(realm, method, "17"), expected);
    check(target.trace === (method === "indexOf"
        ? "get:length;has:0;get:0;has:1;has:2;get:2;"
        : "get:length;get:0;get:1;get:2;"), "hole traversal");
    target.trace = "";
    result(run(realm, method, "undefined"), method === "indexOf" ? num(-1) : { kind: "boolean", value: true });
    check(target.trace === (method === "indexOf"
        ? "get:length;has:0;get:0;has:1;has:2;get:2;"
        : "get:length;get:0;get:1;"), "holes differ from undefined properties");
}
for (const method of ["indexOf", "includes"]) {
    const { realm, target } = fixture();
    data(realm.objectPrototype, "1", 17);
    result(run(realm, method, "17"), method === "indexOf" ? num(1) : { kind: "boolean", value: true });
    check(!target.trace.includes("2;"), "inherited match stops traversal");
}
for (const method of ["indexOf", "includes"]) {
    const { realm, target } = fixture();
    let calls = 0;
    const from = realm.createObject();
    const valueOf = realm.createBuiltin("fromIndex", 0, (_receiver, _args, _context, _loc) => {
        calls++;
        target.trace += "from;";
        data(target, "length", 0);
        return normal(num(1));
    });
    from.bootstrapDefine("valueOf", { value: obj(valueOf) });
    realm.defineScriptGlobal("from", { value: obj(from) });
    result(run(realm, method, "17", "from"), method === "indexOf" ? num(2) : { kind: "boolean", value: true });
    check(calls === 1 && target.trace === (method === "indexOf"
        ? "get:length;from;has:1;has:2;get:2;"
        : "get:length;from;get:1;get:2;"), "captured length and coercion order");
    calls = 0; target.trace = "";
    result(run(realm, method, "17", "from"), method === "indexOf" ? num(-1) : { kind: "boolean", value: false });
    check(calls === 0 && target.trace === "get:length;", "empty skips fromIndex coercion");
}
for (const method of ["indexOf", "includes"]) {
    for (const key of ["length", "0"]) {
        const { realm, target } = fixture();
        target.failGet = key;
        const outcome = run(realm, method, "17");
        check(outcome.type === "throw" && outcome.diagnostic.message === "get sentinel", "Get abrupt completion");
        check(!target.trace.includes("1;"), "Get failure stops traversal");
    }
    const { realm, target } = fixture();
    data(target, "length", Infinity);
    const outcome = run(realm, method, "99", "undefined", 40);
    check(outcome.type === "throw" && outcome.origin.kind === "resource-limit" && outcome.origin.guardCode === "steps", "bounded iteration");
    check(target.trace.includes("get:length;"), "budget test enters builtin");
}
{
    const { realm, target } = fixture();
    target.failHas = true;
    const outcome = run(realm, "indexOf", "17");
    check(outcome.type === "throw" && outcome.diagnostic.message === "has sentinel", "HasProperty abrupt completion");
    check(target.trace === "get:length;has:0;", "HasProperty failure prevents Get");
    target.trace = "";
    result(run(realm, "includes", "11"), { kind: "boolean", value: true });
    check(target.trace === "get:length;get:0;", "includes never calls HasProperty");
}
console.log("array search passed");
