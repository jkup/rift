import { Realm } from "../src/realm.js";
import { UNDEFINED, normal, sameValue, type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 50000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "default-parameters", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    try { return evaluateScript(session, prepared.record).completion; }
    finally { check(session.inspect().active === null && session.inspect().calls === 0, "restored session"); }
}
function expect(result: ValueCompletion, expected: Value, label: string): void {
    check(result.type === "normal" && sameValue(result.value, expected), label);
}
function passes(text: string): void {
    for (const prefix of ["", "'use strict';"])
        expect(run(prefix + text), { kind: "boolean", value: true }, text);
}
function expose(realm: Realm, name: string, result: ValueCompletion): void {
    if (result.type !== "normal") throw new Error("expose " + name);
    realm.defineScriptGlobal(name, { value: result.value });
}

passes("function f(a=7){return a;}f()===7&&f(undefined)===7&&f(null)===null&&f(0)===0&&f(false)===false&&f('')==='';");
passes("function f(a=1,b=a+1,c=b+1){return a+b+c;}f()===6&&f(10)===33&&f(10,20)===51;");
passes("var f=(a=2,b=a*3)=>a+b;var g=function(a=4){return a;};f()===8&&f(5)===20&&g()===4;");
passes("function f(a,b=10,...c){return a+b+c.length;}f(1)===11&&f(1,2,3,4)===5;");
passes("var f=(a=1,...b)=>a+b.length;f()===1&&f(undefined,2,3)===3;");
passes("var trace='';function f(a=(trace+='a'),b=(trace+='b')){trace+='body';return a+b;}f(3);trace==='bbody';");
passes("var n=0;function f(a=++n){return a;}n===0&&f()===1&&f(8)===8&&f()===2&&n===2;");
passes("function f(a={}){return a;}function g(a=[]){return a;}f()!==f()&&g()!==g()&&Array.isArray(g());");
passes("function f(a=function(){},b=()=>1,c=(function(){})){return [a.name,b.name,c.name];}f().join(',')==='a,b,c';");
passes("function f(a=(0,function(){}),b=true?()=>1:()=>2){return a.name+b.name;}f()==='';");
passes("function f(a,b=1,c,...d){}var g=(a=1,b)=>b;var h=(a,b=()=>1,)=>b();f.length===1&&g.length===0&&h.length===1&&h()===1;");
passes("var f=(a=(x=>x)(4),b=(function(x){return x+1;})(a))=>b;f()===5;");
passes("function f(a=(1,2),b={x:3}){return a+b.x;}f()===5;");
passes("function f(a=()=>b,b=2){return a();}f()===2;");
passes("function f(a=1,b=()=>a){var a=2;return [a,b()];}f().join(',')==='2,1';");
passes("function f(a=1,b=()=>a){var a;return [a,b()];}f().join(',')==='1,1';");
passes("function f(a=1,b=()=>a){function a(){return 9;}return [a(),b()];}f().join(',')==='9,1';");
passes("var x=4;function f(a=()=>x){var x=9;return a();}f()===4;");
passes("var g=()=>4;function f(a=g()){function g(){return 9;}return a;}f()===4;");
passes("function f(a=1,b=(a=3),c=()=>a){var a=4;return [a,b,c()];}f().join(',')==='4,3,3';");
passes("function f(a=()=>x){var x=3;return a;}var ok=false;try{f()();}catch(e){ok=e instanceof ReferenceError;}ok;");
for (const source of ["function f(a=a){}", "function f(a=b,b=1){}", "function f(a=typeof b,b=1){}", "function f(a=()=>b,b=a()){}"])
    passes(source+"var ok=false;try{f();}catch(e){ok=e instanceof ReferenceError;}ok;");
passes("var o={x:7,f(a=this.x){return a;}};o.f()===7&&o.f.call({x:9})===9;");
passes("function outer(){return (a=this)=>a;}var o={};outer.call(o).call({})===o;");
expect(run("function f(a=this){return a;}f()===this&&f.call(3).valueOf()===3;"), { kind: "boolean", value: true }, "sloppy this before defaults");
passes("function C(a=this,b=7){a.x=b;}var c=new C();c instanceof C&&c.x===7;");
passes("var o={set x(v=7){this.y=v;}};o.x=undefined;o.y===7&&Object.getOwnPropertyDescriptor(o,'x').set.length===0;");
passes("function f(a=7){return a;}f.apply(null,[])===7&&f.bind(null,undefined)()===7&&f.bind(null,3)()===3;");
passes("Function('a=2','b=a+1','return a+b;')()===5&&Function('a=()=>3','return a();')()===3;");
passes("var body=false,later=false;function fail(){throw 7;}function f(a=fail(),b=(later=true)){body=true;}var caught=false;try{f();}catch(e){caught=e===7;}caught&&!body&&!later;");
expect(run("function f(a=1){'use\\x20strict';return a;}f()===1;"), { kind: "boolean", value: true }, "escaped strict directive");
passes("function f(a=1){('use strict');return a;}f()===1;");
passes("var f=(a=1)=>'use strict';f()==='use strict';");

