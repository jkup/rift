import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { Evaluator } from "../src/evaluator.js";
import { prepareStrictScript, type ExecutableScript, type ScriptGuestCallable } from "../src/script-record.js";
import { ScriptDeclarativeEnvironment, type ScriptEnvironment } from "../src/script-environment.js";
import { GuestObject, UNDEFINED, normal, resourceFailure, type Value, type ValueCompletion, type OperationContext, type ThrowCompletion } from "../src/runtime.js";
import { functionSourceString } from "../src/builtins/function.js";
import { parse } from "../src/parser.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function prepared(text: string, realm: Realm): ExecutableScript {
    const result = prepareStrictScript({ id: "unit", text }, realm);
    if (result.kind !== "ready") throw new Error("preparation " + text);
    return result.record;
}
class Budget {
    steps = 0; calls = 2; depth = 3;
    trace = "";
    readonly error = new Error("host sentinel");
    abrupt: ThrowCompletion | null = null;
    readonly context: OperationContext;
    constructor(readonly realm: Realm, readonly limit: number = 100, readonly host: boolean = false) {
        this.context = { realm: this.realm, call: (_c: Value, _r: Value, _a: Value[], _l: Location): ValueCompletion => { throw new Error("body invocation"); },
            tick: (loc: Location): ValueCompletion => {
                this.steps++;
                this.trace += loc.line + ":" + loc.column + ";";
                if (this.steps > this.limit) {
                    if (this.host) throw this.error;
                    this.abrupt = resourceFailure("steps", this.steps, this.limit, "sentinel", loc);
                    return this.abrupt;
                }
                return normal();
            } };
    }
    saved(): void { check(this.context.realm === this.realm && this.calls === 2 && this.depth === 3, "saved context"); }
}
function object(result: ValueCompletion): GuestObject {
    if (result.type !== "normal" || result.value.kind !== "object") throw new Error("object completion");
    return result.value.object;
}
function callable(fn: GuestObject): ScriptGuestCallable {
    if (fn.callable === null || fn.callable.kind !== "script-guest") throw new Error("script callable");
    return fn.callable;
}
function property(fn: GuestObject, key: string): Value {
    const d = fn.getOwnProperty(key); if (d === undefined || d.kind !== "data") throw new Error("missing property " + key); return d.value;
}
function prototype(fn: GuestObject): GuestObject {
    const value = property(fn, "prototype"); if (value.kind !== "object") throw new Error("prototype"); return value.object;
}
function name(fn: GuestObject, expected: string): void {
    const value = property(fn, "name"); check(value.kind === "string" && value.value === expected, "name " + expected);
}
function invalid(action: () => void, budget: Budget, record: ExecutableScript): void {
    const before = record.inspectMaterializations().completed;
    const steps = budget.steps;
    let caught = false;
    try { action(); } catch (e) { if (e instanceof Error) caught = true; }
    check(caught && steps === budget.steps && before === record.inspectMaterializations().completed, "invariant before effects");
    budget.saved();
}
const A = new Realm((_line: string) => { throw new Error("output"); }, "script");
const B = new Realm((_line: string) => { throw new Error("output"); }, "script");
const global: ScriptEnvironment = { kind: "global", record: A.globalEnvironment };
const foreign: ScriptEnvironment = { kind: "global", record: B.globalEnvironment };
const source = '"use strict";function f(a){return a;}';
const R = prepared(source, A), R2 = prepared(source, A);
const budget = new Budget(A);
const F = object(A.createScriptFunction(R, 1, global, null, budget.context));
const C = callable(F);
check(budget.trace === "1:14;" && C.sourceText() === "function f(a){return a;}" && C.scopeId === 1 && C.realm === A && C.record === R && C.environment === global, "F01 identity/source");
check(C.strict && C.thisMode === "strict" && C.privateEnvironment === null && C.inspectFormals().join() === "a", "strict metadata");
const plan = R.inspect();
check(plan.functions[0].start === 13 && plan.functions[0].end === 37 && plan.scopes[1].formals[0].start === 24 && plan.scopes[1].formals[0].end === 25, "F01 ranges");
name(F, "f"); const length = property(F, "length"); check(length.kind === "number" && length.value === 1, "length");
console.log("F01 PASS");
const F2 = object(R.materializeFunction(1, global, null, budget.context));
const P = prototype(F), P2 = prototype(F2);
check(F !== F2 && P !== P2 && callable(F2).environment === global && F.getPrototypeOf() === A.functionPrototype && P.getPrototypeOf() === A.objectPrototype, "F02 fresh prototypes");
check(property(P, "constructor").kind === "object", "constructor object");
const backlink = property(P, "constructor"); check(backlink.kind === "object" && backlink.object === F, "backlink");
console.log("F02 PASS");
check(F.ownPropertyKeys().map(key => typeof key === "string" ? key : "symbol").join() === "length,name,prototype" && P.ownPropertyKeys().map(key => typeof key === "string" ? key : "symbol").join() === "constructor" && F.isExtensible() && P.isExtensible(), "F03 keys");
for (const key of ["length", "name", "prototype"]) {
    const d = F.getOwnProperty(key); check(d !== undefined && d.kind === "data" && d.writable === (key === "prototype") && !d.enumerable && d.configurable === (key !== "prototype"), "descriptor " + key);
}
const pd = P.getOwnProperty("constructor"); check(pd !== undefined && pd.kind === "data" && pd.writable && !pd.enumerable && pd.configurable && F.getOwnProperty("caller") === undefined && F.getOwnProperty("arguments") === undefined, "restricted absent");
console.log("F03 PASS");
const RB = prepared(source, B); const FB = object(RB.materializeFunction(1, foreign, null, new Budget(B).context));
check(FB.getPrototypeOf() === B.functionPrototype && prototype(FB).getPrototypeOf() === B.objectPrototype && FB.getPrototypeOf() !== F.getPrototypeOf(), "F04 Realm graph");
console.log("F04 PASS");
const anon = prepared('"use strict";let x=(function(a){/*x*/return a;});', A);
const unnamed = object(anon.materializeFunction(1, global, null, budget.context));
const named = object(anon.materializeFunction(1, global, "x", budget.context));
name(unnamed, ""); name(named, "x");
named.bootstrapDefine("name", { value: { kind: "string", value: "changed" } });
named.bootstrapDefine("prototype", { value: UNDEFINED });
check(callable(named).sourceText() === "function(a){/*x*/return a;}" && functionSourceString(callable(unnamed)) === "function(a){/*x*/return a;}", "F05 source");
console.log("F05 PASS");
const unit = { id: "original", text: source }; const prep = prepareStrictScript(unit, A);
if (prep.kind !== "ready") throw new Error("snapshot record");
unit.text = '"use strict";function wrong(){}'; unit.id = "mutated";
const detached = prep.record.inspectNodes(); detached.scopes[1].parameters[0] = "wrong"; detached.scopes[1].text = "wrong";
const detachedPlan = prep.record.inspect(); (detachedPlan.unit as { id: string; text: string }).text = "wrong";
(detachedPlan.scopes[1].formals as { name: string; start: number; end: number; loc: Location }[])[0].name = "wrong";
const formals = C.inspectFormals(); formals[0] = "wrong";
const snapshot = R.inspectMaterializations(); snapshot.completed = -99;
check(callable(object(prep.record.materializeFunction(1, global, null, budget.context))).sourceText() === "function f(a){return a;}" && C.inspectFormals()[0] === "a" && prep.record.inspect().unit.id === "original" && R.inspectMaterializations().completed === 2, "F06 detached");
const mutatingContext: OperationContext = { realm: A, call: budget.context.call,
    tick: (loc: Location): ValueCompletion => { loc.line = 99; loc.column = 99; return normal(); } };
