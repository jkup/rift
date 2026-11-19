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
    "function* f(){try{yield 1;}finally{yield 2;}yield 3;}Array.from(f()).join(\",\")===\"1,2,3\";",
    "function* f(){try{yield 1;return 9;}finally{yield 2;}}var g=f();g.next().value===1&&g.next().value===2&&g.next().value===9&&g.next().done;",
    "function* f(){try{yield 1;}finally{yield 2;}}var g=f();g.next();var a=g.return(7),b=g.next();a.value===2&&!a.done&&b.value===7&&b.done;",
    "var marker={};function* f(){try{yield 1;}finally{yield 2;}}var g=f(),caught;g.next();var a=g.throw(marker);try{g.next();}catch(e){caught=e;}a.value===2&&!a.done&&caught===marker&&g.next().done;",
    "function* f(){try{yield 1;return 7;}finally{yield 2;return 9;}}var g=f();g.next();g.next().value===2&&g.next().value===9;",
    "var marker={};function* f(){try{yield 1;}finally{yield 2;throw marker;}}var g=f(),caught;g.next();g.return(7);try{g.next();}catch(e){caught=e;}caught===marker&&g.next().done;",
    "var n=0;function* f(){try{yield 1;}finally{yield 2;n++;}}var g=f();g.next();g.return(7);var r=g.return(8);r.value===8&&r.done&&n===0;",
    "var a={},b={},n=0;function* f(){try{yield 1;}finally{yield 2;n++;}}var g=f(),caught;g.next();g.throw(a);try{g.throw(b);}catch(e){caught=e;}caught===b&&n===0&&g.next().done;",
    "function* f(){try{try{yield 1;}finally{yield 2;}}finally{yield 3;}}var g=f();g.next();g.return(7).value===2&&g.next().value===3&&g.next().value===7;",
    "function* f(){try{try{yield 1;}catch(e){yield e;}}finally{yield 3;}yield 4;}var g=f();g.next();g.throw(2).value===2&&g.next().value===3&&g.next().value===4;",
    "function* f(){try{try{yield 1;}finally{yield 2;throw 3;}}catch(e){yield e;}}Array.from(f()).join(\",\")===\"1,2,3\";",
    "function* f(){while(true){try{yield 1;break;}finally{yield 2;}}yield 3;}Array.from(f()).join(\",\")===\"1,2,3\";",
    "function* f(){for(var i=0;i<2;i++){try{yield i;continue;}finally{yield i+10;}}yield 9;}Array.from(f()).join(\",\")===\"0,10,1,11,9\";",
    "function* f(){var i=0;while(i++<2){try{yield i;break;}finally{yield i+10;continue;}}yield 9;}Array.from(f()).join(\",\")===\"1,11,2,12,9\";",
    "function* f(){var i=0;while(i++<3){try{yield i;continue;}finally{yield 2;break;}}yield 9;}Array.from(f()).join(\",\")===\"1,2,9\";",
    "var trace=\"\";function* f(){try{trace+=\"a\";yield 1;trace+=\"b\";}finally{trace+=\"c\";yield 2;trace+=\"d\";}trace+=\"e\";}var g=f();g.next();g.next();var middle=trace;g.next();middle===\"abc\"&&trace===\"abcde\";",
    "var it={next(){return {value:1,done:false};},return(v){return {value:v+1,done:true};},[Symbol.iterator](){return this;}};function* f(){try{yield* it;}finally{yield 2;}}var g=f();g.next();g.return(7).value===2&&g.next().value===8;",
    "function* f(){try{yield 1;}finally{yield* [2,3];}}var g=f();g.next();g.return(7).value===2&&g.next().value===3&&g.next().value===7;",
    "function* f(){try{return 7;}finally{let x=2;yield ()=>++x;yield x;}}var g=f(),h=g.next().value;h()===3&&g.next().value===3&&g.next().value===7;",
    "var marker={};function* f(){try{throw marker;}finally{try{throw 2;}catch(e){yield e;}}}var g=f(),caught;var a=g.next();try{g.next();}catch(e){caught=e;}a.value===2&&caught===marker;",
    "function* f(){try{yield 1;}finally{yield 2;}}var g=f(),r=g.return(7);r.done&&r.value===7&&g.next().done;"
];
for(let i=0;i<cases.length;i++){const r=run(cases[i],new Realm((_line:string):void=>{},"script"));check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,"finally case "+i);}
const A=new Realm((_line:string):void=>{},"script"),B=new Realm((_line:string):void=>{},"script");
run('var marker={},cleaned=false;function* f(){try{throw marker;}finally{yield 2;}}var g=f();g.next();function* costly(){try{yield 1;while(true){}}finally{cleaned=true;yield 2;}}var slow=costly();slow.next();',A);
define(B,"g",own(A,"g"));define(B,"marker",own(A,"marker"));define(B,"slow",own(A,"slow"));
const session=createScriptSession(),failure=run('g.next();',B,session);
const marker=own(A,"marker");
check(failure.type==="throw"&&failure.value.kind==="object"&&marker.kind==="object"&&failure.value.object===marker.object,"pending throw identity after foreign cleanup");
check(session.inspect().lastAbrupt?.realm===A,"pending throw source Realm survives cleanup suspension");
const stopped=run('slow.next();',B,createScriptSession({maxSteps:60,maxCalls:16}));check(stopped.type==="throw"&&stopped.origin.kind==="resource-limit","resource bypasses finally");
const untouched=run('!cleaned&&slow.next().done;',A);check(untouched.type==="normal"&&untouched.value.kind==="boolean"&&untouched.value.value,"no cleanup after resource stop");
const sentinel=new Error("finally host fault");define(A,"hostFault",{kind:"object",object:A.createBuiltin("hostFault",0,(_receiver:Value,_args:Value[],_context:OperationContext,_loc:Location):ValueCompletion=>{throw sentinel;})});
run('function* faulty(){try{yield 1;hostFault();}finally{cleaned=true;yield 2;}}var broken=faulty();broken.next();',A);define(B,"broken",own(A,"broken"));let caught=false;const faultSession=createScriptSession();try{run('broken.next();',B,faultSession);}catch(error){if(error instanceof Error)caught=error===sentinel;}
const idle=faultSession.inspect();check(caught&&idle.active===null&&idle.calls===0&&idle.depth===0,"host fault caller restoration");
const faultClosed=run('!cleaned&&broken.next().done;',A);check(faultClosed.type==="normal"&&faultClosed.value.kind==="boolean"&&faultClosed.value.value,"host fault bypasses cleanup");
console.log("generator finally passed");
