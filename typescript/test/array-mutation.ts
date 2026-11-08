import { Realm } from "../src/realm.js";
import { GuestObject, sameValue, type Value, type ValueCompletion, type OperationContext, type PropertyKey, type InternalBooleanCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function num(value: number): Value { return { kind: "number", value }; }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function data(object: GuestObject, key: string, value: number, writable = true, configurable = true): void {
    object.bootstrapDefine(key, { value: num(value), writable, configurable });
}
class Observed extends GuestObject {
    trace = "";
    internalHasProperty(key: PropertyKey, loc: Location): InternalBooleanCompletion {
        this.trace += "has:" + key + ";";
        return super.internalHasProperty(key, loc);
    }
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, loc: Location): ValueCompletion {
        this.trace += "get:" + key + ";";
        return super.internalGet(key, receiver, context, loc);
    }
    internalSet(key: PropertyKey, value: Value, receiver: Value, context: OperationContext, loc: Location): InternalBooleanCompletion {
        this.trace += "set:" + key + ";";
        return super.internalSet(key, value, receiver, context, loc);
    }
    internalDelete(key: PropertyKey): InternalBooleanCompletion {
        this.trace += "delete:" + key + ";";
        return super.internalDelete(key);
    }
}
function fixture() {
    const realm = new Realm((_line: string) => {}, "script");
    const target = new Observed(realm.objectPrototype);
    realm.defineScriptGlobal("target", { value: obj(target), writable: true, configurable: true });
    return { realm, target };
}
function run(realm: Realm, text: string): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "array-mutation", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function result(actual: ValueCompletion, expected: Value): void {
    check(actual.type === "normal" && sameValue(actual.value, expected), "result");
}
function error(actual: ValueCompletion): void {
    check(actual.type === "throw" && actual.diagnostic.name === "TypeError", "TypeError");
}
function own(target: GuestObject, key: string, expected: number): void {
    const descriptor = target.getOwnProperty(key);
    check(descriptor !== undefined && descriptor.kind === "data" && sameValue(descriptor.value, num(expected)), "own " + key);
}
{
    const { realm, target } = fixture();
    data(target, "length", 1);
    result(run(realm, "[].push.call(target, 7, 11);"), num(3));
    check(target.trace === "get:length;set:1;set:2;set:length;", "push order");
    own(target, "1", 7); own(target, "2", 11); own(target, "length", 3);
    target.trace = "";
    result(run(realm, "[].pop.call(target);"), num(11));
    check(target.trace === "get:length;get:2;delete:2;set:length;", "pop order");
    check(target.getOwnProperty("2") === undefined, "pop deletes");
    own(target, "length", 2);
}
for (const method of ["push", "pop"]) {
    const { realm, target } = fixture();
    data(target, "length", 0, false);
    error(run(realm, "[]." + method + ".call(target);"));
    check(target.trace === "get:length;set:length;", "empty strict length write");
}
{
    const { realm, target } = fixture();
    data(target, "length", 0); data(target, "1", 99, false);
    error(run(realm, "[].push.call(target, 7, 11);"));
    own(target, "0", 7); own(target, "1", 99); own(target, "length", 0);
    check(target.trace === "get:length;set:0;set:1;", "partial push");
}
for (const method of ["push", "pop"]) {
    const { realm, target } = fixture();
    data(target, "length", 1, false); data(target, "0", 7);
    error(run(realm, "[]." + method + ".call(target, 11);"));
    own(target, "length", 1);
    if (method === "push") own(target, "1", 11);
    else check(target.getOwnProperty("0") === undefined, "delete survives length failure");
}
{
    const { realm, target } = fixture();
    data(target, "length", 1); data(target, "0", 7, true, false);
    error(run(realm, "[].pop.call(target);"));
    check(target.trace === "get:length;get:0;delete:0;", "failed delete stops length write");
    own(target, "0", 7); own(target, "length", 1);
}
{
    const { realm, target } = fixture();
    data(target, "length", 1); data(realm.objectPrototype, "0", 17);
    result(run(realm, "[].pop.call(target);"), num(17));
    own(realm.objectPrototype, "0", 17); own(target, "length", 0);
}
{
    const { realm, target } = fixture();
    data(target, "length", 9007199254740991);
    error(run(realm, "[].push.call(target, 7);"));
    check(target.trace === "get:length;", "safe length checked before writes");
}
for (const key of ["length", "0"]) {
    const { realm, target } = fixture();
    data(target, "length", 1);
    const getter = realm.createBuiltin("get", 0, (_receiver, _args, _context, _loc): ValueCompletion => {
        throw new Error("getter sentinel");
    });
    target.bootstrapDefine(key, { get: obj(getter), configurable: true });
    let caught = false;
    try { run(realm, "[].pop.call(target);"); }
    catch (failure) { caught = failure instanceof Error && failure.message === "getter sentinel"; }
    check(caught, "getter failure propagated");
    check(target.trace === (key === "length" ? "get:length;" : "get:length;get:0;"), "getter failure stops mutation");
}
{
    const { realm, target } = fixture();
    let reads = 0, writes = 0;
    const getter = realm.createBuiltin("getLength", 0, (_receiver, _args, _context, _loc): ValueCompletion => {
        reads++;
        return { type: "normal", value: num(0) };
    });
    const setter = realm.createBuiltin("setLength", 1, (receiver, args, _context, _loc): ValueCompletion => {
        check(receiver.kind === "object" && receiver.object === target && sameValue(args[0], num(2)), "length setter receiver/value");
        writes++;
        return { type: "normal", value: num(99) };
    });
    target.bootstrapDefine("length", { get: obj(getter), set: obj(setter), configurable: true });
    result(run(realm, "[].push.call(target, 7, 11);"), num(2));
    check(reads === 1 && writes === 1, "one length get and set");
    own(target, "0", 7); own(target, "1", 11);
}
{
    let reachedPartialWrite = false;
    for (let steps = 1; steps < 80; steps++) {
        const trial = fixture();
        data(trial.target, "length", 0);
        const prepared = prepareBoundedScript({ id: "budget", text: "[].push.call(target, 1, 2, 3, 4, 5);" }, trial.realm);
        if (prepared.kind !== "ready") throw new Error("budget prepare");
        const outcome = evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
        if (outcome.type === "throw" && trial.target.getOwnProperty("0") !== undefined && trial.target.getOwnProperty("4") === undefined) {
            own(trial.target, "length", 0);
            reachedPartialWrite = true;
            break;
        }
    }
    check(reachedPartialWrite, "push checks budget between writes");
}
for (const lower of [false, true]) for (const upper of [false, true]) {
    const { realm, target } = fixture();
    data(target, "length", 3, false);
    if (lower) data(target, "0", 7);
    if (upper) data(target, "2", 11);
    result(run(realm, "[].reverse.call(target);"), obj(target));
    const reads = "get:length;has:0;" + (lower ? "get:0;" : "") + "has:2;" + (upper ? "get:2;" : "");
    const writes = lower && upper ? "set:0;set:2;" : upper ? "set:0;delete:2;" : lower ? "delete:0;set:2;" : "";
    check(target.trace === reads + writes, "reverse presence order");
    if (upper) own(target, "0", 11);
    else check(target.getOwnProperty("0") === undefined, "reverse lower hole");
    if (lower) own(target, "2", 7);
    else check(target.getOwnProperty("2") === undefined, "reverse upper hole");
    own(target, "length", 3);
}
{
    const { realm, target } = fixture();
    data(target, "length", 2); data(realm.objectPrototype, "0", 7); data(target, "1", 11);
    result(run(realm, "[].reverse.call(target);"), obj(target));
    own(target, "0", 11); own(target, "1", 7); own(realm.objectPrototype, "0", 7);
}
{
    const { realm, target } = fixture();
    data(target, "length", 2);
    const getter = realm.createBuiltin("getLower", 0, (receiver, _args, _context, _loc): ValueCompletion => {
        check(receiver.kind === "object" && receiver.object === target, "reverse getter receiver");
        data(target, "1", 11); data(target, "length", 0);
        return { type: "normal", value: num(7) };
    });
    const setter = realm.createBuiltin("setLower", 1, (receiver, args, _context, _loc): ValueCompletion => {
        check(receiver.kind === "object" && receiver.object === target && sameValue(args[0], num(11)), "reverse setter receiver/value");
        return { type: "normal", value: num(99) };
    });
    target.bootstrapDefine("0", { get: obj(getter), set: obj(setter), configurable: true });
    result(run(realm, "[].reverse.call(target);"), obj(target));
    check(target.trace === "get:length;has:0;get:0;has:1;get:1;set:0;set:1;", "reverse reads lower before checking upper");
    own(target, "1", 7); own(target, "length", 0);
}
for (const failure of ["lower-write", "upper-write", "upper-delete", "lower-delete", "missing-upper-write"]) {
    const { realm, target } = fixture();
    data(target, "length", 2);
    if (failure !== "upper-delete") data(target, "0", 7, failure !== "lower-write", failure !== "lower-delete");
    if (failure === "lower-write" || failure === "upper-write" || failure === "upper-delete") {
        data(target, "1", 11, failure !== "upper-write", failure !== "upper-delete");
    }
    if (failure === "missing-upper-write") target.preventExtensions();
    error(run(realm, "[].reverse.call(target);"));
    if (failure === "upper-write") { own(target, "0", 11); own(target, "1", 11); }
    else if (failure === "upper-delete") { own(target, "0", 11); own(target, "1", 11); }
    else if (failure === "missing-upper-write") {
        check(target.getOwnProperty("0") === undefined && target.getOwnProperty("1") === undefined, "reverse deletion survives failed write");
    } else own(target, "0", 7);
    own(target, "length", 2);
    if (failure === "lower-write") check(!target.trace.includes("set:1;"), "failed lower write stops upper write");
    if (failure === "lower-delete") check(!target.trace.includes("set:1;"), "failed lower delete stops upper write");
}
for (const key of ["length", "0", "1"]) {
    const { realm, target } = fixture();
    data(target, "length", 2); data(target, "0", 7); data(target, "1", 11);
    const getter = realm.createBuiltin("throwingGet", 0, (_receiver, _args, _context, _loc): ValueCompletion => {
        throw new Error("reverse getter sentinel");
    });
    target.bootstrapDefine(key, { get: obj(getter), configurable: true });
    let caught = false;
    try { run(realm, "[].reverse.call(target);"); }
    catch (failure) { caught = failure instanceof Error && failure.message === "reverse getter sentinel"; }
    check(caught && !target.trace.includes("set:") && !target.trace.includes("delete:"), "reverse getter failure stops mutation");
}
{
    let interrupted = false;
    for (let steps = 1; steps < 80; steps++) {
        const { realm, target } = fixture();
        data(target, "length", 6); data(target, "0", 7); data(target, "5", 11); data(target, "1", 17);
        const prepared = prepareBoundedScript({ id: "reverse-budget", text: "[].reverse.call(target);" }, realm);
        if (prepared.kind !== "ready") throw new Error("reverse budget prepare");
        const outcome = evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
        if (outcome.type === "throw" && target.trace.includes("set:5;") && !target.trace.includes("has:1;")) {
            check(outcome.origin.kind === "resource-limit", "reverse budget classification");
            own(target, "0", 11); own(target, "5", 7); own(target, "1", 17);
            interrupted = true;
            break;
        }
    }
    check(interrupted, "reverse checks budget between pairs");
}
console.log("array mutation passed");