prep.record.materializeFunction(1, global, null, mutatingContext);
check(prep.record.inspectNodes().scopes[1].loc?.column === 14 && prep.record.inspect().scopes[1].formals[0].name === "a", "private location/formals unchanged");
const utf16 = prepared('"use strict";let x=(function(){/*\ud800\r\n😀*/});', A);
check(callable(object(utf16.materializeFunction(1, global, null, budget.context))).sourceText() === 'function(){/*\ud800\r\n😀*/}', "exact UTF16 source units");
console.log("F06 PASS");
const legacy = new Realm((_line: string) => {});
invalid(() => { legacy.createScriptFunction(R, 1, global, null, budget.context); }, budget, R);
invalid(() => { B.createScriptFunction(R, 1, global, null, budget.context); }, budget, R);
const wrongContext = new Budget(B);
invalid(() => { R.materializeFunction(1, global, null, wrongContext.context); }, wrongContext, R);
invalid(() => { R.materializeFunction(1, foreign, null, budget.context); }, budget, R);
invalid(() => { R.materializeFunction(1, new ScriptDeclarativeEnvironment(foreign), null, budget.context); }, budget, R);
const cycle = new ScriptDeclarativeEnvironment(global);
(cycle as { outer: ScriptEnvironment }).outer = cycle;
invalid(() => { R.materializeFunction(1, cycle, null, budget.context); }, budget, R);
// The impossible legacy-union cast runs in node-host-negatives.mjs and its
// corresponding native compile-rejection reduction, per the approved revision.
const malformed = { kind: "invalid", record: A.globalEnvironment };
invalid(() => { R.materializeFunction(1, malformed as unknown as ScriptEnvironment, null, budget.context); }, budget, R);
console.log("F07 REPRESENTABLE PASS");
for (const scope of [0, -1, 1.5, NaN, 99]) invalid(() => { R.materializeFunction(scope, global, null, budget.context); }, budget, R);
const block = prepared('"use strict";{}', A);
invalid(() => { block.materializeFunction(1, global, null, budget.context); }, budget, block);
invalid(() => { R.materializeFunction(1, global, "wrong", budget.context); }, budget, R);
check(callable(object(R2.materializeFunction(1, global, null, budget.context))).record === R2, "record scope identity");
console.log("F08 PASS");
const allocateBudget = new Budget(A);
const allocated = R.createFunctionEnvironment(C, UNDEFINED, allocateBudget.context);
if (allocated.type !== "normal") throw new Error("allocation");
check(allocateBudget.trace === "1:14;" && allocated.environment.outer === global && allocated.environment.callable === C && allocated.environment.thisValue === UNDEFINED && !allocated.environment.hasBinding("a", { line: 1, column: 1 }).value, "F09 empty activation");
check(!allocated.environment.hasBinding("arguments", { line: 1, column: 1 }).value && !allocated.environment.hasBinding("f", { line: 1, column: 1 }).value, "no setup bindings");
const another = R.createFunctionEnvironment(C, UNDEFINED, allocateBudget.context);
check(another.type === "normal" && another.environment !== allocated.environment, "distinct activations");
// Structural fake/private-class casts have the same explicit split as above.
invalid(() => { R.createFunctionEnvironment(callable(F2), UNDEFINED, wrongContext.context); }, wrongContext, R);
const otherCallable = callable(object(R2.materializeFunction(1, global, null, budget.context)));
invalid(() => { R.createFunctionEnvironment(otherCallable, UNDEFINED, budget.context); }, budget, R);
console.log("F09 REPRESENTABLE PASS");
for (const operation of ["M", "A"]) {
    const globalKeys = A.globalObject.ownPropertyKeys().length;
    for (const limit of [0, 1]) {
        const b = new Budget(A, limit); const before = R.inspectMaterializations().completed;
        if (operation === "M") {
            const result = R.materializeFunction(1, global, null, b.context);
            check(limit === 0 ? result.type === "throw" && result === b.abrupt : result.type === "normal", "M prefix identity");
            check(R.inspectMaterializations().completed === before + limit, "M allocation prefix");
        } else {
            const result = R.createFunctionEnvironment(C, UNDEFINED, b.context);
            check(limit === 0 ? result.type === "throw" && result === b.abrupt : result.type === "normal", "A prefix identity");
            check(R.inspectMaterializations().completed === before, "A preserves factory count");
        }
        check(b.steps === 1 && b.trace === "1:14;", "prefix tick"); b.saved();
        if (b.abrupt !== null) check(b.abrupt.origin.kind === "resource-limit" && b.abrupt.origin.count === 1 && b.abrupt.origin.limit === 0 && b.abrupt.diagnostic.loc.column === 14, "resource origin");
    }
    const b = new Budget(A, 0, true); const before = R.inspectMaterializations().completed; let caught = false;
    try { if (operation === "M") R.materializeFunction(1, global, null, b.context); else R.createFunctionEnvironment(C, UNDEFINED, b.context); }
    catch (e) { if (e instanceof Error) caught = e === b.error; }
    check(caught && b.steps === 1 && b.trace === "1:14;" && R.inspectMaterializations().completed === before && C.sourceText() === "function f(a){return a;}", "host prefix"); b.saved();
    check(A.globalObject.ownPropertyKeys().length === globalKeys && !allocated.environment.hasBinding("a", { line: 1, column: 1 }).value, "prefix no binding changes");
}
console.log("F10 P01 PASS");
const evaluator = new Evaluator(legacy); evaluator.calls = 2; evaluator.depth = 3;
let cross = false;
try { evaluator.call({ kind: "object", object: F }, UNDEFINED, [], { line: 1, column: 1 }); }
catch (e) { if (e instanceof Error) cross = e.message === "cross-profile callable invocation"; }
check(cross && evaluator.calls === 2 && evaluator.depth === 3 && evaluator.steps === 0 && evaluator.context.realm === legacy, "legacy guard");
const toString = A.functionPrototype.getOwnProperty("toString");
if (toString === undefined || toString.kind !== "data" || toString.value.kind !== "object") throw new Error("toString");
const builtin = toString.value.object.callable;
if (builtin === null || builtin.kind !== "builtin") throw new Error("builtin");
let closed = false;
try { builtin.invoke({ kind: "object", object: F }, [], budget.context, { line: 1, column: 1 }); }
catch (e) { if (e instanceof Error) closed = e.message === "Script execution unavailable"; }
check(closed, "Script builtin closed"); console.log("F11 PASS");
const legacyNull = legacy.createGuestFunction([], [], legacy.global, null).callable;
const legacySource = legacy.createGuestFunction([], [], legacy.global, { source: { text: "xxfunction(){}yy" }, start: 2, end: 14 }).callable;
if (legacyNull === null || legacySource === null) throw new Error("legacy callable");
check(functionSourceString(legacyNull) === "function () { [native code] }" && functionSourceString(legacySource) === "function(){}" && functionSourceString(builtin) === "function toString() { [native code] }" && functionSourceString(C) === "function f(a){return a;}", "F12 source variants");
console.log("F12 PASS");
function naming(text: string, expected: string): ExecutableScript {
    const record = prepared(text, A); const sites = record.inspectNamingSites();
    check(sites.map(site => site.eligible ? "true" : "false").join() === expected, "naming " + expected);
    if (sites.length > 0) { sites[0].eligible = !sites[0].eligible; sites[0].loc.line = 99; }
    check(record.inspectNamingSites().map(site => site.eligible ? "true" : "false").join() === expected, "detached naming");
    return record;
}
const n1 = naming('"use strict";let x;x=function(){};x=(function(){});(x)=function(){};((x))=(function(){});', "true,true,false,false");
for (let i = 1; i <= 4; i++) {
    const f = object(n1.materializeFunction(i, global, i <= 2 ? "x" : null, budget.context));
    name(f, i <= 2 ? "x" : ""); check(callable(f).sourceText() === "function(){}", "parenthesized RHS same function projection");
}
console.log("N01 PASS");
naming('"use strict";let x;(x=function(){});', "true"); console.log("N02 PASS");
const n3 = naming('"use strict";let x;let y;x=(y=function(){});', "true,true");
check(n3.inspect().functions.length === 1, "nested RHS single anonymous node");
name(object(n3.materializeFunction(1, global, "y", budget.context)), "y");
const nestedRhs = parse('let x;let y;x=(y=function(){});').body[2];
check(nestedRhs.kind === "expression" && nestedRhs.expression.kind === "assign" && nestedRhs.expression.value.kind === "assign" && nestedRhs.expression.value.value.kind === "function", "whole RHS assignment versus direct function");
console.log("N03 PASS");
const n4 = naming('"use strict";let x=function(){};var y=(function(){});let o={k:(function(){})};o.k=function(){};x=true?function(){}:function(){};', "false,true");
check(n4.inspectNodes().declarations.map(d => d.initializerKind).join() === "function,function,object", "whole initializer kinds");
for (let i = 0; i < 6; i++) name(object(n4.materializeFunction(i + 1, global, i === 0 ? "x" : i === 1 ? "y" : i === 2 ? "k" : null, budget.context)), i === 0 ? "x" : i === 1 ? "y" : i === 2 ? "k" : "");
const legacyParsed = parse("let x;(x)=function(){};");
check(legacyParsed.error === null && legacyParsed.body[1].kind === "expression" && legacyParsed.body[1].expression.kind === "assign" && legacyParsed.body[1].expression.target.kind === "identifier", "legacy erased AST");
console.log("N04 PASS");
for (const text of ["let x=function named(){};", "function f(a=1){}", "function f(...a){}", "let x=()=>1;", "let x={m(){}};", "let x={[k]:1};", "function f(a,a){}"]) {
    for (const prefix of ["", "if(false){"]) {
        const p = prepareStrictScript({ id: "blocked", text: '"use strict";' + prefix + text + (prefix === "" ? "" : "}") }, A);
        check(p.kind === (text === "let x={m(){}};" || text === "let x=()=>1;" ? "ready" : "blocked"), "N05 current boundary " + text);
        if (p.kind === "ready" && text === "let x=()=>1;") {
            const f = object(p.record.materializeFunction(p.record.inspect().functions[0].scope, global, "x", new Budget(A).context));
            check(callable(f).thisMode === "lexical" && f.constructorSlot === null && callable(f).sourceText() === "()=>1", "N05 arrow metadata");
        }
    }
}
console.log("N05 PASS");
const outer = allocated.environment; const inner = callable(object(R2.materializeFunction(1, outer, null, budget.context)));
const receivers: Value[] = [UNDEFINED, { kind: "null" }, { kind: "number", value: 7 }, { kind: "object", object: new GuestObject() }];
for (const receiver of receivers) {
    const env = R2.createFunctionEnvironment(inner, receiver, budget.context);
    check(env.type === "normal" && env.environment.thisValue === receiver && env.environment.outer === outer, "S05 exact receiver/other-record outer");
}
console.log("S05 PASS");
const input = readFileSync(process.argv[2], "utf8").trim().split("|");
check((input[0] === "seed" && input[1] === "7") || (input[0] === "other" && input[1] === "11"), "input oracle");
const dynamicSource = '"use strict";function ' + input[0] + '(a){return ' + input[1] + ';}';
const runtimeRecord = prepared(dynamicSource, A);
const runtimeFunction = object(runtimeRecord.materializeFunction(1, global, null, budget.context));
name(runtimeFunction, input[0]);
check(callable(runtimeFunction).sourceText() === (input[0] === "seed" ? "function seed(a){return 7;}" : "function other(a){return 11;}"), "runtime source literal");
console.log("INPUT " + input[0] + " " + input[1] + " PASS");
