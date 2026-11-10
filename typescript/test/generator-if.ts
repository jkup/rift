import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../src/script-execution.js";
import { type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(source: string, realm: Realm, session: ScriptSession = createScriptSession()): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "generator-start", text: source }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + prepared.kind + ": " + source);
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "caller state restored");
    return result;
}
function own(realm: Realm, name: string): Value {
    const property = realm.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") throw new Error("missing " + name);
    return property.value;
}
function define(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
const cases: string[] = [
    "function* f(){while(yield 1){}}var g=f();g.next().value===1&&g.next(false).done;",
    "function* f(){if(yield 1){return 2;}return 3;}var a=f(),b=f();a.next();b.next();a.next(true).value===2&&b.next(false).value===3;",
    "function* f(){if(yield 1){yield 2;}else{yield 3;}return 4;}var g=f();g.next();g.next(false).value===3&&g.next().value===4;",
    "function* f(){if(yield 1){if(yield 2)return 3;else return 4;}else return 5;}var g=f();g.next();g.next(true).value===2&&g.next(false).value===4;",
    "function* f(){if((yield 1)+(yield 2)===7)return 8;return 9;}var g=f();g.next();g.next(3);g.next(4).value===8;",
    "function* f(){if(!(yield 1))return 7;}var g=f();g.next();g.next(false).value===7;",
    "function* f(){if((yield 1)?(yield 2):(yield 3))return 7;return 8;}var g=f();g.next();g.next(false).value===3&&g.next(true).value===7;",
    "function* inner(){yield 1;return true;}function* f(){if(yield* inner())return 7;return 8;}var g=f();g.next();g.next().value===7;",
    "function* f(){if(yield yield 1)return 7;return 8;}var g=f();g.next();g.next(2).value===2&&g.next(false).value===8;",
    "var n=0;function* f(){if(yield 1)n++;else n+=2;return n;}var g=f();g.next();n===0&&g.next({valueOf(){throw 7;}}).value===1;",
    "function* f(){let x=7;if(yield 1){let x=8;yield x;}return x;}var g=f();g.next();g.next(true).value===8&&g.next().value===7;",
    "function* f(){if(yield 1){try{typeof x;}catch(e){yield e instanceof ReferenceError;}let x=7;return x;}}var g=f();g.next();g.next(true).value===true&&g.next().value===7;",
    "function* f(){for(var i=0;i<3;i++){if(yield i)continue;yield 9;}return i;}var g=f();g.next().value===0&&g.next(true).value===1&&g.next(false).value===9&&g.next().value===2&&g.next(true).value===3;",
    "function* f(){outer:{if(yield 1)break outer;yield 2;}return 7;}var g=f();g.next();g.next(true).value===7;",
    "var n=0;function* f(){try{if(yield 1)n++;else n+=2;}finally{yield n;}}var g=f();g.next();g.return(7).value===0&&g.next().value===7&&n===0;",
    "var marker={};function* f(){try{if(yield 1)return 7;}catch(e){yield e;return 8;}}var g=f();g.next();g.throw(marker).value===marker&&g.next().value===8;",
    "var n=0;function* f(){try{if((yield 1)+Symbol())n++;}catch(e){return e instanceof TypeError;}}var g=f();g.next();g.next(1).value===true&&n===0;",
    "function* f(){if(yield 1);return 7;}var g=f();g.next();g.next(false).value===7;",
    "function* f(){if(yield 1){}}var g=f();g.next();g.next(false).done;"
];
for (let i=0;i<cases.length;i++) {
 const result=run(cases[i],new Realm((_line:string):void=>{},"script"));
 check(result.type === "normal" && result.value.kind === "boolean" && result.value.value,"if case "+i);
}
for(const source of ['function* f(){if(foo(yield 1)){}}'])
 check(prepareBoundedScript({id:"boundary",text:source},new Realm((_line:string):void=>{},"script")).kind === "blocked","if boundary");
const A=new Realm((_line:string):void=>{},"script"),B=new Realm((_line:string):void=>{},"script"),creator=createScriptSession();
run('var cleaned=false;function* f(){try{if(yield 1){while(true){}}}finally{cleaned=true;}}var g=f();g.next();',A,creator);
define(B,"g",own(A,"g"));const steps=creator.inspect().steps,session=createScriptSession({maxSteps:80,maxCalls:16});
const stopped=run('g.next(true);',B,session);
check(stopped.type === "throw" && stopped.origin.kind === "resource-limit","if current budget");
check(creator.inspect().steps === steps && session.inspect().steps > 0,"if current session");
const closed=run('!cleaned&&g.next().done;',A);
check(closed.type === "normal" && closed.value.kind === "boolean" && closed.value.value,"if fatal discard");
console.log("generator if passed");
