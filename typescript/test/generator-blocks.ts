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
"function* f(){label:{yield 1;}}var g=f();g.next().value===1&&g.return().done;",
"function* f(){try{{yield 1;}}finally{}}var g=f();g.next();g.return();g.next().done;",
"function* f(){while(true){if(true)yield 1;}}var g=f();g.next().value===1&&g.return().done;",
    "function* f(){let x=1;{let x=2;yield ()=>++x;yield x;}yield x;}var g=f(),h=g.next().value;h()===3&&g.next().value===3&&g.next().value===1&&g.next().done;",
    "var n=0;function* f(){if(++n===1){yield 2;yield 3;}else{yield 4;}yield n;}var g=f();g.next().value===2&&g.next().value===3&&g.next().value===1&&n===1;",
    "function* f(){if(false)yield 1;else if(true)yield 2;else yield 3;yield 4;}var g=f();g.next().value===2&&g.next().value===4;",
    "function* f(){{yield typeof inner;function inner(){return 3;}yield inner();}}var g=f();g.next().value===\"function\"&&g.next().value===3;",
    "function* f(){{yield ()=>x;let x=3;yield x;}}var g=f(),h=g.next().value,caught=false;try{h();}catch(e){caught=e instanceof ReferenceError;}caught&&g.next().value===3&&h()===3;",
    "var n=0;function* f(){{let x=2;yield ()=>x;n++;}n++;}var g=f(),h=g.next().value,r=g.return(7);h()===2&&r.value===7&&r.done&&n===0;",
    "var marker={},n=0;function* f(){if(true){{yield 1;n++;}}n++;}var g=f(),caught;g.next();try{g.throw(marker);}catch(e){caught=e;}caught===marker&&n===0&&g.next().done;",
    "function* f(){yield 0;{yield 1;{yield 2;}yield 3;}yield 4;}var a=Array.from(f());a.join(\",\")===\"0,1,2,3,4\";",
    "function* f(){if(true){yield 1;return 2;}yield 3;}var g=f();g.next().value===1&&g.next().value===2&&g.next().done;",
    "var trace=\"\";function* f(){{trace+=\"a\";yield 1;trace+=\"b\";{trace+=\"c\";yield 2;}trace+=\"d\";}trace+=\"e\";}var g=f();g.next();var a=trace;g.next();var b=trace;g.next();a===\"a\"&&b===\"abc\"&&trace===\"abcde\";",
    "function* f(){{let x=2;yield eval(\"x\");yield eval(\"x+=2\");}return typeof x;}var g=f();g.next().value===2&&g.next().value===4&&g.next().value===\"undefined\";"
];
for(let i=0;i<cases.length;i++){const r=run(cases[i],new Realm((_line:string):void=>{},"script"));check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,"block case "+i);}
for(const source of ["function* f(){switch(1){case 1:yield 1;}}"]){check(prepareBoundedScript({id:"boundary",text:source},new Realm((_line:string):void=>{},"script")).kind==="blocked","boundary "+source);}
const A=new Realm((_line:string):void=>{},"script"),B=new Realm((_line:string):void=>{},"script");
run('function* f(){{let x=2;yield ()=>++x;yield x;}yield 9;}var g=f();',A);
define(B,"g",own(A,"g"));
const first=run('var h=g.next().value;h()===3;',B);
check(first.type==="normal"&&first.value.kind==="boolean"&&first.value.value,"foreign block closure");
const second=run('g.next().value===3&&g.next().value===9&&g.next().done;',B);
check(second.type==="normal"&&second.value.kind==="boolean"&&second.value.value,"foreign block restoration");
console.log("generator blocks passed");
