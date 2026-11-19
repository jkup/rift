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
    "function* f(){return yield yield 1;}var g=f();g.next().value===1&&g.next(2).value===2&&g.next(3).value===3;",
    "function* f(){yield yield 1;return 7;}var g=f();g.next().value===1&&g.next(2).value===2&&g.next(3).value===7;",
    "function* f(){return 10+(yield yield 1);}var g=f();g.next();g.next(2);g.next(3).value===13;",
    "function* f(){return yield (yield 1)+(yield 2);}var g=f();g.next();g.next(3).value===2&&g.next(4).value===7&&g.next(8).value===8;",
    "function* f(){return yield -(yield 1);}var g=f();g.next();g.next(3).value===-3&&g.next(8).value===8;",
    "function* f(){return yield (yield 1)?2:3;}var g=f();g.next();g.next(false).value===3&&g.next(8).value===8;",
    "function* f(){return yield yield yield 1;}var g=f();g.next();g.next(2).value===2&&g.next(3).value===3&&g.next(4).value===4;",
    "function* f(){let x=yield yield 1;return x;}var g=f();g.next();g.next(2);g.next(7).value===7;",
    "var x=1;function* f(){x+=yield yield 1;return x;}var g=f();g.next();g.next(2);g.next(7).value===8;",
    "function* f(){try{throw yield yield 1;}catch(e){return e;}}var g=f();g.next();g.next(2);g.next(7).value===7;",
    "function* f(){let [x]=yield yield 1;return x;}var g=f();g.next();g.next(2);g.next([7]).value===7;",
    "function* inner(){yield 2;return 7;}function* f(){return yield* (yield 1);}var g=f();g.next().value===1&&g.next(inner()).value===2&&g.next().value===7;",
    "function* inner(){yield 1;return 7;}function* f(){return yield (yield* inner());}var g=f();g.next().value===1&&g.next().value===7&&g.next(8).value===8;",
    "function* a(){yield 1;return [2,3];}function* f(){return yield* (yield* a());}var g=f();g.next().value===1&&g.next().value===2&&g.next().value===3&&g.next().done;",
    "var trace=\"\";var o={[Symbol.iterator](){trace+=\"I\";return {next(){trace+=\"N\";return {value:7,done:true};}};}};function* f(){return yield* (yield 1);}var g=f();g.next();var before=trace;before===\"\"&&g.next(o).value===7&&trace===\"IN\";",
    "var n=0;var o={[Symbol.iterator](){n++;throw 7;}};function* f(){try{return yield* (yield 1);}finally{yield 2;}}var g=f();g.next();g.return(o).value===2&&g.next().value===o&&n===0;",
    "var marker={};function* f(){try{yield yield 1;}catch(e){return e;}}var g=f();g.next();g.throw(marker).value===marker;",
    "function* f(){try{return yield* (yield 1);}catch(e){return e instanceof TypeError;}}var g=f();g.next();g.next(null).value===true;",
    "function* f(){try{return yield yield 1;}finally{yield 9;}}var g=f();g.next();g.next(2);g.return(7).value===9&&g.next().value===7;",
    "function* f(){return (yield yield 1)+(yield yield 2);}var g=f();g.next();g.next(3).value===3&&g.next(4).value===2&&g.next(5).value===5&&g.next(6).value===10;"
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "yield operand case " + i);
}
for (const source of [ 'function* f(){yield 1+yield 2;}'])
    check(prepareBoundedScript({id: "boundary", text: source}, new Realm((_line: string): void => {}, "script")).kind === "blocked", "yield operand boundary");
const A = new Realm((_line: string): void => {}, "script"), B = new Realm((_line: string): void => {}, "script");
const creator = createScriptSession();
run('function* f(){return yield* (yield 1);}var g=f();g.next();var cleaned=false;function* costly(){try{yield* (yield 1);}finally{cleaned=true;}}var slow=costly();slow.next();', A, creator);
define(B, "g", own(A, "g"));define(B, "slow", own(A, "slow"));
const steps=creator.inspect().steps, session=createScriptSession();
const failed=run('g.next(null);', B, session);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"), "yield operand error Realm");
check(creator.inspect().steps === steps && session.inspect().steps > 0, "yield operand current session");
const stopped=run('slow.next({[Symbol.iterator](){while(true){}}});', B, createScriptSession({maxSteps: 80,maxCalls: 16}));
check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "yield operand resource stop");
const closed=run('!cleaned&&slow.next().done;', A);
check(closed.type === "normal" && closed.value.kind === "boolean" && closed.value.value, "yield operand fatal discard");
{
 const source="function* f(){yield foo(yield 1);}",realm=new Realm((_line:string):void=>{},"script");
 check(prepareBoundedScript({id:"historical-call",text:source},realm).kind==="ready","historical call admitted");
 const result=run('function foo(x){return x}'+source+'var g=f();g.next();'+"g.next(7).value===7&&g.next().done",realm);
 check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,"historical call resumes");
}
console.log("generator yield operand passed");
