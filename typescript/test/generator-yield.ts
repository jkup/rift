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
"function* f(){return yield 1;}var g=f();g.next();g.next().done;",
"function* f(){let x=yield 1;}var g=f();g.next();g.next().done;",
"function* f(){try{yield 1;}finally{}}var g=f();g.next();g.return();g.next().done;",
"function* f(){yield* [];}f().next().done;",
"function* f(){while(true){yield 1;}}var g=f();g.next().value===1&&g.return().done;",
"function* f(){{yield 1;}}f().next().value===1;",
"function* f(){if(true)yield 1;}f().next().value===1;",
    "var n=0;function* f(){n++;yield n;n++;yield n;return ++n;}var g=f(),a=g.next(99),b=g.next(88),c=g.next(77),d=g.next();a.value===1&&!a.done&&b.value===2&&!b.done&&c.value===3&&c.done&&d.done&&n===3;",
    "function* f(){yield;yield\n7;return 8;}var g=f(),a=g.next(),b=g.next(),c=g.next();a.value===undefined&&!a.done&&b.value===undefined&&!b.done&&c.value===8&&c.done;",
    "function* f(){let x=1;yield function(){return ++x;};yield x;x+=2;return x;}var g=f(),h=g.next().value;h()===2&&g.next().value===2&&g.next().value===4;",
    "var n=0;function* f(a=++n){yield a;yield ++n;}var g=f();n===1&&g.next().value===1&&n===1&&g.next().value===2&&n===2;",
    "var trace=\"\";function* f(){try{trace+=\"a\";}finally{trace+=\"b\";}yield trace;for(var i=0;i<2;i++)trace+=\"c\";yield trace;}var g=f();g.next().value===\"ab\"&&g.next().value===\"abcc\"&&g.next().done;",
    "var n=0;function* f(){yield ++n;n+=100;yield n;}var g=f();var a=g.next(),b=g.return(7);a.value===1&&!a.done&&b.value===7&&b.done&&g.next().done&&n===1;",
    "var n=0,marker={};function* f(){yield ++n;n+=100;}var g=f(),caught;g.next();try{g.throw(marker);}catch(e){caught=e;}caught===marker&&n===1&&g.next().done;",
    "var marker={};function fail(){throw marker;}function* f(){yield fail();yield 2;}var g=f(),caught;try{g.next();}catch(e){caught=e;}caught===marker&&g.next().done;",
    "var g,n=0;function operand(){try{g.next();}catch(e){if(e instanceof TypeError)n++;}try{g.return();}catch(e){if(e instanceof TypeError)n++;}try{g.throw();}catch(e){if(e instanceof TypeError)n++;}return n;}function* f(){yield operand();yield 4;}g=f();g.next().value===3&&g.next().value===4;",
    "function* f(){yield 1;yield 2;return 3;}var a=Array.from(f());a.length===2&&a[0]===1&&a[1]===2;",
    "function* f(){yield 1;yield 2;}var n=0;for(var x of f())n+=x;n===3;",
    "function* f(){yield 1;yield 2;}var a=[...f()];a.length===2&&a[1]===2;",
    "function* f(){yield 1;function* inner(){yield 2;}yield inner().next().value;}var g=f();g.next().value===1&&g.next().value===2;",
    "function* f(){yield 1;var inner=function(){return 2;};yield inner();}var g=f();g.next().value===1&&g.next().value===2;",
    "function* f(){yield (1,2);yield ()=>3;}var g=f();g.next().value===2&&g.next().value()===3;",
    "function* f(){}var GF=Object.getPrototypeOf(f).constructor,g=GF(\"a\",\"yield a;yield a+1;\")(4);g.next().value===4&&g.next().value===5&&g.next().done;"
];
for (let i=0;i<cases.length;i++) {
 const result=run(cases[i],new Realm((_line:string):void=>{},"script"));
 check(result.type==="normal"&&result.value.kind==="boolean"&&result.value.value,"yield case "+i);
}
for (const source of ["function f(){yield 1;}","function* f(){var g=()=>{yield 1;};}","function* f(){function g(){yield 1;}}","function* f(){yield yield 1;}"]) {
 check(prepareBoundedScript({id:"boundary",text:source},new Realm((_line:string):void=>{},"script")).kind==="blocked","yield boundary "+source);
}
const A=new Realm((_line:string):void=>{},"script"),B=new Realm((_line:string):void=>{},"script");
const first=createScriptSession(),second=createScriptSession();
run('var n=0;function* f(){let x=2;yield ++n;yield ++x;return x+n;}var g=f();',A,first);
run('function* empty(){}var next=Object.getPrototypeOf(empty).prototype.next;',B);
define(B,"g",own(A,"g")); define(B,"prototypeA",{kind:"object",object:A.objectPrototype});
const before=first.inspect().steps;
const yielded=run('var a=next.call(g);a.value===1&&!a.done&&Object.getPrototypeOf(a)===prototypeA;',B,second);
check(yielded.type==="normal"&&yielded.value.kind==="boolean"&&yielded.value.value,"yield result Realm");
check(first.inspect().steps===before&&second.inspect().steps>0,"current session budget");
const noCalls=run('next.call(g);',B,createScriptSession({maxSteps:100,maxCalls:0}));
check(noCalls.type==="throw"&&noCalls.origin.kind==="resource-limit","pre-entry resource stop");
const resumed=run('next.call(g).value===3;',B);
check(resumed.type==="normal"&&resumed.value.kind==="boolean"&&resumed.value.value,"saved lexical frame after entry stop");
const ended=run('var end=next.call(g);end.done&&end.value===4&&Object.getPrototypeOf(end)===Object.prototype;',B);
check(ended.type==="normal"&&ended.value.kind==="boolean"&&ended.value.value,"terminal result Realm");
run('function* costly(){yield 1;while(true){n++;}}var slow=costly();slow.next();function* abrupt(){yield 2;n+=100;}var bad=abrupt();bad.next();',A);
define(B,"slow",own(A,"slow"));define(B,"bad",own(A,"bad"));
const limited=createScriptSession({maxSteps:60,maxCalls:16});
const stopped=run('next.call(slow);',B,limited);
check(stopped.type==="throw"&&stopped.origin.kind==="resource-limit","post-yield resource limit");
const closed=run('next.call(slow).done;',B);
check(closed.type==="normal"&&closed.value.kind==="boolean"&&closed.value.value,"resource stop closes continuation");
const throwing=createScriptSession();
const abrupt=run('bad.throw(42);',B,throwing);
check(abrupt.type==="throw"&&abrupt.origin.kind==="guest"&&abrupt.value.kind==="number"&&abrupt.value.value===42,"abrupt resume identity");
check(throwing.inspect().lastAbrupt?.realm===A,"abrupt resume captured source Realm");
const sentinel=new Error("yield operand fault");
define(A,"hostFault",{kind:"object",object:A.createBuiltin("hostFault",0,(_receiver:Value,_args:Value[],_context:OperationContext,_loc:Location):ValueCompletion=>{throw sentinel;})});
run('function* faulty(){yield 1;yield hostFault();yield 3;}var broken=faulty();broken.next();',A);
define(B,"broken",own(A,"broken"));
const faultSession=createScriptSession();let caught=false;
try{run('next.call(broken);',B,faultSession);}catch(error){if(error instanceof Error)caught=error===sentinel;}
const idle=faultSession.inspect();
check(caught&&idle.active===null&&idle.calls===0&&idle.depth===0,"yield host fault cleanup");
const faultClosed=run('next.call(broken).done;',B);
check(faultClosed.type==="normal"&&faultClosed.value.kind==="boolean"&&faultClosed.value.value,"yield host fault closes continuation");
console.log("generator yield passed");
