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
"function* f(){return yield* [];}var g=f();g.next();g.next().done;",
"function* f(){try{yield* [];}finally{}}var g=f();g.next();g.return();g.next().done;",
    "function* f(){yield* [1,2];yield 3;}Array.from(f()).join(\",\")===\"1,2,3\";",
    "function* f(){yield* \"ab\";}Array.from(f()).join(\",\")===\"a,b\";",
    "function* a(){yield 1;return 9;}function* b(){yield* a();yield 2;}Array.from(b()).join(\",\")===\"1,2\";",
    "function* f(){for(let i=0;i<2;i++){let x=i;yield* [x,x+1];}}Array.from(f()).join(\",\")===\"0,1,1,2\";",
    "function* f(){yield*\n[1];}f().next().value===1;",
    "var n=0,values=[],it={next(v){values.push(v);n++;return {value:n,done:n>2};},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f();g.next(99);g.next(7);g.next(8);values.length===3&&values[0]===undefined&&values[1]===7&&values[2]===8;",
    "var n=0,result={get value(){n++;return 5;},done:false},it={next(){return result;},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f(),r=g.next();r===result&&n===0&&r.value===5&&n===1;",
    "var n=0,it={next(){return {done:true,get value(){n++;return 7;}};},[Symbol.iterator](){return this;}};function* f(){yield* it;yield n;}f().next().value===1;",
    "var count=0,it={get next(){count++;return function(){return {value:count,done:false};};},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f();g.next();Object.defineProperty(it,\"next\",{value:1});g.next().value===1&&count===1;",
    "var marker={},received,it={next(){return {value:1,done:false};},throw(v){received=v;return {value:2,done:true};},[Symbol.iterator](){return this;}};function* f(){yield* it;yield 3;}var g=f();g.next();g.throw(marker).value===3&&received===marker;",
    "var result={value:4,done:false},it={next(){return {value:1,done:false};},throw(v){return result;},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f();g.next();g.throw(2)===result&&g.next().value===1;",
    "var received,n=0,it={next(){return {value:1,done:false};},return(v){received=v;return {value:7,done:true};},[Symbol.iterator](){return this;}};function* f(){yield* it;n++;}var g=f();g.next();var r=g.return(5);r.value===7&&r.done&&received===5&&n===0;",
    "var n=0,it={next(){return {value:++n,done:n>1};},return(v){return {value:v,done:false};},[Symbol.iterator](){return this;}};function* f(){yield* it;yield 9;}var g=f();g.next();var r=g.return(5);r.value===5&&!r.done&&g.next().value===9;",
    "var n=0,it={next(){return {value:1,done:false};},[Symbol.iterator](){return this;}};function* f(){yield* it;n++;}var g=f();g.next();var r=g.return(8);r.done&&r.value===8&&n===0;",
    "var closed=0,args=-1,it={next(){return {done:false};},return(){closed++;args=arguments.length;return {get done(){throw 99;}};},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f(),caught=false;g.next();try{g.throw(7);}catch(e){caught=e instanceof TypeError;}caught&&closed===1&&args===0&&g.next().done;",
    "var marker={},it={next(){return {done:false};},return(){throw marker;},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f(),caught;g.next();try{g.throw(7);}catch(e){caught=e;}caught===marker&&g.next().done;",
    "var closed=0,it={next(){return {done:false};},throw:1,return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f(),caught=false;g.next();try{g.throw(7);}catch(e){caught=e instanceof TypeError;}caught&&closed===0;",
    "var closed=0,marker={},it={next(){throw marker;},return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f(),caught;try{g.next();}catch(e){caught=e;}caught===marker&&closed===0&&g.next().done;",
    "var closed=0,marker={},it={next(){return {get done(){throw marker;}};},return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f(),caught;try{g.next();}catch(e){caught=e;}caught===marker&&closed===0&&g.next().done;",
    "var it={next(){return 1;},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f(),caught=false;try{g.next();}catch(e){caught=e instanceof TypeError;}caught&&g.next().done;",
    "var marker={},it={next(){return {done:true,get value(){throw marker;}};},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f(),caught;try{g.next();}catch(e){caught=e;}caught===marker&&g.next().done;",
    "var it={next(){return {done:false};},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f();g.next();it.return=function(v){return {value:v+1,done:true};};g.return(3).value===4;",
    "var it={next(){return {done:false};},return:null,[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f();g.next();g.return(4).value===4;",
    "var caught=false;function* f(){yield* null;}var g=f();try{g.next();}catch(e){caught=e instanceof TypeError;}caught&&g.next().done;"
];
for(let i=0;i<cases.length;i++){const r=run(cases[i],new Realm((_line:string):void=>{},"script"));check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,"delegation case "+i);}
for(const source of ["function* f(){yield*;}","function* f(){yield\n*[];}"]){check(prepareBoundedScript({id:"boundary",text:source},new Realm((_line:string):void=>{},"script")).kind==="blocked","boundary "+source);}
const A=new Realm((_line:string):void=>{},"script"),B=new Realm((_line:string):void=>{},"script");
run('var result={value:2,done:false},it={next(){return result;},[Symbol.iterator](){return this;}};function* f(){yield* it;}var g=f();',A);define(B,"g",own(A,"g"));define(B,"result",own(A,"result"));
const cross=run('g.next()===result;',B);check(cross.type==="normal"&&cross.value.kind==="boolean"&&cross.value.value,"foreign delegated result identity");
const failed=run('g.throw(7);',B);check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===A.getErrorPrototype("TypeError"),"delegation error captured Realm");
console.log("generator delegation passed");