for (const text of [
    "function f(a=1){'use strict';}", "function f(a=1){'other';'use strict';}", "(a=1)=>{'use strict';};",
    "var o={m(a=1){'use strict';}};", "function f(a=1,a){}", "function f(a,a=1){}", "(a=1,a)=>a;",
    "function f(a=){}", "function f(...a=1){}", "function f(a=1){let a;}",
]) {
    const realm = fresh();
    check(prepareBoundedScript({ id: "invalid-default", text: "var effect=1;" + text }, realm).kind !== "ready", "reject: " + text);
    expect(run("typeof effect;", realm), { kind: "string", value: "undefined" }, "whole-source rejection");
}
{
    const owner = fresh(), caller = fresh();
    expose(caller, "f", run("var secret=17;function f(a=secret,b=[]){return [a,b];}f;", owner));
    expose(caller, "prototype", { type: "normal", value: { kind: "object", object: owner.arrayPrototype } });
    expect(run("var secret=99;var r=f();r[0]===17&&Object.getPrototypeOf(r[1])===prototype;", caller), { kind: "boolean", value: true }, "initializer Realm");
    expose(caller, "fail", run("function fail(a=missing){}fail;", owner));
    const result = run("fail();", caller);
    check(result.type === "throw" && result.value.kind === "object" && result.value.object.getPrototypeOf() === owner.getErrorPrototype("ReferenceError"), "initializer error Realm");
}
{
    const realm = fresh();
    const prepared = prepareBoundedScript({ id: "host-setup", text: "function f(a=side()){}" }, realm);
    if (prepared.kind !== "ready") throw new Error("host setup preparation");
    let calls = 0, ticks = 0;
    const context: OperationContext = { realm, call: (_f, _t, _a, _l): ValueCompletion => { calls++; return normal(); }, tick: (_l): ValueCompletion => { ticks++; return normal(); } };
    const value = prepared.record.materializeFunction(1, { kind: "global", record: realm.globalEnvironment }, null, context);
    if (value.type !== "normal" || value.value.kind !== "object" || value.value.object.callable?.kind !== "script-guest") throw new Error("host setup function");
    const created = prepared.record.createFunctionEnvironment(value.value.object.callable, UNDEFINED, context);
    if (created.type !== "normal") throw new Error("host setup environment");
    const before = ticks;
    let rejected = false;
    try { prepared.record.instantiateFunction(created.environment, [], context); }
    catch (error) { rejected = error instanceof Error && error.message === "default parameter initialization requires Script execution"; }
    check(rejected && ticks === before && calls === 0, "host setup cannot execute defaults");
}
{
    const realm = fresh(), fault = new Error("default host fault");
    realm.defineScriptGlobal("boom", { value: { kind: "object", object: realm.createBuiltin("boom", 0, (_t, _a, _c, _l): ValueCompletion => { throw fault; }) } });
    let seen = false;
    try { run("var caught=false;function f(a=boom()){}try{f();}catch(e){caught=true;}", realm); }
    catch (error) { seen = error instanceof Error && error === fault; }
    check(seen, "host initializer fault identity");
    expect(run("caught;", realm), { kind: "boolean", value: false }, "host fault bypasses guest catch");
}
{
    const realm = fresh();
    const result = run("var body=false,caught=false,cleaned=false;function spin(){while(true){}}function f(a=spin()){body=true;}try{f();}catch(e){caught=true;}finally{cleaned=true;}", realm, 500);
    check(result.type === "throw" && result.origin.kind === "resource-limit", "initializer bounded execution");
    expect(run("!body&&!caught&&!cleaned;", realm), { kind: "boolean", value: true }, "initializer fatal stop");
}
const recursive = run("function f(a=f()){}f();", fresh(), 5000);
check(recursive.type === "throw" && recursive.origin.kind === "resource-limit", "recursive defaults bounded");
check(parse("function f(a=1){}").error !== null, "legacy defaults unchanged");
expect(run("function f([a]=[]){}f();", fresh()), {kind: "undefined"}, "preserved pattern default input");
console.log("Default parameters passed");
