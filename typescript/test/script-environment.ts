import { readFileSync } from "node:fs";
import { GlobalEnvironment } from "../src/global-environment.js";
import { ScriptDeclarativeEnvironment, ScriptFunctionEnvironment, resolveScriptBinding, getScriptBinding, putScriptBinding, scriptIdentifierReceiver, type ScriptEnvironment, type ScriptBindingReference } from "../src/script-environment.js";
import { updateScriptEmpty, scriptExpressionCompletion, type ScriptStatementCompletion, type ScriptStatementPayload } from "../src/script-completion.js";
import { GuestObject, UNDEFINED, normal, failure, resourceFailure, sameValue, type Value, type ValueCompletion, type InternalBooleanCompletion, type OperationContext, type PropertyKey, type ThrowCompletion } from "../src/runtime.js";
import { Realm } from "../src/realm.js";
import type { Location } from "../src/syntax.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function num(value: number): Value { return { kind: "number", value }; }
function value(r: ValueCompletion, v: Value): void { check(r.type === "normal" && sameValue(r.value, v), "value"); }
function error(r: ValueCompletion, name: string): void { check(r.type === "throw" && r.diagnostic.name === name, name); }
function capture(e: ScriptEnvironment, name: string, site: Location = loc): ScriptBindingReference {
    const r = resolveScriptBinding(e, name, site); if (r.type === "throw") throw new Error("resolve"); return r.reference;
}
function invariant(action: () => void, message: string): void {
    let caught = false;
    try { action(); } catch (e) { if (e instanceof Error) caught = e.message === message; }
    check(caught, "host invariant " + message);
}
const loc: Location = { line: 3, column: 9 };
const realm = new Realm((_line: string) => {});
const context: OperationContext = { realm, call: (_c: Value, _r: Value, _a: Value[], _l: Location): ValueCompletion => { throw new Error("no calls"); }, tick: (_l: Location): ValueCompletion => { throw new Error("no ticks"); } };
const object = new GuestObject();
const globalRecord = new GlobalEnvironment(object, object);
const global: ScriptEnvironment = { kind: "global", record: globalRecord };
function define(name: string, v: Value, writable: boolean = true): void { object.bootstrapDefine(name, { value: v, writable, enumerable: true, configurable: true }); }
const local = new ScriptDeclarativeEnvironment(global);
value(local.createMutableBinding("x", loc), UNDEFINED);
const x = capture(local, "x");
check(x.base === local && x.strict, "TDZ resolved");
error(getScriptBinding(x), "ReferenceError"); error(putScriptBinding(x, num(1), context), "ReferenceError");
value(local.initializeBinding("x", num(7), context, loc), UNDEFINED); value(getScriptBinding(x), num(7));
value(putScriptBinding(x, num(11), context), UNDEFINED); value(getScriptBinding(x), num(11));
invariant(() => { local.createMutableBinding("x", loc); }, "binding already exists: x");
invariant(() => { local.initializeBinding("x", num(0), context, loc); }, "binding already initialized: x");
invariant(() => { local.initializeBinding("missing", num(0), context, loc); }, "missing binding: missing");
invariant(() => { local.getBindingValue("missing", loc); }, "missing binding: missing");
invariant(() => { local.setMutableBinding("missing", num(0), context, loc); }, "missing binding: missing");
console.log("L01 PASS");
value(putScriptBinding(x, num(7), context), UNDEFINED);
const child = new ScriptDeclarativeEnvironment(local), sibling = new ScriptDeclarativeEnvironment(local);
const before = capture(child, "x");
child.createMutableBinding("x", loc); error(getScriptBinding(capture(child, "x")), "ReferenceError");
child.initializeBinding("x", num(0), context, loc);
value(getScriptBinding(capture(child, "x")), num(0)); value(getScriptBinding(capture(sibling, "x")), num(7));
putScriptBinding(before, num(11), context); value(getScriptBinding(before), num(11)); value(getScriptBinding(capture(child, "x")), num(0));
console.log("L02 PASS");
define("deep", num(7));
let deep: ScriptEnvironment = global;
for (let i = 0; i < 20000; i++) deep = new ScriptDeclarativeEnvironment(deep);
value(getScriptBinding(capture(deep, "deep")), num(7)); check(capture(deep, "absent").base === null, "deep absent");
console.log("L03 PASS");
// Actual existing builtin metadata, never a synthetic Script callable.
const callable = realm.functionPrototype.callable;
if (callable === null) throw new Error("builtin metadata");
const receivers: Value[] = [UNDEFINED, { kind: "null" }, num(0), { kind: "object", object }];
for (const receiver of receivers) {
    const f = new ScriptFunctionEnvironment(local, receiver, callable);
    check(sameValue(f.thisValue, receiver) && f.callable === callable && f.outer === local, "host function metadata");
    value(normal(scriptIdentifierReceiver(capture(f, "x"))), UNDEFINED);
}
value(normal(scriptIdentifierReceiver(capture(global, "deep"))), UNDEFINED);
console.log("L04 PASS");
const site = { line: 3, column: 9 }; const missing = capture(child, "late", site); site.line = 99;
define("late", num(7)); child.createMutableBinding("late", loc); child.initializeBinding("late", num(0), context, loc);
const missingPut = putScriptBinding(missing, num(11), context); error(missingPut, "ReferenceError"); error(getScriptBinding(missing), "ReferenceError");
check(missingPut.type === "throw" && missingPut.diagnostic.loc.line === 3 && missingPut.diagnostic.loc.column === 9, "copied site");
value(getScriptBinding(capture(global, "late")), num(7));
console.log("T01 PASS");
define("live", num(7)); const live = capture(child, "live"); define("live", num(11)); value(getScriptBinding(live), num(11));
define("live", num(11), false); error(putScriptBinding(live, num(0), context), "TypeError");
object.internalDelete("live"); error(getScriptBinding(live), "ReferenceError"); error(putScriptBinding(live, num(0), context), "ReferenceError");
define("live", num(7)); globalRecord.createMutableBinding("live", loc); error(getScriptBinding(live), "ReferenceError");
globalRecord.initializeBinding("live", num(0), context, loc); value(getScriptBinding(live), num(0));
console.log("T02 PASS");
class FaultObject extends GuestObject {
    trace = ""; mode = "";
    abrupt: ThrowCompletion = failure("Sentinel", "original", loc);
    readonly sentinel = new Error("host sentinel");
    override internalHasProperty(k: PropertyKey, l: Location): InternalBooleanCompletion {
        this.trace += "H"; if (this.mode === "host") throw this.sentinel;
        return this.mode === "H" ? this.abrupt : super.internalHasProperty(k, l);
    }
    override internalGet(k: PropertyKey, r: Value, l: Location): ValueCompletion {
        this.trace += "G"; check(r.kind === "object" && r.object === this && l.line === 3 && l.column === 9, "get receiver/site");
        return this.mode === "G" ? this.abrupt : super.internalGet(k, r, l);
    }
    override internalSet(k: PropertyKey, v: Value, r: Value, c: OperationContext, l: Location): InternalBooleanCompletion {
        this.trace += "S"; check(c === context && r.kind === "object" && r.object === this && l.line === 3 && l.column === 9, "set context/receiver/site");
        return this.mode === "S" ? this.abrupt : super.internalSet(k, v, r, c, l);
    }
}
const fault = new FaultObject(); fault.bootstrapDefine("x", { value: num(7), writable: true, enumerable: true, configurable: true });
const faultGlobal: ScriptEnvironment = { kind: "global", record: new GlobalEnvironment(fault, fault) };
const faultLocal = new ScriptDeclarativeEnvironment(faultGlobal);
const faultRef = capture(faultLocal, "x");
const resource = resourceFailure("steps", 2, 1, "limit", loc);
for (const abrupt of [failure("Sentinel", "original", loc), resource]) {
    fault.abrupt = abrupt; fault.mode = "H"; fault.trace = "";
    const h = resolveScriptBinding(faultLocal, "x", loc); check(h.type === "throw" && h === abrupt && fault.trace === "H", "Has identity/trace");
    fault.mode = "G"; fault.trace = ""; const g = getScriptBinding(faultRef); check(g.type === "throw" && g === abrupt && fault.trace === "HG", "Get identity/trace");
    fault.mode = "S"; fault.trace = ""; const s = putScriptBinding(faultRef, num(0), context); check(s.type === "throw" && s === abrupt && fault.trace === "HS", "Set identity/trace");
}
fault.mode = "host"; let hostCaught = false;
try { resolveScriptBinding(faultLocal, "x", loc); } catch (e) { if (e instanceof Error) hostCaught = e === fault.sentinel; }
check(hostCaught, "host identity");
faultLocal.createMutableBinding("own", loc); faultLocal.initializeBinding("own", num(7), context, loc);
const own = capture(faultLocal, "own"); fault.trace = ""; value(getScriptBinding(own), num(7)); putScriptBinding(own, num(11), context); check(fault.trace === "", "captured local no outer lookup");
console.log("T03 PASS");
const empty: ScriptStatementPayload = { kind: "empty" }, seven: ScriptStatementPayload = { kind: "value", value: num(7) };
const initial: ScriptStatementCompletion = { type: "normal", payload: empty };
const explicitUndefined = scriptExpressionCompletion(normal());
check(initial.payload.kind === "empty" && explicitUndefined.type === "normal" && explicitUndefined.payload.kind === "value" && explicitUndefined.payload.value.kind === "undefined", "empty vs undefined");
console.log("C01 PASS");
for (const type of ["normal", "break", "continue"] as const) {
    const r = updateScriptEmpty({ type, payload: empty }, seven);
    check(r.type === type && r.payload.kind === "value" && sameValue(r.payload.value, num(7)), "carry7");
}
const stillEmpty = updateScriptEmpty(initial, empty); check(stillEmpty.type === "normal" && stillEmpty.payload.kind === "empty", "empty carry");
console.log("C02 PASS");
for (const v of [num(0), { kind: "boolean", value: false } as Value, UNDEFINED]) {
    for (const type of ["normal", "break", "continue"] as const) {
        const original: ScriptStatementCompletion = { type, payload: { kind: "value", value: v } };
        check(updateScriptEmpty(original, seven) === original, "nonempty identity");
    }
}
console.log("C03 PASS");
const returned: ScriptStatementCompletion = { type: "return", value: UNDEFINED };
check(updateScriptEmpty(returned, seven) === returned, "return identity");
for (const thrown of [failure("Sentinel", "original", loc), resource]) {
    check(updateScriptEmpty(thrown, seven) === thrown && scriptExpressionCompletion(thrown) === thrown, "throw identity");
}
console.log("C04 PASS");
const input = readFileSync(process.argv[2], "utf8").trim().split("|");
check(input.length === 2 && (input[0] === "seed" || input[0] === "other"), "input");
const runtime = new ScriptDeclarativeEnvironment(global); runtime.createMutableBinding(input[0], loc); runtime.initializeBinding(input[0], num(0), context, loc);
const ref = capture(runtime, input[0]); putScriptBinding(ref, num(Number(input[1])), context);
value(getScriptBinding(ref), input[0] === "seed" ? num(7) : num(11));
console.log("INPUT " + input[0] + " " + input[1] + " PASS");
